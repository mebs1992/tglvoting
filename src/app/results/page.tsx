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
        <h1 className="page-title">Results</h1>
        <ResultsContent finalised={finalised} pending={pending} />
      </div>
    </>
  );
}
