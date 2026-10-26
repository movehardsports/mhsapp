import ReviewApplication from "@/components/applications/ReviewApplication";
import { type ApplicationStatus, applicationStatusLabels } from "@/lib/applications/statuses";
import { formatDate } from "@/lib/campaigns/format";
import { type Sport, sportLabels } from "@/lib/sports";

type ApplicantListItem = {
  id: string;
  status: ApplicationStatus;
  message: string;
  created_at: string;
  athlete: {
    first_name: string;
    nickname: string;
    birth_year: number;
    city: string;
    sports: Sport[];
  };
};

// The applications to a brand's campaign: each applicant's public profile, their message and
// the status, with controls to accept or reject. The last name and contact details are never
// shown here (owner-only / collaboration-only).
export default function ApplicantList({
  campaignId,
  applications,
}: {
  campaignId: string;
  applications: ApplicantListItem[];
}) {
  if (applications.length === 0) {
    return <p className="text-sm text-foreground/70">No applications yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {applications.map(({ id, status, message, created_at, athlete }) => (
        <li
          key={id}
          className="flex flex-col gap-3 rounded-button border border-foreground/15 px-4 py-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium break-words">
              {athlete.first_name} “{athlete.nickname}”
            </p>
            <span className="shrink-0 text-xs tracking-wide text-foreground/70 uppercase">
              <span className="sr-only">Status: </span>
              {applicationStatusLabels[status]}
            </span>
          </div>
          <p className="text-sm text-foreground/70">
            {athlete.city} · Born {athlete.birth_year} ·{" "}
            {athlete.sports.map((sport) => sportLabels[sport]).join(", ")}
          </p>
          <p className="text-sm break-words whitespace-pre-line">{message}</p>
          <p className="text-xs text-foreground/70">Applied {formatDate(created_at)}</p>
          <ReviewApplication
            campaignId={campaignId}
            applicationId={id}
            applicantName={athlete.nickname}
            status={status}
          />
        </li>
      ))}
    </ul>
  );
}
