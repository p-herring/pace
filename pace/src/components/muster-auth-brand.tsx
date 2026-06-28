import Link from "next/link";

/** Keeps the Muster identity and a safe exit visible on compact auth screens. */
export function MusterAuthBrand() {
  return (
    <Link href="/" className="muster-logo muster-auth-logo" aria-label="Muster home">
      muster<span>.</span>
    </Link>
  );
}
