import Link from "next/link";
import DeleteCampaign from "@/components/campaigns/DeleteCampaign";
import { textLink } from "@/components/ui/styles";
import { type CampaignType, campaignTypeLabels } from "@/lib/campaigns/campaignTypes";
import { isCampaignClosed } from "@/lib/campaigns/deadline";
import { formatDeadline } from "@/lib/campaigns/format";
import { type Sport, sportLabels } from "@/lib/sports";

type CampaignListItem = {
  id: string;
  type: CampaignType;
  title: string;
  sports: Sport[];
  deadline: string | null;
  applicationCount: number;
};

export const applicationCountLabel = (count: number) =>
  count === 1 ? "1 application" : `${count} applications`;

export default function CampaignList({ campaigns }: { campaigns: CampaignListItem[] }) {
  if (campaigns.length === 0) {
    return <p className="text-sm text-foreground/70">No campaigns yet</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {campaigns.map((campaign) => (
        <li key={campaign.id} className="rounded-button border border-foreground/15 px-4 py-3">
          <p className="font-medium break-words">
            {campaign.title}
            {isCampaignClosed(campaign.deadline) && (
              <>
                {" "}
                <span className="ml-1 rounded-button border border-foreground/30 px-1.5 py-0.5 align-middle text-xs tracking-wide text-foreground/70 uppercase">
                  <span className="sr-only">Applications </span>Closed
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs tracking-wide text-foreground/70 uppercase">
            {campaignTypeLabels[campaign.type]} ·{" "}
            {campaign.sports.map((sport) => sportLabels[sport]).join(", ")}
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            {campaign.deadline && <>Apply by {formatDeadline(campaign.deadline)} · </>}
            {applicationCountLabel(campaign.applicationCount)}
          </p>
          <div className="mt-3 flex items-baseline gap-5">
            <Link
              href={`/dashboard/campaigns/${campaign.id}/applications`}
              aria-label={`Applications to ${campaign.title}`}
              className={`${textLink} text-sm`}
            >
              Applications ({campaign.applicationCount})
            </Link>
            <Link
              href={`/dashboard/campaigns/${campaign.id}/edit`}
              aria-label={`Edit ${campaign.title}`}
              className={`${textLink} text-sm`}
            >
              Edit
            </Link>
            {/* The database keeps campaigns with applications, so athletes don't lose them. */}
            {campaign.applicationCount === 0 && (
              <DeleteCampaign
                campaignId={campaign.id}
                label={
                  <>
                    Delete<span className="sr-only"> {campaign.title}</span>
                  </>
                }
                pendingLabel={
                  <>
                    Deleting<span className="sr-only"> {campaign.title}</span>…
                  </>
                }
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
