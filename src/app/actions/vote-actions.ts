"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireMember } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutcome, MAJORITY_THRESHOLD } from "@/lib/voting";

interface ChoiceRow {
  id: string;
  label: string;
}

function buildYesNoMap(
  choices: ChoiceRow[]
): Map<string, "yes" | "no"> | null {
  if (choices.length !== 2) return null;
  const sorted = [...choices].sort((a, b) =>
    a.label.trim().toLowerCase().localeCompare(b.label.trim().toLowerCase())
  );
  if (
    sorted[0].label.trim().toLowerCase() === "no" &&
    sorted[1].label.trim().toLowerCase() === "yes"
  ) {
    const map = new Map<string, "yes" | "no">();
    map.set(sorted[1].id, "yes");
    map.set(sorted[0].id, "no");
    return map;
  }
  return null;
}

function countYesNo(
  votes: { vote_value: string }[],
  ynMap: Map<string, "yes" | "no"> | null
): { yesCount: number; noCount: number } {
  let yesCount = 0;
  let noCount = 0;
  for (const v of votes) {
    const mapped = ynMap ? ynMap.get(v.vote_value) : v.vote_value;
    if (mapped === "yes") yesCount++;
    else if (mapped === "no") noCount++;
  }
  return { yesCount, noCount };
}

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

  const { data: choices } = await sb
    .from("proposal_choices")
    .select("id, label")
    .eq("proposal_id", proposalId);

  const ynMap = buildYesNoMap(choices ?? []);
  const isYesNo = (choices ?? []).length === 0 || ynMap !== null;

  if (isYesNo) {
    const { data: votes } = await sb
      .from("votes")
      .select("vote_value")
      .eq("proposal_id", proposalId);

    if (votes) {
      const { yesCount, noCount } = countYesNo(votes, ynMap);
      const outcome = calculateOutcome(yesCount, noCount);

      if (outcome !== "pending") {
        await sb
          .from("proposals")
          .update({
            outcome,
            status: "closed",
            closed_at: new Date().toISOString(),
          })
          .eq("id", proposalId);
      }
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
    const ynMap = buildYesNoMap(choices);
    const isYesNo = choices.length === 0 || ynMap !== null;

    if (!isYesNo) {
      const counted = choices
        .map((c) => ({
          label: c.label,
          count: votes.filter((v) => v.vote_value === c.id).length,
        }))
        .sort((a, b) => b.count - a.count);
      const topCount = counted[0]?.count ?? 0;
      const requiresTieBreak = choices.length > 2 && topCount < MAJORITY_THRESHOLD;
      return {
        id: p.id,
        title: p.title,
        outcome: p.outcome as string,
        isMultipleChoice: true,
        requiresTieBreak,
        winnerLabel: requiresTieBreak ? null : (counted[0]?.label ?? null),
      };
    }

    const { yesCount, noCount } = countYesNo(votes, ynMap);
    const outcome = calculateOutcome(yesCount, noCount);
    return {
      id: p.id,
      title: p.title,
      outcome: outcome === "pending" ? (p.outcome as string) : outcome,
      isMultipleChoice: false,
      requiresTieBreak: false,
      winnerLabel: null,
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
  const { data: choices } = await sb
    .from("proposal_choices")
    .select("id, proposal_id, label, display_order")
    .in("proposal_id", proposalIds)
    .order("display_order", { ascending: true });

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

  return proposals.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    hasVoted: votedIds.has(p.id),
    allowMultipleSelections: p.allow_multiple_selections,
    choices: choicesByProposal.get(p.id) ?? [],
  }));
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
    const ynMap = buildYesNoMap(choices);
    const isYesNo = choices.length === 0 || ynMap !== null;
    const isRealMultipleChoice = choices.length > 0 && ynMap === null;

    if (p.outcome === "passed" || p.outcome === "failed" || (isRealMultipleChoice && p.status === "closed") || (isYesNo && p.status === "closed")) {
      const { data: votes } = await sb
        .from("votes")
        .select("vote_value")
        .eq("proposal_id", p.id);

      if (isRealMultipleChoice) {
        const choiceVoteCounts = choices.map((c) => ({
          id: c.id,
          label: c.label,
          count: (votes ?? []).filter((v) => v.vote_value === c.id).length,
        }));
        choiceVoteCounts.sort((a, b) => b.count - a.count);
        const topCount = choiceVoteCounts[0]?.count ?? 0;
        const requiresTieBreak =
          choices.length > 2 && topCount < MAJORITY_THRESHOLD;
        const uniqueVoters = new Set((votes ?? []).map(() => "")).size;

        finalised.push({
          id: p.id,
          title: p.title,
          outcome: p.outcome,
          isMultipleChoice: true,
          requiresTieBreak,
          choiceResults: choiceVoteCounts,
          totalVoters: uniqueVoters,
        });
      } else {
        const { yesCount, noCount } = countYesNo(votes ?? [], ynMap);
        const outcome = calculateOutcome(yesCount, noCount);

        finalised.push({
          id: p.id,
          title: p.title,
          outcome: outcome === "pending" ? p.outcome : outcome,
          isMultipleChoice: false,
          yesVotes: yesCount,
          noVotes: noCount,
          notVoted: 12 - yesCount - noCount,
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

  const ynMap = buildYesNoMap(choices ?? []);
  const isYesNo = (choices ?? []).length === 0 || ynMap !== null;
  const isRealMultipleChoice = (choices ?? []).length > 0 && ynMap === null;

  if (isYesNo && proposal.outcome !== "passed" && proposal.outcome !== "failed" && proposal.status !== "closed") {
    return { proposal, restricted: true, isMultipleChoice: false };
  }
  if (isRealMultipleChoice && proposal.status !== "closed") {
    return { proposal, restricted: true, isMultipleChoice: true };
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

  if (isRealMultipleChoice) {
    const choiceBreakdown = (choices ?? []).map((c) => {
      const choiceVotes = (votes ?? []).filter((v) => v.vote_value === c.id);
      return {
        id: c.id,
        label: c.label,
        count: choiceVotes.length,
        voters: choiceVotes.map((v) => {
          const m = v.members as unknown as { display_name: string } | null;
          return m?.display_name ?? "Unknown";
        }),
      };
    });
    choiceBreakdown.sort((a, b) => b.count - a.count);
    const topCount = choiceBreakdown[0]?.count ?? 0;
    const requiresTieBreak =
      (choices ?? []).length > 2 && topCount < MAJORITY_THRESHOLD;

    return {
      proposal,
      restricted: false,
      isMultipleChoice: true,
      requiresTieBreak,
      choiceBreakdown,
      notVoted,
      notVotedCount: notVoted.length,
    };
  }

  const getName = (v: { members: unknown }) => {
    const m = v.members as { display_name: string } | null;
    return m?.display_name ?? "Unknown";
  };

  const yesVoters = (votes ?? [])
    .filter((v) => {
      const mapped = ynMap ? ynMap.get(v.vote_value) : v.vote_value;
      return mapped === "yes";
    })
    .map(getName);
  const noVoters = (votes ?? [])
    .filter((v) => {
      const mapped = ynMap ? ynMap.get(v.vote_value) : v.vote_value;
      return mapped === "no";
    })
    .map(getName);

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
