// The page's <main>: centred, with the app's standard padding. "narrow" suits short pages (auth,
// the dashboard, errors), "form" forms with tag pickers, "wide" lists and campaign pages.
const widths = {
  narrow: "max-w-sm lg:max-w-lg",
  form: "max-w-sm lg:max-w-xl",
  wide: "max-w-3xl",
};

export default function PageMain({
  width,
  children,
}: {
  width: keyof typeof widths;
  children: React.ReactNode;
}) {
  return <main className={`mx-auto w-full ${widths[width]} px-4 py-16`}>{children}</main>;
}
