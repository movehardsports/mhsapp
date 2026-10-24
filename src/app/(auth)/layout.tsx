import PageMain from "@/components/ui/PageMain";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <PageMain width="narrow">{children}</PageMain>;
}
