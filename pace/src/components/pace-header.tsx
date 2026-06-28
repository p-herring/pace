"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { paceSignOutAction } from "@/app/actions/pace";

/** Shared navigation for signed-in product screens. */
export function PaceHeader() {
  const pathname = usePathname();
  const onPlans = pathname === "/pace";
  const onForum = pathname?.startsWith("/pace/forum");
  const onProfile = pathname?.startsWith("/pace/profile");
  const onAccount = pathname?.startsWith("/pace/account");

  return (
    <header className="pace-inner-header">
      <Link href="/pace" className="pace-logo" aria-label="Pace plans">
        pace<span>.</span>
      </Link>
      <nav aria-label="Pace navigation" className="pace-inner-nav">
        <Link href="/pace" aria-current={onPlans ? "page" : undefined}>
          Plans
        </Link>
        <Link href="/pace/forum" aria-current={onForum ? "page" : undefined}>
          Forum
        </Link>
        <Link href="/pace/profile" aria-current={onProfile ? "page" : undefined}>
          Profile
        </Link>
        <Link href="/pace/account" aria-current={onAccount ? "page" : undefined}>
          Account
        </Link>
        <form action={paceSignOutAction}>
          <button type="submit">Sign out</button>
        </form>
        <Link href="/pace/new" className="pace-primary">
          Post a plan
        </Link>
      </nav>
    </header>
  );
}
