import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getVoteBreakdown } from "@/app/actions/vote-actions";
import AppHeader from "@/app/components/app-header";
import BreakdownContent from "./breakdown-content";

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const { id } = await params;
  const data = await getVoteBreakdown(id);

  return (
    <>
      <AppHeader
        memberName={member.display_name}
        isCommissioner={member.is_commissioner}
      />
      <div className="container">
        <BreakdownContent data={data} />
      </div>
    </>
  );
}
