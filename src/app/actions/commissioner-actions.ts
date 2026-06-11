"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireCommissioner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutcome } from "@/lib/voting";

export async function createProposal(
  title: string,
  description: string,
  choices: string[] = [],
  allowMultipleSelections: boolean = false
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
      allow_multiple_selections: choices.length > 0 && allowMultipleSelections,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "Failed to create proposal" };

  if (choices.length > 0) {
    const choiceRows = choices.map((label, i) => ({
      proposal_id: data.id,
      label: label.trim(),
      display_order: i,
    }));
    const { error: choiceError } = await sb
      .from("proposal_choices")
      .insert(choiceRows);
    if (choiceError) return { success: false, error: "Failed to create choices" };
  }

  await logAudit(member.id, "proposal_created", "proposal", data.id, { title });

  return { success: true, id: data.id };
}

export async function editProposal(
  proposalId: string,
  title: string,
  description: string,
  choices: string[] = [],
  allowMultipleSelections: boolean = false
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
    .update({
      title,
      description,
      allow_multiple_selections: choices.length > 0 && allowMultipleSelections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { success: false, error: "Failed to edit proposal" };

  await sb.from("proposal_choices").delete().eq("proposal_id", proposalId);
  if (choices.length > 0) {
    const choiceRows = choices.map((label, i) => ({
      proposal_id: proposalId,
      label: label.trim(),
      display_order: i,
    }));
    const { error: choiceError } = await sb
      .from("proposal_choices")
      .insert(choiceRows);
    if (choiceError) return { success: false, error: "Failed to update choices" };
  }

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
    .select("id, title, description, status, outcome, allow_multiple_selections, created_at, opened_at, closed_at")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const proposalIds = data.map((p) => p.id);
  const { data: choices } = await sb
    .from("proposal_choices")
    .select("id, proposal_id, label, display_order")
    .in("proposal_id", proposalIds)
    .order("display_order", { ascending: true });

  const choicesByProposal = new Map<string, { id: string; label: string; display_order: number }[]>();
  for (const c of choices ?? []) {
    const arr = choicesByProposal.get(c.proposal_id) ?? [];
    arr.push({ id: c.id, label: c.label, display_order: c.display_order });
    choicesByProposal.set(c.proposal_id, arr);
  }

  return data.map((p) => ({
    ...p,
    choices: choicesByProposal.get(p.id) ?? [],
  }));
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

export async function getVoteTracker() {
  await requireCommissioner();
  const sb = getServiceClient();

  const { data: openProposals } = await sb
    .from("proposals")
    .select("id, title, opened_at")
    .eq("status", "open")
    .order("opened_at", { ascending: false });

  if (!openProposals || openProposals.length === 0) return [];

  const { data: allMembers } = await sb
    .from("members")
    .select("id, display_name")
    .order("created_at", { ascending: true });

  const proposalIds = openProposals.map((p) => p.id);
  const { data: votes } = await sb
    .from("votes")
    .select("proposal_id, member_id, created_at")
    .in("proposal_id", proposalIds);

  return openProposals.map((p) => {
    const proposalVotes = (votes ?? []).filter((v) => v.proposal_id === p.id);
    const votedMemberIds = new Set(proposalVotes.map((v) => v.member_id));

    const voted = (allMembers ?? [])
      .filter((m) => votedMemberIds.has(m.id))
      .map((m) => {
        const vote = proposalVotes.find((v) => v.member_id === m.id);
        return { name: m.display_name, votedAt: vote?.created_at ?? "" };
      });

    const notVoted = (allMembers ?? [])
      .filter((m) => !votedMemberIds.has(m.id))
      .map((m) => m.display_name);

    return {
      id: p.id,
      title: p.title,
      votedCount: voted.length,
      totalMembers: (allMembers ?? []).length,
      voted,
      notVoted,
    };
  });
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
