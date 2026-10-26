import { reviewApplication } from "@/app/dashboard/campaigns/[id]/applications/actions";
import SubmitButton from "@/components/forms/SubmitButton";
import { secondaryButton } from "@/components/ui/styles";
import type { ApplicationStatus } from "@/lib/applications/statuses";

// The status controls for one application: a button for each status other than the current one,
// so a brand can accept, reject or change its mind. Plain forms, so they work before hydration.
export default function ReviewApplication({
  campaignId,
  applicationId,
  applicantName,
  status,
}: {
  campaignId: string;
  applicationId: string;
  applicantName: string;
  status: ApplicationStatus;
}) {
  const targets: ApplicationStatus[] = (["accepted", "rejected", "pending"] as const).filter(
    (target) => target !== status
  );
  // What each button does, read aloud with the applicant it belongs to.
  const verb: Record<ApplicationStatus, string> = {
    accepted: "Accept",
    rejected: "Reject",
    pending: "Reset to pending",
  };

  return (
    <div className="flex flex-wrap gap-3">
      {targets.map((target) => (
        <form key={target} action={reviewApplication.bind(null, campaignId, applicationId, target)}>
          <SubmitButton
            pendingLabel={`${verb[target]}…`}
            className={`${secondaryButton} px-3 py-1.5 text-xs tracking-wide uppercase`}
          >
            {verb[target]}
            <span className="sr-only"> {applicantName}&rsquo;s application</span>
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}
