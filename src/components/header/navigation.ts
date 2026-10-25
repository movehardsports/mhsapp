type NavLink = { href: string; label: string };

export const exploreLinks: NavLink[] = [
  { href: "/explore/athletes", label: "Athletes" },
  { href: "/explore/brands", label: "Brands" },
];

// Its own top-level item, first in the navigation, before Explore.
export const campaignsLink: NavLink = { href: "/campaigns", label: "Campaigns" };

export const navLinks: NavLink[] = [
  { href: "/events", label: "Events" },
  { href: "/athletes", label: "For Athletes" },
  { href: "/brands", label: "For Brands" },
];

export const signInLink: NavLink = { href: "/sign-in", label: "Sign in" };
export const signUpLink: NavLink = { href: "/sign-up", label: "Sign up" };
// For accounts whose confirmation email got lost or whose link expired.
export const resendConfirmationLink: NavLink = {
  href: "/sign-up/resend",
  label: "Send a new confirmation link",
};
export const dashboardLink: NavLink = { href: "/dashboard", label: "Dashboard" };
