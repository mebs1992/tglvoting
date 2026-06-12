import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getOpenProposals, getRecentVerdicts } from "@/app/actions/vote-actions";
import AppHeader from "@/app/components/app-header";
import DashboardContent from "./dashboard-content";

export default async function DashboardPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const [proposals, recentVerdicts] = await Promise.all([
    getOpenProposals(),
    getRecentVerdicts(),
  ]);

  return (
    <>
      <AppHeader
        memberName={member.display_name}
        isCommissioner={member.is_commissioner}
      />
      <div className="container">
        <DashboardContent
          initialProposals={proposals}
          recentVerdicts={recentVerdicts}
        />
      </div>
    </>
  );
}
