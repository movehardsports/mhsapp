export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">{children}</main>;
}
