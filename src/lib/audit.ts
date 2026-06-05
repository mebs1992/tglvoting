import { getServiceClient } from "./supabase-server";

export async function logAudit(
  actorMemberId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>
) {
  const sb = getServiceClient();
  await sb.from("audit_log").insert({
    actor_member_id: actorMemberId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? null,
  });
}
