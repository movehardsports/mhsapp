// Wider than the auth pages: the sports tags need the room.
export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-xl">{children}</main>;
}
