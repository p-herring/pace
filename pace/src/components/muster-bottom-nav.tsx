"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Plus, Calendar, User } from "lucide-react";

const AUTH_ROUTES = ["/muster/sign-in", "/muster/sign-up", "/muster/forgot-password", "/muster/check-email", "/muster/update-password", "/muster/onboarding"];

export function MusterBottomNav() {
  const pathname = usePathname();

  // Hide on auth and onboarding screens
  if (AUTH_ROUTES.some((r) => pathname?.startsWith(r))) return null;

  const onFeed = pathname === "/muster";
  const onProfile = pathname?.startsWith("/muster/profile");
  const onNew = pathname === "/muster/new";

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <Link
        href="/muster"
        className="app-nav-item"
        aria-current={onFeed ? "page" : undefined}
        aria-label="Feed"
      >
        <Grid2X2 />
        <span>Feed</span>
      </Link>

      <Link
        href="/muster/new"
        className="app-nav-post"
        aria-current={onNew ? "page" : undefined}
        aria-label="Post a plan"
      >
        <div className="app-nav-post-icon">
          <Plus />
        </div>
        <span>Post</span>
      </Link>

      <Link
        href="/muster/profile"
        className="app-nav-item"
        aria-current={onProfile ? "page" : undefined}
        aria-label="Profile"
      >
        <User />
        <span>Profile</span>
      </Link>
    </nav>
  );
}
