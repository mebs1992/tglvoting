import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getAllProposals, getAllMembers, getVoteTracker } from "@/app/actions/commissioner-actions";
import AppHeader from "@/app/components/app-header";
import Link from "next/link";
import CommissionerContent from "./commissioner-content";

export default async function CommissionerPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  if (!member.is_commissioner) {
    return (
      <>
        <AppHeader memberName={member.display_name} isCommissioner={false} />
        <div className="container">
          <div className="card text-center">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Denied</h2>
            <p className="text-muted">You do not have commissioner privileges.</p>
            <Link href="/dashboard" className="btn btn-sm btn-outline mt-16">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  const [proposals, members, tracker] = await Promise.all([
    getAllProposals(),
    getAllMembers(),
    getVoteTracker(),
  ]);

  return (
    <>
      <AppHeader memberName={member.display_name} isCommissioner={true} />
      <div className="container">
        <h1 className="page-title">Commissioner Panel</h1>
        <CommissionerContent
          initialProposals={proposals}
          initialMembers={members}
          initialTracker={tracker}
        />
      </div>
    </>
  );
}
