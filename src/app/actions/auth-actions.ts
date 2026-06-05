"use server";

import bcrypt from "bcryptjs";
import { getServiceClient } from "@/lib/supabase-server";
import { createSession, destroySession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { toSafeMember } from "@/lib/auth";
import type { SafeMember } from "@/lib/auth";

export async function getMembers(): Promise<SafeMember[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("members")
    .select("id, display_name, team_name, is_commissioner, pin_hash, pin_created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Failed to load members");
  return (data ?? []).map(toSafeMember);
}

export async function createPin(
  memberId: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  if (!pin || pin.length < 4 || pin.length > 8) {
    return { success: false, error: "PIN must be 4-8 digits" };
  }
  if (!/^\d+$/.test(pin)) {
    return { success: false, error: "PIN must be digits only" };
  }

  const sb = getServiceClient();
  const { data: member } = await sb
    .from("members")
    .select("id, pin_hash")
    .eq("id", memberId)
    .single();

  if (!member) return { success: false, error: "Member not found" };
  if (member.pin_hash) return { success: false, error: "PIN already set" };

  const hash = await bcrypt.hash(pin, 12);
  const { error } = await sb
    .from("members")
    .update({ pin_hash: hash, pin_created_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) return { success: false, error: "Failed to create PIN" };

  await createSession(memberId);
  await logAudit(memberId, "pin_created", "member", memberId);

  return { success: true };
}

export async function login(
  memberId: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  if (!pin) return { success: false, error: "PIN is required" };

  const sb = getServiceClient();
  const { data: member } = await sb
    .from("members")
    .select("id, pin_hash")
    .eq("id", memberId)
    .single();

  if (!member) return { success: false, error: "Member not found" };
  if (!member.pin_hash) return { success: false, error: "PIN not set" };

  const valid = await bcrypt.compare(pin, member.pin_hash);
  if (!valid) return { success: false, error: "Incorrect PIN" };

  await createSession(memberId);
  return { success: true };
}

export async function logout() {
  await destroySession();
}
