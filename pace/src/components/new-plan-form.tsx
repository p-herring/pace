"use client";

import { useActionState, useState } from "react";
import { paceCreatePlanAction, paceUpdatePlanAction } from "@/app/actions/pace";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { GpxUpload } from "@/components/gpx-upload";
import { SPORT, SPORT_ORDER, type Sport } from "@/lib/sport";
import type { RoutePoint } from "@/components/route-map";

const paceConfig: Record<Sport, { label: string; placeholder: string; hint: string }> = {
  run: { label: "Target pace (min:sec per km)", placeholder: "e.g. 5:30", hint: "Minutes:seconds per kilometre." },
  ride: { label: "Target speed (km/h)", placeholder: "e.g. 28", hint: "Average speed in kilometres per hour." },
  swim: { label: "Target pace (min:sec per 100m)", placeholder: "e.g. 2:10", hint: "Minutes:seconds per 100 metres." },
};

export interface PlanFormInitial {
  planId: string;
  title: string;
  description: string;
  sport: Sport;
  startDate: string;
  startTime: string;
  suburb: LocationValue;
  location: LocationValue;
  distance: number;
  pace: string;
  visibility: "public" | "radius" | "private";
  radiusKm?: number;
  capacityMode: "limited" | "open";
  capacityValue?: number;
  approval: "yes" | "no";
  routePath?: RoutePoint[];
}

export function NewPlanForm({ initial }: { initial?: PlanFormInitial }) {
  const isEdit = Boolean(initial);
  const [sport, setSport] = useState<Sport>(initial?.sport ?? "ride");
  const [visibility, setVisibility] = useState<"public" | "radius" | "private">(initial?.visibility ?? "public");
  const [capacityMode, setCapacityMode] = useState<"limited" | "open">(initial?.capacityMode ?? "limited");
  const [state, formAction] = useActionState(isEdit ? paceUpdatePlanAction : paceCreatePlanAction, {});

  return (
    <form action={formAction}>
      <p className="pace-kicker">{isEdit ? "Edit plan" : "Host a plan"}</p>
      <h1>{isEdit ? "Update the details." : "What are you up for?"}</h1>
      {state?.error && <p className="form-error">{state.error}</p>}
      {isEdit ? <input type="hidden" name="planId" value={initial!.planId} /> : null}

      <div className="form-section">
        <h2 className="form-section-heading">The basics</h2>
        <p className="form-section-sub">What it is, and which sport it&rsquo;s for.</p>

        <label>
          Plan title
          <input name="title" placeholder="Golden hour river ride" defaultValue={initial?.title} required />
        </label>

        <label>
          Description (optional)
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={initial?.description}
            placeholder="Anything people should know — meeting routine, what to bring, group pace expectations."
          />
        </label>

        <label>Sport</label>
        <input type="hidden" name="sport" value={sport} />
        <div className="form-grid">
          {SPORT_ORDER.map((value) => {
            const { Icon, label } = SPORT[value];
            return (
              <button
                key={value}
                type="button"
                className="option-card"
                aria-pressed={sport === value}
                onClick={() => setSport(value)}
                style={sport === value ? { borderColor: "var(--pace-primary)", background: "var(--pace-run-tint)" } : undefined}
              >
                <Icon className="h-4 w-4" style={{ marginTop: 2, color: `var(--pace-${value})` }} />
                <strong>{label}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-heading">When</h2>
        <div className="form-grid-2">
          <label>
            Start date
            <input name="startDate" type="date" defaultValue={initial?.startDate} required />
          </label>
          <label>
            Start time
            <input name="startTime" type="time" defaultValue={initial?.startTime} required />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-heading">Where</h2>
        <p className="form-section-sub">The exact pin only shows once someone joins.</p>

        <LocationPicker
          name="location"
          fieldLabel="Meeting area"
          placeholder="Search an area or landmark, e.g. South Perth Foreshore"
          helpText="Choose the area, then drag the pin to the exact public meeting point."
          initialValue={initial?.location}
          initialArea={initial?.suburb}
          discoveryName="suburb"
          precise
        />

        <label className="check">
          <input name="publicPlace" type="checkbox" defaultChecked={isEdit} required /> This is a public meeting place, not a home address.
        </label>

        <GpxUpload initialPath={initial?.routePath} />
      </div>

      <div className="form-section">
        <h2 className="form-section-heading">Pace &amp; distance</h2>
        <div className="form-grid-2">
          <label>
            Distance (km)
            <input
              id="plan-distance-input"
              name="distance"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="e.g. 8"
              defaultValue={initial?.distance}
              required
            />
          </label>
          <label>
            {paceConfig[sport].label}
            <input name="pace" placeholder={paceConfig[sport].placeholder} defaultValue={initial?.pace} required />
            <span className="field-hint">{paceConfig[sport].hint}</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-heading">Who can join</h2>

        <fieldset className="account-fieldset">
          <legend>Visibility</legend>
          <label className="visibility-option">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <span>
              <strong>Public</strong>
              <small>Anyone can find and join this plan.</small>
            </span>
          </label>
          <label className="visibility-option">
            <input
              type="radio"
              name="visibility"
              value="radius"
              checked={visibility === "radius"}
              onChange={() => setVisibility("radius")}
            />
            <span>
              <strong>Public within a radius</strong>
              <small>Only people near a set distance can find it.</small>
            </span>
          </label>
          <label className="visibility-option">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            <span>
              <strong>Private</strong>
              <small>Invite-only — nobody can discover or join on their own.</small>
            </span>
          </label>
        </fieldset>

        {visibility === "radius" ? (
          <label>
            Discovery radius (km)
            <input name="radiusKm" type="number" min="1" max="100" defaultValue={initial?.radiusKm ?? 10} required />
            <span className="field-hint">Only members within this distance of their own saved location will see the plan.</span>
          </label>
        ) : null}

        <fieldset className="account-fieldset">
          <legend>People joining</legend>
          <label className="visibility-option">
            <input
              type="radio"
              name="capacityMode"
              value="limited"
              checked={capacityMode === "limited"}
              onChange={() => setCapacityMode("limited")}
            />
            <span>
              <strong>Limited spots</strong>
              <small>Set a maximum number of people who can join.</small>
            </span>
          </label>
          <label className="visibility-option">
            <input
              type="radio"
              name="capacityMode"
              value="open"
              checked={capacityMode === "open"}
              onChange={() => setCapacityMode("open")}
            />
            <span>
              <strong>Open</strong>
              <small>No limit — anyone can join, up to 100.</small>
            </span>
          </label>
          {capacityMode === "limited" ? (
            <label>
              Maximum people
              <input name="capacityValue" type="number" min="1" max="100" defaultValue={initial?.capacityValue ?? 6} required />
            </label>
          ) : null}
        </fieldset>

        <fieldset className="account-fieldset">
          <legend>Join setting</legend>
          <label className="visibility-option">
            <input type="radio" name="approval" value="no" defaultChecked={(initial?.approval ?? "no") === "no"} />
            <span>
              <strong>Instant join</strong>
              <small>People join immediately, no approval needed.</small>
            </span>
          </label>
          <label className="visibility-option">
            <input type="radio" name="approval" value="yes" defaultChecked={initial?.approval === "yes"} />
            <span>
              <strong>Approve requests</strong>
              <small>You review and accept each request to join.</small>
            </span>
          </label>
        </fieldset>
      </div>

      <button className="pace-primary" type="submit">
        {isEdit ? "Save changes" : "Post plan"}
      </button>
    </form>
  );
}
