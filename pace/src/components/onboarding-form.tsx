"use client";

import Link from "next/link";
import { useActionState } from "react";
import { paceSaveOnboardingAction } from "@/app/actions/pace";
import { LocationPicker } from "@/components/location-picker";

export function OnboardingForm({ displayName }: { displayName: string }) {
  const [state, formAction] = useActionState(paceSaveOnboardingAction, {});

  return (
    <form action={formAction}>
      <p className="pace-kicker">Profile setup</p>
      <h1>Set your starting line.</h1>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Display name
        <input name="displayName" required maxLength={40} defaultValue={displayName} />
      </label>
      <LocationPicker
        name="suburb"
        fieldLabel="Suburb"
        placeholder="Start typing a suburb, e.g. South Perth"
        helpText="Used to show plans near you — search and pick your suburb from the list."
      />
      <fieldset>
        <legend>Sports</legend>
        <label className="check">
          <input name="run" type="checkbox" /> Run
        </label>
        <label className="check">
          <input name="ride" type="checkbox" /> Ride
        </label>
        <label className="check">
          <input name="swim" type="checkbox" /> Swim
        </label>
      </fieldset>
      <fieldset className="account-fieldset">
        <legend>Profile visibility</legend>
        <label className="visibility-option">
          <input name="visibility" type="radio" value="public" defaultChecked />
          <span>
            <strong>Public profile</strong>
            <small>Other members can see your name and sports.</small>
          </span>
        </label>
        <label className="visibility-option">
          <input name="visibility" type="radio" value="private" />
          <span>
            <strong>Private profile</strong>
            <small>Keep your profile out of member discovery.</small>
          </span>
        </label>
        <p className="field-hint">
          This just sets your preference for now — there isn’t a member-browsing feature yet for it to apply to.
        </p>
      </fieldset>
      <label className="check">
        <input name="safety" type="checkbox" required />
        <span>I’ll meet only in public places and make my own safety decisions.</span>
      </label>
      <label className="check">
        <input name="terms" type="checkbox" required />
        <span>
          I accept the{" "}
          <Link href="/policies" target="_blank" className="policy-link">
            Pace beta policies
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="policy-link">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <button className="pace-primary" type="submit">
        Enter Pace
      </button>
    </form>
  );
}
