import { type CampaignType, campaignTypeLabels } from "@/lib/campaignTypes";
import { type Sport, sportLabels } from "@/lib/sports";

export type CampaignListItem = {
  id: string;
  type: CampaignType;
  title: string;
  sports: Sport[];
  deadline: string | null;
};

// Deadlines are plain dates (YYYY-MM-DD); format them in UTC so the day never shifts.
const formatDeadline = (deadline: string) =>
  new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default function CampaignList({ campaigns }: { campaigns: CampaignListItem[] }) {
  if (campaigns.length === 0) {
    return <p className="text-sm text-foreground/70">No campaigns yet</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {campaigns.map((campaign) => (
        <li key={campaign.id} className="rounded-button border border-foreground/15 px-4 py-3">
          <p className="font-medium">{campaign.title}</p>
          <p className="mt-1 text-xs tracking-wide text-foreground/70 uppercase">
            {campaignTypeLabels[campaign.type]} ·{" "}
            {campaign.sports.map((sport) => sportLabels[sport]).join(", ")}
          </p>
          {campaign.deadline && (
            <p className="mt-1 text-sm text-foreground/70">
              Apply by {formatDeadline(campaign.deadline)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
