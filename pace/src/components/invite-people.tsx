"use client";

import { useEffect, useRef, useState } from "react";
import { paceInvitePersonAction, paceSearchProfilesAction } from "@/app/actions/muster";

export function InvitePeople({ planId }: { planId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; displayName: string }>>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const matches = await paceSearchProfilesAction(planId, query);
      setResults(matches);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, planId]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
    }
  }

  async function invite(profileId: string) {
    setPendingId(profileId);
    setError(null);
    const result = await paceInvitePersonAction(planId, profileId);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInvitedIds((prev) => new Set(prev).add(profileId));
  }

  return (
    <div className="invite-people">
      <p className="muster-kicker">Invite people</p>
      <input
        type="text"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        placeholder="Search by display name"
        autoComplete="off"
      />
      {error ? <p className="form-error">{error}</p> : null}
      {results.length > 0 ? (
        <ul className="invite-people-results">
          {results.map((person) => (
            <li key={person.id}>
              <span>{person.displayName}</span>
              {invitedIds.has(person.id) ? (
                <span className="invite-people-sent">Invited</span>
              ) : (
                <button type="button" onClick={() => invite(person.id)} disabled={pendingId === person.id}>
                  {pendingId === person.id ? "Inviting…" : "Invite"}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 ? (
        <p className="field-hint">No matches yet — try their exact display name.</p>
      ) : null}
    </div>
  );
}
