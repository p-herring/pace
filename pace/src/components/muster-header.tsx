"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { paceSignOutAction } from "@/app/actions/muster";

/** Shared navigation for signed-in product screens. */
export function MusterHeader() {
  const pathname = usePathname();
  const onPlans = pathname === "/muster";
  const onForum = pathname?.startsWith("/muster/forum");
  const onProfile = pathname?.startsWith("/muster/profile");
  const onAccount = pathname?.startsWith("/muster/account");

  return (
    <header className="muster-inner-header">
      <Link href="/muster" className="muster-logo" aria-label="Muster plans">
        pace<span>.</span>
      </Link>
      <nav aria-label="Muster navigation" className="muster-inner-nav">
        <Link href="/muster" aria-current={onPlans ? "page" : undefined}>
          Plans
        </Link>
        <Link href="/muster/forum" aria-current={onForum ? "page" : undefined}>
          Forum
        </Link>
        <Link href="/muster/profile" aria-current={onProfile ? "page" : undefined}>
          Profile
        </Link>
        <Link href="/muster/account" aria-current={onAccount ? "page" : undefined}>
          Account
        </Link>
        <form action={paceSignOutAction}>
          <button type="submit">Sign out</button>
        </form>
        <Link href="/muster/new" className="muster-primary">
          Post a plan
        </Link>
      </nav>
    </header>
  );
}
