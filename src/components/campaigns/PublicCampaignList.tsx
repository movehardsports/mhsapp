import Link from "next/link";
import { type CampaignType, campaignTypeLabels } from "@/lib/campaigns/campaignTypes";
import { formatDeadline } from "@/lib/campaigns/format";
import { type Sport, sportLabels } from "@/lib/sports";

type PublicCampaignListItem = {
  id: string;
  type: CampaignType;
  title: string;
  sports: Sport[];
  deadline: string | null;
  brand: { name: string };
};

// The public campaign list, for guests and every account. Campaigns are public, so this shows
// everything in the row; contact details never live in campaigns.
export default function PublicCampaignList({ campaigns }: { campaigns: PublicCampaignListItem[] }) {
  if (campaigns.length === 0) {
    return <p className="text-center text-sm text-foreground/70">No open campaigns yet</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {campaigns.map((campaign) => (
        // The whole card is clickable: the title link stretches over it (`after:inset-0`), so
        // the link's name stays the title alone.
        <li
          key={campaign.id}
          className="relative flex flex-col gap-2 rounded-button border border-foreground/15 px-4 py-3 transition-colors hover:border-foreground/40 hover:bg-foreground/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <div className="min-w-0">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="font-medium break-words outline-none after:absolute after:inset-0 after:content-['']"
            >
              {campaign.title}
            </Link>
            <p className="mt-1 text-sm text-foreground/70">{campaign.brand.name}</p>
            <p className="mt-1 text-xs tracking-wide text-foreground/70 uppercase">
              {campaign.sports.map((sport) => sportLabels[sport]).join(", ")}
            </p>
          </div>
          <div className="flex shrink-0 items-baseline gap-3 text-sm sm:flex-col sm:items-end sm:gap-1">
            <span className="text-xs tracking-wide uppercase">
              {campaignTypeLabels[campaign.type]}
            </span>
            {campaign.deadline && (
              <span className="text-foreground/70">
                Apply by {formatDeadline(campaign.deadline)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
