import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getResults } from "@/app/actions/vote-actions";
import AppHeader from "@/app/components/app-header";
import ResultsContent from "./results-content";

export default async function ResultsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const { finalised, pending } = await getResults();

  return (
    <>
      <AppHeader
        memberName={member.display_name}
        isCommissioner={member.is_commissioner}
      />
      <div className="container">
        <div className="page-hero">
          <div className="page-hero-eyebrow">League History</div>
          <div className="page-hero-title">The Record Books</div>
          <div className="page-hero-sub">
            Every verdict the league has handed down — etched forever.
          </div>
        </div>
        <ResultsContent finalised={finalised} pending={pending} />
      </div>
    </>
  );
}
