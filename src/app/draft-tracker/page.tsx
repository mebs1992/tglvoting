import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getDraftTrackerData } from "@/app/actions/draft-tracker-actions";
import AppHeader from "@/app/components/app-header";
import DraftTrackerContent from "./draft-tracker-content";

export default async function DraftTrackerPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const trackerData = await getDraftTrackerData();

  return (
    <>
      <AppHeader
        memberName={member.display_name}
        isCommissioner={member.is_commissioner}
      />
      <div className="container">
        <div className="page-hero">
          <div className="page-hero-eyebrow">World Cup 2026</div>
          <div className="page-hero-title">Draft Order Tracker</div>
          <div className="page-hero-sub">
            Go deep, pick early. The champion&apos;s GM picks first.
          </div>
        </div>
        <DraftTrackerContent
          entries={trackerData.entries}
          members={trackerData.members}
          isCommissioner={member.is_commissioner}
        />
      </div>
    </>
  );
}
