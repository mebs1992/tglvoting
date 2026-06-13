"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireMember } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutcome, MAJORITY_THRESHOLD } from "@/lib/voting";

const TOTAL_MEMBERS = 12;

export async function submitVote(
  proposalId: string,
  voteValues: string | string[]
): Promise<{ success: boolean; error?: string }> {
  const member = await requireMember();
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, status, allow_multiple_selections")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { success: false, error: "Proposal not found" };
  if (proposal.status !== "open") return { success: false, error: "Proposal is not open" };

  const { data: existing } = await sb
    .from("votes")
    .select("id")
    .eq("proposal_id", proposalId)
    .eq("member_id", member.id)
    .limit(1);

  if (existing && existing.length > 0) return { success: false, error: "You have already voted" };

  const values = Array.isArray(voteValues) ? voteValues : [voteValues];

  if (!proposal.allow_multiple_selections && values.length > 1) {
    return { success: false, error: "Multiple selections not allowed for this proposal" };
  }

  const rows = values.map((v) => ({
    proposal_id: proposalId,
    member_id: member.id,
    vote_value: v,
  }));

  const { error } = await sb.from("votes").insert(rows);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You have already voted" };
    }
    return { success: false, error: "Failed to submit vote" };
  }

  await logAudit(member.id, "vote_submitted", "proposal", proposalId, {
    vote_values: values,
  });

  // Auto-close when all members have voted
  const { data: allVotes } = await sb
    .from("votes")
    .select("member_id")
    .eq("proposal_id", proposalId);

  const uniqueVoters = new Set((allVotes ?? []).map((v) => v.member_id));
  if (uniqueVoters.size >= TOTAL_MEMBERS) {
    const { data: choices } = await sb
      .from("proposal_choices")
      .select("id")
      .eq("proposal_id", proposalId)
      .limit(1);

    const isDefaultYesNo = !choices || choices.length === 0;

    if (isDefaultYesNo) {
      const voteValues = (allVotes ?? []).map((v) => v as unknown as { vote_value: string });
      // Re-fetch with vote_value
      const { data: votesWithValue } = await sb
        .from("votes")
        .select("vote_value")
        .eq("proposal_id", proposalId);
      const yesCount = (votesWithValue ?? []).filter((v) => v.vote_value === "yes").length;
      const noCount = (votesWithValue ?? []).filter((v) => v.vote_value === "no").length;
      const outcome = calculateOutcome(yesCount, noCount);

      await sb
        .from("proposals")
        .update({
          outcome,
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
    } else {
      await sb
        .from("proposals")
        .update({
          outcome: "pending",
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
    }
  }

  return { success: true };
}

export async function getRecentVerdicts() {
  await requireMember();
  const sb = getServiceClient();

  const { data: proposals } = await sb
    .from("proposals")
    .select("id, title, status, outcome, allow_multiple_selections, closed_at")
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(5);

  if (!proposals || proposals.length === 0) return [];

  const proposalIds = proposals.map((p) => p.id);
  const [{ data: allChoices }, { data: allVotes }] = await Promise.all([
    sb
      .from("proposal_choices")
      .select("id, proposal_id, label, display_order")
      .in("proposal_id", proposalIds)
      .order("display_order", { ascending: true }),
    sb
      .from("votes")
      .select("proposal_id, vote_value")
      .in("proposal_id", proposalIds),
  ]);

  const choicesByProposal = new Map<string, { id: string; label: string }[]>();
  for (const c of allChoices ?? []) {
    const arr = choicesByProposal.get(c.proposal_id) ?? [];
    arr.push({ id: c.id, label: c.label });
    choicesByProposal.set(c.proposal_id, arr);
  }

  return proposals.map((p) => {
    const choices = choicesByProposal.get(p.id) ?? [];
    const votes = (allVotes ?? []).filter((v) => v.proposal_id === p.id);
    const isDefaultYesNo = choices.length === 0;

    if (!isDefaultYesNo) {
      const counted = choices
        .map((c) => ({
          label: c.label,
          count: votes.filter((v) => v.vote_value === c.id).length,
        }))
        .sort((a, b) => b.count - a.count);
      const topCount = counted[0]?.count ?? 0;
      const hasMajority = topCount >= MAJORITY_THRESHOLD;
      const requiresTieBreak = choices.length > 2 && !hasMajority;
      return {
        id: p.id,
        title: p.title,
        outcome: p.outcome as string,
        isMultipleChoice: true,
        requiresTieBreak,
        winnerLabel: counted[0]?.label ?? null,
        hasMajority,
      };
    }

    return {
      id: p.id,
      title: p.title,
      outcome: p.outcome as string,
      isMultipleChoice: false,
      requiresTieBreak: false,
      winnerLabel: null,
      hasMajority: false,
    };
  });
}

export async function getOpenProposals() {
  const member = await requireMember();
  const sb = getServiceClient();

  const { data: proposals } = await sb
    .from("proposals")
    .select("id, title, description, status, outcome, allow_multiple_selections, opened_at")
    .eq("status", "open")
    .order("opened_at", { ascending: false });

  if (!proposals) return [];

  const proposalIds = proposals.map((p) => p.id);
  const [{ data: choices }, { data: allVotes }] = await Promise.all([
    sb
      .from("proposal_choices")
      .select("id, proposal_id, label, display_order")
      .in("proposal_id", proposalIds)
      .order("display_order", { ascending: true }),
    sb
      .from("votes")
      .select("proposal_id, member_id, vote_value, members(display_name)")
      .in("proposal_id", proposalIds),
  ]);

  const choicesByProposal = new Map<string, { id: string; label: string }[]>();
  for (const c of choices ?? []) {
    const arr = choicesByProposal.get(c.proposal_id) ?? [];
    arr.push({ id: c.id, label: c.label });
    choicesByProposal.set(c.proposal_id, arr);
  }

  const { data: myVotes } = await sb
    .from("votes")
    .select("proposal_id")
    .eq("member_id", member.id);

  const votedIds = new Set((myVotes ?? []).map((v) => v.proposal_id));

  return proposals.map((p) => {
    const pChoices = choicesByProposal.get(p.id) ?? [];
    const pVotes = (allVotes ?? []).filter((v) => v.proposal_id === p.id);

    // Build live vote breakdown
    const liveVotes: { memberName: string; voteValue: string; voteLabel: string }[] = [];
    for (const v of pVotes) {
      const m = v.members as unknown as { display_name: string } | null;
      const memberName = m?.display_name ?? "Unknown";
      let voteLabel = v.vote_value;
      if (pChoices.length > 0) {
        const choice = pChoices.find((c) => c.id === v.vote_value);
        if (choice) voteLabel = choice.label;
      } else {
        voteLabel = v.vote_value === "yes" ? "Yes" : v.vote_value === "no" ? "No" : v.vote_value;
      }
      liveVotes.push({ memberName, voteValue: v.vote_value, voteLabel });
    }

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      hasVoted: votedIds.has(p.id),
      allowMultipleSelections: p.allow_multiple_selections,
      choices: pChoices,
      liveVotes,
      totalMembers: TOTAL_MEMBERS,
    };
  });
}

export async function getResults() {
  const sb = getServiceClient();

  const { data: proposals } = await sb
    .from("proposals")
    .select("id, title, description, status, outcome, allow_multiple_selections, opened_at, closed_at")
    .in("status", ["open", "closed"])
    .order("closed_at", { ascending: false, nullsFirst: false });

  if (!proposals) return { finalised: [], pending: [] };

  const proposalIds = proposals.map((p) => p.id);
  const { data: allChoices } = await sb
    .from("proposal_choices")
    .select("id, proposal_id, label, display_order")
    .in("proposal_id", proposalIds)
    .order("display_order", { ascending: true });

  const choicesByProposal = new Map<string, { id: string; label: string }[]>();
  for (const c of allChoices ?? []) {
    const arr = choicesByProposal.get(c.proposal_id) ?? [];
    arr.push({ id: c.id, label: c.label });
    choicesByProposal.set(c.proposal_id, arr);
  }

  const finalised = [];
  const pending = [];

  for (const p of proposals) {
    const choices = choicesByProposal.get(p.id) ?? [];
    const isDefaultYesNo = choices.length === 0;

    if (p.status === "closed") {
      const { data: votes } = await sb
        .from("votes")
        .select("vote_value")
        .eq("proposal_id", p.id);

      if (!isDefaultYesNo) {
        const choiceVoteCounts = choices.map((c) => ({
          id: c.id,
          label: c.label,
          count: (votes ?? []).filter((v) => v.vote_value === c.id).length,
        }));
        choiceVoteCounts.sort((a, b) => b.count - a.count);
        const topCount = choiceVoteCounts[0]?.count ?? 0;
        const hasMajority = topCount >= MAJORITY_THRESHOLD;
        const requiresTieBreak = choices.length > 2 && !hasMajority;

        finalised.push({
          id: p.id,
          title: p.title,
          outcome: p.outcome,
          isMultipleChoice: true,
          requiresTieBreak,
          hasMajority,
          winnerLabel: choiceVoteCounts[0]?.label ?? null,
          choiceResults: choiceVoteCounts,
          totalVoters: new Set((votes ?? []).map((v) => v.vote_value)).size,
        });
      } else {
        const yesCount = (votes ?? []).filter((v) => v.vote_value === "yes").length;
        const noCount = (votes ?? []).filter((v) => v.vote_value === "no").length;

        finalised.push({
          id: p.id,
          title: p.title,
          outcome: p.outcome,
          isMultipleChoice: false,
          yesVotes: yesCount,
          noVotes: noCount,
          notVoted: TOTAL_MEMBERS - yesCount - noCount,
        });
      }
    } else {
      pending.push({
        id: p.id,
        title: p.title,
        status: p.status,
      });
    }
  }

  return { finalised, pending };
}

export async function getVoteBreakdown(proposalId: string) {
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, title, description, status, outcome, allow_multiple_selections")
    .eq("id", proposalId)
    .single();

  if (!proposal) return null;

  const { data: choices } = await sb
    .from("proposal_choices")
    .select("id, label, display_order")
    .eq("proposal_id", proposalId)
    .order("display_order", { ascending: true });

  const isDefaultYesNo = (choices ?? []).length === 0;

  if (proposal.status !== "closed") {
    return { proposal, restricted: true, isMultipleChoice: !isDefaultYesNo };
  }

  const { data: votes } = await sb
    .from("votes")
    .select("member_id, vote_value, members(display_name)")
    .eq("proposal_id", proposalId);

  const { data: allMembers } = await sb
    .from("members")
    .select("id, display_name")
    .order("created_at", { ascending: true });

  const votedIds = new Set((votes ?? []).map((v) => v.member_id));
  const notVoted = (allMembers ?? [])
    .filter((m) => !votedIds.has(m.id))
    .map((m) => m.display_name);

  const getName = (v: { members: unknown }) => {
    const m = v.members as { display_name: string } | null;
    return m?.display_name ?? "Unknown";
  };

  if (!isDefaultYesNo) {
    const choiceBreakdown = (choices ?? []).map((c) => {
      const choiceVotes = (votes ?? []).filter((v) => v.vote_value === c.id);
      return {
        id: c.id,
        label: c.label,
        count: choiceVotes.length,
        voters: choiceVotes.map(getName),
      };
    });
    choiceBreakdown.sort((a, b) => b.count - a.count);
    const topCount = choiceBreakdown[0]?.count ?? 0;
    const hasMajority = topCount >= MAJORITY_THRESHOLD;
    const requiresTieBreak =
      (choices ?? []).length > 2 && !hasMajority;

    return {
      proposal,
      restricted: false,
      isMultipleChoice: true,
      requiresTieBreak,
      hasMajority,
      winnerLabel: choiceBreakdown[0]?.label ?? null,
      choiceBreakdown,
      notVoted,
      notVotedCount: notVoted.length,
    };
  }

  const yesVoters = (votes ?? []).filter((v) => v.vote_value === "yes").map(getName);
  const noVoters = (votes ?? []).filter((v) => v.vote_value === "no").map(getName);

  return {
    proposal,
    restricted: false,
    isMultipleChoice: false,
    yesVoters,
    noVoters,
    notVoted,
    yesCount: yesVoters.length,
    noCount: noVoters.length,
    notVotedCount: notVoted.length,
  };
}
