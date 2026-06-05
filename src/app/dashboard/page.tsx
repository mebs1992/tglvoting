import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getOpenProposals } from "@/app/actions/vote-actions";
import AppHeader from "@/app/components/app-header";
import DashboardContent from "./dashboard-content";

export default async function DashboardPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const proposals = await getOpenProposals();

  return (
    <>
      <AppHeader
        memberName={member.display_name}
        isCommissioner={member.is_commissioner}
      />
      <div className="container">
        <h1 className="page-title">Open Issues</h1>
        <DashboardContent initialProposals={proposals} />
      </div>
    </>
  );
}
