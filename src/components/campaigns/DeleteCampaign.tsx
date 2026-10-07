import { deleteCampaign } from "@/app/dashboard/campaigns/actions";
import SubmitButton from "@/components/forms/SubmitButton";

// Deletes the campaign straight away, without asking to confirm. A form, so it works before
// hydration too.
export default function DeleteCampaign({
  campaignId,
  label,
  className = "",
}: {
  campaignId: string;
  // Text, or text plus a visually hidden part naming the campaign, as in the dashboard list.
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={deleteCampaign.bind(null, campaignId)} className={className}>
      <SubmitButton className="cursor-pointer text-sm font-medium text-red-600 underline-offset-4 hover:underline dark:text-red-400">
        {label}
      </SubmitButton>
    </form>
  );
}
