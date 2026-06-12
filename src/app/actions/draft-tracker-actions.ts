"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireCommissioner, requireMember } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  calculateDraftPositions,
  getEffectivePosition,
  STAGE_LABELS,
  type NationEntry,
} from "@/lib/draft-calculator";
import { getNationStats } from "@/lib/football-api";

export interface DraftEntryWithMember extends NationEntry {
  nation_code: string | null;
  created_at: string;
  updated_at: string;
  display_name: string;
  team_name: string | null;
  effective_position: number | null;
}

export interface DraftTrackerData {
  entries: DraftEntryWithMember[];
  members: { id: string; display_name: string; team_name: string | null }[];
}

export async function getDraftTrackerData(): Promise<DraftTrackerData> {
  await requireMember();
  const sb = getServiceClient();

  const [entriesRes, membersRes] = await Promise.all([
    sb
      .from("draft_tracker_nations")
      .select(
        "*, members!draft_tracker_nations_member_id_fkey(display_name, team_name)"
      )
      .order("created_at", { ascending: true }),
    sb
      .from("members")
      .select("id, display_name, team_name")
      .order("created_at", { ascending: true }),
  ]);

  const rawEntries = (entriesRes.data ?? []).map(
    (row: Record<string, unknown>) => {
      const member = row.members as {
        display_name: string;
        team_name: string | null;
      } | null;
      return {
        id: row.id as string,
        member_id: row.member_id as string,
        nation_name: row.nation_name as string,
        nation_code: (row.nation_code as string) ?? null,
        status: row.status as "active" | "eliminated",
        elimination_stage: (row.elimination_stage as string) ?? null,
        group_wins: (row.group_wins as number) ?? 0,
        group_losses: (row.group_losses as number) ?? 0,
        group_draws: (row.group_draws as number) ?? 0,
        goal_differential: (row.goal_differential as number) ?? 0,
        eliminated_at: (row.eliminated_at as string) ?? null,
        draft_position: (row.draft_position as number) ?? null,
        draft_position_override:
          (row.draft_position_override as number) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        display_name: member?.display_name ?? "Unknown",
        team_name: member?.team_name ?? null,
      };
    }
  );

  const calculated = calculateDraftPositions(rawEntries);
  const entries: DraftEntryWithMember[] = rawEntries.map(
    (e) => ({
      ...e,
      effective_position: getEffectivePosition(e, calculated),
    })
  );

  return {
    entries,
    members: membersRes.data ?? [],
  };
}

export async function assignNation(
  memberId: string,
  nationName: string,
  nationCode?: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb.from("draft_tracker_nations").insert({
    member_id: memberId,
    nation_name: nationName,
    nation_code: nationCode || null,
  });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("member"))
        return { success: false, error: "This member already has a nation" };
      if (error.message.includes("nation"))
        return { success: false, error: "This nation is already assigned" };
    }
    return { success: false, error: "Failed to assign nation" };
  }

  await logAudit(member.id, "nation_assigned", "draft_tracker", null, {
    memberId,
    nationName,
  });

  return { success: true };
}

export async function removeNation(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { data: entry } = await sb
    .from("draft_tracker_nations")
    .select("nation_name")
    .eq("id", entryId)
    .single();

  const { error } = await sb
    .from("draft_tracker_nations")
    .delete()
    .eq("id", entryId);

  if (error) return { success: false, error: "Failed to remove nation" };

  await logAudit(member.id, "nation_removed", "draft_tracker", entryId, {
    nationName: entry?.nation_name,
  });

  return { success: true };
}

