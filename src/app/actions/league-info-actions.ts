"use server";

import { getServiceClient } from "@/lib/supabase-server";
import { requireCommissioner, requireMember } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export interface LeagueInfoSection {
  id: string;
  section_key: string;
  title: string;
  content: Record<string, unknown>;
  is_visible: boolean;
  display_order: number;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface PassedRule {
  id: string;
  title: string;
  description: string;
  closed_at: string;
}

export async function getLeagueInfo(): Promise<{
  sections: LeagueInfoSection[];
  announcements: Announcement[];
  passedRules: PassedRule[];
}> {
  await requireMember();
  const sb = getServiceClient();

  const [sectionsRes, announcementsRes, rulesRes] = await Promise.all([
    sb
      .from("league_info")
      .select("*")
      .order("display_order", { ascending: true }),
    sb
      .from("announcements")
      .select("*, members!announcements_created_by_fkey(display_name)")
      .eq("is_pinned", true)
      .order("created_at", { ascending: false }),
    sb
      .from("proposals")
      .select("id, title, description, closed_at")
      .eq("status", "closed")
      .eq("outcome", "passed")
      .order("closed_at", { ascending: false }),
  ]);

  const announcements = (announcementsRes.data ?? []).map(
    (a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      content: a.content as string,
      is_pinned: a.is_pinned as boolean,
      created_by: a.created_by as string,
      created_at: a.created_at as string,
      updated_at: a.updated_at as string,
      creator_name:
        (a.members as { display_name: string } | null)?.display_name ??
        "Unknown",
    })
  );

  return {
    sections: sectionsRes.data ?? [],
    announcements,
    passedRules: rulesRes.data ?? [],
  };
}

export async function updateSection(
  sectionKey: string,
  content: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("league_info")
    .update({
      content,
      updated_at: new Date().toISOString(),
      updated_by: member.id,
    })
    .eq("section_key", sectionKey);

  if (error) return { success: false, error: "Failed to update section" };

  await logAudit(member.id, "league_info_updated", "league_info", null, {
    section_key: sectionKey,
  });

  return { success: true };
}

export async function toggleSectionVisibility(
  sectionKey: string,
  isVisible: boolean
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("league_info")
    .update({
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
      updated_by: member.id,
    })
    .eq("section_key", sectionKey);

  if (error) return { success: false, error: "Failed to toggle visibility" };

  return { success: true };
}

export async function createAnnouncement(
  title: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb.from("announcements").insert({
    title,
    content,
    is_pinned: true,
    created_by: member.id,
  });

  if (error) return { success: false, error: "Failed to create announcement" };

  await logAudit(member.id, "announcement_created", "announcement", null, {
    title,
  });

  return { success: true };
}

export async function updateAnnouncement(
  id: string,
  title: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb
    .from("announcements")
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: "Failed to update announcement" };

  await logAudit(member.id, "announcement_updated", "announcement", id, {
    title,
  });

  return { success: true };
}

export async function deleteAnnouncement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const member = await requireCommissioner();
  const sb = getServiceClient();

  const { error } = await sb.from("announcements").delete().eq("id", id);

  if (error) return { success: false, error: "Failed to delete announcement" };

  await logAudit(member.id, "announcement_deleted", "announcement", id);

  return { success: true };
}
