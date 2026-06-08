import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getLeagueInfo } from "@/app/actions/league-info-actions";
import AppHeader from "@/app/components/app-header";
import HomeContent from "./home-content";

export default async function HomePage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const leagueInfo = await getLeagueInfo();

  return (
    <>
      <AppHeader
        memberName={member.display_name}
        isCommissioner={member.is_commissioner}
      />
      <div className="container">
        <HomeContent
          sections={leagueInfo.sections}
          announcements={leagueInfo.announcements}
          passedRules={leagueInfo.passedRules}
          isCommissioner={member.is_commissioner}
        />
      </div>
    </>
  );
}
