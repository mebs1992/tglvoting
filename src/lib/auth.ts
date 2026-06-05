import { getSession } from "./session";
import { getServiceClient } from "./supabase-server";

export interface Member {
  id: string;
  display_name: string;
  team_name: string | null;
  is_commissioner: boolean;
  pin_hash: string | null;
  pin_created_at: string | null;
}

export interface SafeMember {
  id: string;
  display_name: string;
  team_name: string | null;
  is_commissioner: boolean;
  has_pin: boolean;
}

export function toSafeMember(m: Member): SafeMember {
  return {
    id: m.id,
    display_name: m.display_name,
    team_name: m.team_name,
    is_commissioner: m.is_commissioner,
    has_pin: !!m.pin_hash,
  };
}

export async function getCurrentMember(): Promise<Member | null> {
  const session = await getSession();
  if (!session) return null;

  const sb = getServiceClient();
  const { data } = await sb
    .from("members")
    .select("*")
    .eq("id", session.memberId)
    .single();

  return data;
}

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) throw new Error("NOT_AUTHENTICATED");
  return member;
}

export async function requireCommissioner(): Promise<Member> {
  const member = await requireMember();
  if (!member.is_commissioner) throw new Error("NOT_COMMISSIONER");
  return member;
}
