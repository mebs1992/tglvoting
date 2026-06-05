"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireCommissioner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutcome } from "@/lib/voting";

export async function createProposal(
  title: string,
  description: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { data, error } = await sb
    .from("proposals")
    .insert({
      title,
      description,
      status: "draft",
      outcome: "pending",
      created_by: member.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "Failed to create proposal" };

  await logAudit(member.id, "proposal_created", "proposal", data.id, { title });

  return { success: true, id: data.id };
}

export async function editProposal(
  proposalId: string,
  title: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, status")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { success: false, error: "Proposal not found" };
  if (proposal.status === "closed") {
    return { success: false, error: "Cannot edit a closed proposal" };
  }

  const { error } = await sb
    .from("proposals")
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  if (error) return { success: false, error: "Failed to edit proposal" };

  await logAudit(member.id, "proposal_edited", "proposal", proposalId, { title });

  return { success: true };
}

export async function openProposal(
  proposalId: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, status")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { success: false, error: "Proposal not found" };
  if (proposal.status !== "draft") {
    return { success: false, error: "Only draft proposals can be opened" };
  }

  const { error } = await sb
    .from("proposals")
    .update({
      status: "open",
      opened_by: member.id,
      opened_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { success: false, error: "Failed to open proposal" };

  await logAudit(member.id, "proposal_opened", "proposal", proposalId);

  return { success: true };
}

export async function closeProposal(
  proposalId: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, status")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { success: false, error: "Proposal not found" };
  if (proposal.status !== "open") {
    return { success: false, error: "Only open proposals can be closed" };
  }

  const { data: votes } = await sb
    .from("votes")
    .select("vote_value")
    .eq("proposal_id", proposalId);

  const yesCount = (votes ?? []).filter((v) => v.vote_value === "yes").length;
  const noCount = (votes ?? []).filter((v) => v.vote_value === "no").length;
  const outcome = calculateOutcome(yesCount, noCount);

  const { error } = await sb
    .from("proposals")
    .update({
      status: "closed",
      outcome,
      closed_by: member.id,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { success: false, error: "Failed to close proposal" };

  await logAudit(member.id, "proposal_closed", "proposal", proposalId, { outcome });

  return { success: true };
}

export async function resetMemberPin(
  targetMemberId: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("members")
    .update({ pin_hash: null, pin_created_at: null })
    .eq("id", targetMemberId);

  if (error) return { success: false, error: "Failed to reset PIN" };

  await logAudit(member.id, "pin_reset", "member", targetMemberId);

  return { success: true };
}

export async function updateMember(
  targetMemberId: string,
  displayName: string,
  teamName: string
): Promise<{ success: boolean; error?: string }> {
  await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("members")
    .update({
      display_name: displayName,
      team_name: teamName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetMemberId);

  if (error) return { success: false, error: "Failed to update member" };

  return { success: true };
}

export async function setCommissioner(
  targetMemberId: string,
  isCommissioner: boolean
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("members")
    .update({ is_commissioner: isCommissioner, updated_at: new Date().toISOString() })
    .eq("id", targetMemberId);

  if (error) return { success: false, error: "Failed to update privileges" };

  const action = isCommissioner
    ? "commissioner_granted"
    : "commissioner_removed";
  await logAudit(member.id, action, "member", targetMemberId);

  return { success: true };
}

export async function getAllProposals() {
  await requireCommissioner();
  const sb = getServiceClient();

  const { data } = await sb
    .from("proposals")
    .select("id, title, description, status, outcome, created_at, opened_at, closed_at")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAllMembers() {
  await requireCommissioner();
  const sb = getServiceClient();

  const { data } = await sb
    .from("members")
    .select("id, display_name, team_name, is_commissioner, pin_created_at")
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getProposalVotingRecord(proposalId: string) {
  await requireCommissioner();
  const sb = getServiceClient();

  const { data: proposal } = await sb
    .from("proposals")
    .select("id, title, status, outcome")
    .eq("id", proposalId)
    .single();

  if (!proposal) return null;

  const { data: votes } = await sb
    .from("votes")
    .select("member_id, vote_value, created_at, members(display_name)")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  const { data: allMembers } = await sb
    .from("members")
    .select("id, display_name")
    .order("created_at", { ascending: true });

  const votedIds = new Set((votes ?? []).map((v) => v.member_id));
  const notVoted = (allMembers ?? [])
    .filter((m) => !votedIds.has(m.id))
    .map((m) => m.display_name);

  return {
    proposal,
    votes: (votes ?? []).map((v) => ({
      memberName:
        (v.members as unknown as { display_name: string } | null)?.display_name ?? "Unknown",
      voteValue: v.vote_value,
      votedAt: v.created_at,
    })),
    notVoted,
  };
}
