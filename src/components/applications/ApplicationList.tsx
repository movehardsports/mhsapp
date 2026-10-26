import Link from "next/link";
import { type ApplicationStatus, applicationStatusLabels } from "@/lib/applications/statuses";
import { type CampaignType, campaignTypeLabels } from "@/lib/campaigns/campaignTypes";
import { isCampaignClosed } from "@/lib/campaigns/deadline";
import { formatDate } from "@/lib/campaigns/format";
import { textLink } from "@/components/ui/styles";

type ApplicationListItem = {
  status: ApplicationStatus;
  created_at: string;
  campaign: {
    id: string;
    type: CampaignType;
    title: string;
    deadline: string | null;
    brand: { name: string };
  };
};

// The athlete's own applications on their dashboard. Each row links to its campaign (public).
export default function ApplicationList({ applications }: { applications: ApplicationListItem[] }) {
  if (applications.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        You haven&apos;t applied to any campaigns yet.{" "}
        <Link href="/campaigns" className={textLink}>
          Browse campaigns
        </Link>
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {applications.map(({ status, created_at, campaign }) => (
        <li
          key={campaign.id}
          className="flex flex-col gap-1 rounded-button border border-foreground/15 px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <Link
              href={`/campaigns/${campaign.id}`}
              className={`${textLink} font-medium break-words`}
            >
              {campaign.title}
            </Link>
            <span className="shrink-0 text-xs tracking-wide text-foreground/70 uppercase">
              <span className="sr-only">Status: </span>
              {applicationStatusLabels[status]}
            </span>
          </div>
          <p className="text-sm break-words text-foreground/70">{campaign.brand.name}</p>
          <p className="text-xs tracking-wide text-foreground/70 uppercase">
            {campaignTypeLabels[campaign.type]}
            {isCampaignClosed(campaign.deadline) && (
              <>
                {" "}
                <span className="rounded-button border border-foreground/30 px-1.5 py-0.5 align-middle text-foreground/70">
                  <span className="sr-only">Applications </span>Closed
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-sm text-foreground/70">Applied {formatDate(created_at)}</p>
        </li>
      ))}
    </ul>
  );
}
