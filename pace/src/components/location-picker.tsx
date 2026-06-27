"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

export interface LocationValue {
  label: string;
  latitude: number;
  longitude: number;
}

interface SearchResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

const PinMap = dynamic(() => import("./pin-map"), { ssr: false });

export function LocationPicker({
  name,
  fieldLabel,
  placeholder,
  initialValue,
  initialArea,
  discoveryName,
  precise = false,
  helpText,
  onChange,
}: {
  /** Hidden input names rendered as `${name}`, `${name}Lat`, `${name}Lng`. */
  name: string;
  fieldLabel: string;
  placeholder?: string;
  initialValue?: LocationValue;
  /** A broader label/coordinate used for public discovery while the pin remains private. */
  initialArea?: LocationValue;
  discoveryName?: string;
  /** Show a draggable pin so the person can fine-tune the exact point. */
  precise?: boolean;
  helpText?: string;
  /** Notified whenever the picked location changes (including being cleared). */
  onChange?: (value: LocationValue | null) => void;
}) {
  const [query, setQuery] = useState(initialValue?.label ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<LocationValue | null>(initialValue ?? null);
  const [area, setArea] = useState<LocationValue | null>(initialArea ?? initialValue ?? null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChange?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (selected || query.trim().length < 3) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 3) {
      setResults([]);
      setOpen(false);
    }
  }

  function choose(result: SearchResult) {
    const value = { label: result.displayName, latitude: result.latitude, longitude: result.longitude };
    setSelected(value);
    setArea(value);
    setQuery(result.displayName);
    setOpen(false);
    setResults([]);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  async function movePin(latitude: number, longitude: number) {
    if (!selected) return;
    // The pin is authoritative once dragged — update the label to match its new
    // position rather than leaving the old search-result text in place.
    setSelected({ ...selected, latitude, longitude, label: "Finding address…" });
    setQuery("Finding address…");
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await response.json();
      const label = data.label ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setSelected({ label, latitude, longitude });
      setQuery(label);
    } catch {
      const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setSelected({ label, latitude, longitude });
      setQuery(label);
    }
  }

  return (
    <div className="location-picker">
      <label>
        {fieldLabel}
        <div className="location-picker-input">
          <input
            type="text"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
          />
          {selected ? (
            <button type="button" className="location-picker-clear" onClick={clear} aria-label="Clear location">
              Change
            </button>
          ) : null}
        </div>
      </label>

      {helpText ? <p className="location-picker-hint">{helpText}</p> : null}

      {open && !selected ? (
        <div className="location-picker-results">
          {searching ? <p className="location-picker-status">Searching…</p> : null}
          {!searching && results.length === 0 && query.trim().length >= 3 ? (
            <p className="location-picker-status">No matches yet — try a more specific suburb or landmark.</p>
          ) : null}
          {results.map((result) => (
            <button
              key={`${result.latitude}-${result.longitude}`}
              type="button"
              className="location-picker-result"
              onClick={() => choose(result)}
            >
              {result.displayName}
            </button>
          ))}
        </div>
      ) : null}

      {selected && precise ? (
        <div className="location-picker-map">
          <PinMap latitude={selected.latitude} longitude={selected.longitude} onMove={movePin} />
          <p className="location-picker-hint">Drag the pin if it’s not quite right · Ctrl/Cmd + scroll to zoom the map.</p>
        </div>
      ) : null}

      <input type="hidden" name={name} value={selected?.label ?? ""} />
      <input type="hidden" name={`${name}Lat`} value={selected?.latitude ?? ""} />
      <input type="hidden" name={`${name}Lng`} value={selected?.longitude ?? ""} />
      {discoveryName ? <><input type="hidden" name={discoveryName} value={area?.label ?? ""} /><input type="hidden" name={`${discoveryName}Lat`} value={area?.latitude ?? ""} /><input type="hidden" name={`${discoveryName}Lng`} value={area?.longitude ?? ""} /></> : null}
    </div>
  );
}
