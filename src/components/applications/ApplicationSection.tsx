import Link from "next/link";
import { applyToCampaign, withdrawApplication } from "@/app/campaigns/[id]/actions";
import ApplicationForm from "@/components/applications/ApplicationForm";
import SectionHeading from "@/components/applications/SectionHeading";
import WithdrawApplication from "@/components/applications/WithdrawApplication";
import { signInLink, signUpLink } from "@/components/header/navigation";
import { textLink } from "@/components/ui/styles";
import { type ApplicationStatus, applicationStatusLabels } from "@/lib/applications/statuses";
import { formatDate } from "@/lib/campaigns/format";

// Who is looking at the campaign, as far as applying goes.
export type Applicant =
  | { kind: "guest" }
  | { kind: "brand" }
  | { kind: "athlete-onboarding" }
  | {
      kind: "athlete";
      application: { status: ApplicationStatus; message: string; created_at: string } | null;
    };

// The part of a campaign page about applying: the form, the athlete's application, or what a
// visitor needs to do first.
export default function ApplicationSection({
  campaignId,
  closed,
  applicant,
}: {
  campaignId: string;
  closed: boolean;
  applicant: Applicant;
}) {
  // Brands don't apply; the closed notice above already tells everyone else.
  if (applicant.kind === "brand") return null;
  if (applicant.kind === "athlete" && applicant.application) {
    const { application } = applicant;
    return (
      <Section title="Your application">
        <p className="text-sm">
          You applied on {formatDate(application.created_at)}. Status:{" "}
          <strong>{applicationStatusLabels[application.status]}</strong>
        </p>
        <p className="mt-3 text-sm break-words whitespace-pre-line text-foreground/70">
          {application.message}
        </p>
        {application.status === "pending" && (
          <WithdrawApplication
            action={withdrawApplication.bind(null, campaignId)}
            closed={closed}
          />
        )}
      </Section>
    );
  }
  if (closed) return null;

  return (
    <Section title="Apply">
      {applicant.kind === "guest" && (
        <p className="text-sm text-foreground/70">
          <Link href={signInLink.href} className={textLink}>
            Sign in
          </Link>{" "}
          or{" "}
          <Link href={signUpLink.href} className={textLink}>
            sign up
          </Link>{" "}
          as an athlete to apply.
        </p>
      )}
      {applicant.kind === "athlete-onboarding" && (
        <p className="text-sm text-foreground/70">
          <Link href="/onboarding/athlete" className={textLink}>
            Finish your profile
          </Link>{" "}
          to apply.
        </p>
      )}
      {applicant.kind === "athlete" && (
        <ApplicationForm action={applyToCampaign.bind(null, campaignId)} />
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="apply-heading" className="mt-10 border-t border-foreground/15 pt-6">
      <SectionHeading key={title} id="apply-heading">
        {title}
      </SectionHeading>
      {children}
    </section>
  );
}
