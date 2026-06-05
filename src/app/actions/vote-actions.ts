"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireMember } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutcome } from "@/lib/voting";

export async function submitVote(
  proposalId: string,
  voteValue: "yes" | "no"
): Promise<{ success: boolean; error?: string }> {
  const member = await requireMember();
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, status")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { success: false, error: "Proposal not found" };
  if (proposal.status !== "open") return { success: false, error: "Proposal is not open" };

  const { data: existing } = await sb
    .from("votes")
    .select("id")
    .eq("proposal_id", proposalId)
    .eq("member_id", member.id)
    .single();

  if (existing) return { success: false, error: "You have already voted" };

  const { error } = await sb.from("votes").insert({
    proposal_id: proposalId,
    member_id: member.id,
    vote_value: voteValue,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You have already voted" };
    }
    return { success: false, error: "Failed to submit vote" };
  }

  await logAudit(member.id, "vote_submitted", "proposal", proposalId, {
    vote_value: voteValue,
  });

  // Check if proposal has reached an outcome
  const { data: votes } = await sb
    .from("votes")
    .select("vote_value")
    .eq("proposal_id", proposalId);

  if (votes) {
    const yesCount = votes.filter((v) => v.vote_value === "yes").length;
    const noCount = votes.filter((v) => v.vote_value === "no").length;
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

  return { success: true };
}

export async function getOpenProposals() {
  const member = await requireMember();
  const sb = getServiceClient();

  const { data: proposals } = await sb
    .from("proposals")
    .select("id, title, description, status, outcome, opened_at")
    .eq("status", "open")
    .order("opened_at", { ascending: false });

  if (!proposals) return [];

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
  }));
}

export async function getResults() {
  const sb = getServiceClient();

  const { data: proposals } = await sb
    .from("proposals")
    .select("id, title, description, status, outcome, opened_at, closed_at")
    .in("status", ["open", "closed"])
    .order("closed_at", { ascending: false, nullsFirst: false });

  if (!proposals) return { finalised: [], pending: [] };

  const finalised = [];
  const pending = [];

  for (const p of proposals) {
    if (p.outcome === "passed" || p.outcome === "failed") {
      const { data: votes } = await sb
        .from("votes")
        .select("vote_value")
        .eq("proposal_id", p.id);

      const yesCount = (votes ?? []).filter((v) => v.vote_value === "yes").length;
      const noCount = (votes ?? []).filter((v) => v.vote_value === "no").length;

      finalised.push({
        id: p.id,
        title: p.title,
        outcome: p.outcome,
        yesVotes: yesCount,
        noVotes: noCount,
        notVoted: 12 - yesCount - noCount,
      });
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
    .select("id, title, description, status, outcome")
    .eq("id", proposalId)
    .single();

  if (!proposal) return null;

  if (proposal.outcome !== "passed" && proposal.outcome !== "failed") {
    return { proposal, restricted: true };
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

  const yesVoters = (votes ?? [])
    .filter((v) => v.vote_value === "yes")
    .map((v) => {
      const m = v.members as unknown as { display_name: string } | null;
      return m?.display_name ?? "Unknown";
    });
  const noVoters = (votes ?? [])
    .filter((v) => v.vote_value === "no")
    .map((v) => {
      const m = v.members as unknown as { display_name: string } | null;
      return m?.display_name ?? "Unknown";
    });
  const notVoted = (allMembers ?? [])
    .filter((m) => !votedIds.has(m.id))
    .map((m) => m.display_name);

  return {
    proposal,
    restricted: false,
    yesVoters,
    noVoters,
    notVoted,
    yesCount: yesVoters.length,
    noCount: noVoters.length,
    notVotedCount: notVoted.length,
  };
}
