import Link from "next/link";

/** Keeps the Pace identity and a safe exit visible on compact auth screens. */
export function PaceAuthBrand() {
  return (
    <Link href="/" className="pace-logo pace-auth-logo" aria-label="Pace home">
      pace<span>.</span>
    </Link>
  );
}