export async function eliminateNation(
  entryId: string,
  stage: string,
  groupWins: number,
  groupLosses: number,
  groupDraws: number,
  goalDifferential: number
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("draft_tracker_nations")
    .update({
      status: "eliminated",
      elimination_stage: stage,
      group_wins: groupWins,
      group_losses: groupLosses,
      group_draws: groupDraws,
      goal_differential: goalDifferential,
      eliminated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) return { success: false, error: "Failed to eliminate nation" };

  await recalculatePositions();

  await logAudit(member.id, "nation_eliminated", "draft_tracker", entryId, {
    stage: STAGE_LABELS[stage] ?? stage,
  });

  return { success: true };
}

export async function reactivateNation(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("draft_tracker_nations")
    .update({
      status: "active",
      elimination_stage: null,
      eliminated_at: null,
      draft_position: null,
      draft_position_override: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) return { success: false, error: "Failed to reactivate nation" };

  await recalculatePositions();

  await logAudit(member.id, "nation_reactivated", "draft_tracker", entryId);

  return { success: true };
}

export async function updateNationStats(
  entryId: string,
  groupWins: number,
  groupLosses: number,
  groupDraws: number,
  goalDifferential: number
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("draft_tracker_nations")
    .update({
      group_wins: groupWins,
      group_losses: groupLosses,
      group_draws: groupDraws,
      goal_differential: goalDifferential,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) return { success: false, error: "Failed to update stats" };

  await recalculatePositions();

  await logAudit(member.id, "nation_stats_updated", "draft_tracker", entryId);

  return { success: true };
}

export async function overrideDraftPosition(
  entryId: string,
  position: number | null
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("draft_tracker_nations")
    .update({
      draft_position_override: position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) return { success: false, error: "Failed to override position" };

  await logAudit(
    member.id,
    position !== null ? "draft_position_overridden" : "draft_override_cleared",
    "draft_tracker",
    entryId,
    { position }
  );

  return { success: true };
}

export async function syncFromApi(): Promise<{
  success: boolean;
  error?: string;
  updated?: number;
}> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { data: entries } = await sb
    .from("draft_tracker_nations")
    .select("id, nation_name, nation_code");

  if (!entries || entries.length === 0) {
    return { success: false, error: "No nations assigned yet" };
  }

  const validEntries = entries.filter(
    (e: { nation_name: string | null }) => e.nation_name
  );

  if (validEntries.length === 0) {
    return { success: false, error: "No nations with names to sync" };
  }

  let statsMap;
  try {
    statsMap = await getNationStats(
      validEntries.map((e: { nation_name: string }) => e.nation_name)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown API error";
    return { success: false, error: `API sync failed: ${message}` };
  }

  let updated = 0;
  for (const entry of validEntries) {
    const normName = entry.nation_name.trim().toLowerCase();
    const stats = statsMap.get(normName);
    if (!stats) continue;

    const updateData: Record<string, unknown> = {
      group_wins: stats.groupWins,
      group_losses: stats.groupLosses,
      group_draws: stats.groupDraws,
      goal_differential: stats.goalDifferential,
      updated_at: new Date().toISOString(),
    };

    if (stats.isEliminated && stats.eliminationStage) {
      updateData.status = "eliminated";
      updateData.elimination_stage = stats.eliminationStage;
      updateData.eliminated_at = new Date().toISOString();
    }

    await sb
      .from("draft_tracker_nations")
      .update(updateData)
      .eq("id", entry.id);
    updated++;
  }

  await recalculatePositions();

  await logAudit(member.id, "draft_api_synced", "draft_tracker", null, {
    updated,
  });

  return { success: true, updated };
}

async function recalculatePositions() {
  const sb = getServiceClient();

  const { data: allEntries } = await sb
    .from("draft_tracker_nations")
    .select("*");

  if (!allEntries) return;

  const nations: NationEntry[] = allEntries.map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      member_id: row.member_id as string,
      nation_name: row.nation_name as string,
      status: row.status as "active" | "eliminated",
      elimination_stage: (row.elimination_stage as string) ?? null,
      group_wins: (row.group_wins as number) ?? 0,
      group_losses: (row.group_losses as number) ?? 0,
      group_draws: (row.group_draws as number) ?? 0,
      goal_differential: (row.goal_differential as number) ?? 0,
      eliminated_at: (row.eliminated_at as string) ?? null,
      draft_position: (row.draft_position as number) ?? null,
      draft_position_override:
        (row.draft_position_override as number) ?? null,
    })
  );

  const positions = calculateDraftPositions(nations);

  for (const nation of nations) {
    const newPos = positions.get(nation.id) ?? null;
    if (newPos !== nation.draft_position) {
      await sb
        .from("draft_tracker_nations")
        .update({ draft_position: newPos })
        .eq("id", nation.id);
    }
  }
}
