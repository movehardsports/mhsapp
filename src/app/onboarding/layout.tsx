import PageMain from "@/components/ui/PageMain";

// Wider than the auth pages: the sports tags need the room.
export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return <PageMain width="form">{children}</PageMain>;
}
