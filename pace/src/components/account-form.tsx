"use client";

import { useActionState } from "react";
import { paceUpdateProfileAction } from "@/app/actions/pace";
import { LocationPicker, type LocationValue } from "@/components/location-picker";

const sportLabels: Record<string, string> = { run: "Run", ride: "Ride", swim: "Swim" };

export function AccountForm({
  displayName,
  bio,
  mySports,
  isPrivate,
  initialLocation,
}: {
  displayName: string;
  bio: string;
  mySports: Set<string>;
  isPrivate: boolean;
  initialLocation?: LocationValue;
}) {
  const [state, formAction] = useActionState(paceUpdateProfileAction, {});

  return (
    <form action={formAction} className="account-card account-form">
      <div className="account-form-heading"><p className="pace-kicker">Profile details</p><h2>Make your profile yours.</h2><p>These details help people recognise you and see plans that fit.</p></div>
      {state?.error && <p className="form-error">{state.error}</p>}

      <label>
        Display name
        <input name="displayName" required maxLength={40} defaultValue={displayName} />
      </label>

      <LocationPicker
        name="suburb"
        fieldLabel="Suburb"
        placeholder="Start typing a suburb, e.g. South Perth"
        helpText="Used to show plans near you."
        initialValue={initialLocation}
      />

      <label>
        Bio (optional)
        <textarea name="bio" rows={3} maxLength={280} defaultValue={bio} placeholder="A line about how you like to move." />
      </label>

      <fieldset className="account-fieldset">
        <legend>Sports</legend>
        <div className="account-sport-checks">
          {(["run", "ride", "swim"] as const).map((sport) => (
            <label className="check" key={sport}>
              <input name={sport} type="checkbox" defaultChecked={mySports.has(sport)} /> {sportLabels[sport]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="account-fieldset">
        <legend>Profile visibility</legend>
        <label className="visibility-option">
          <input name="visibility" type="radio" value="public" defaultChecked={!isPrivate} /><span><strong>Public profile</strong><small>Other members can see your name and sports.</small></span>
        </label>
        <label className="visibility-option">
          <input name="visibility" type="radio" value="private" defaultChecked={isPrivate} /><span><strong>Private profile</strong><small>Keep your profile out of member discovery.</small></span>
        </label>
      </fieldset>

      <button className="pace-primary" type="submit">
        Save changes
      </button>
    </form>
  );
}
