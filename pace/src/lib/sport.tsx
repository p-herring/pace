import { Bike, Footprints, Waves, type LucideIcon } from "lucide-react";

export type Sport = "run" | "ride" | "swim";

interface SportMeta {
  label: string;
  Icon: LucideIcon;
  /** Literal hex — for contexts that can't read CSS variables (Leaflet paths, etc). */
  hex: string;
}

/**
 * The one place sport → label/icon/colour is decided. Components should
 * read from here (or use the `.sport-rail`/`.sport-label` CSS classes
 * with a `run`/`ride`/`swim` modifier) rather than hardcoding a colour —
 * that's what let run/ride/swim drift out of sync with the design tokens
 * before this redesign.
 */
export const SPORT: Record<Sport, SportMeta> = {
  run: { label: "Run", Icon: Footprints, hex: "#DC6A42" },
  ride: { label: "Ride", Icon: Bike, hex: "#397DAD" },
  swim: { label: "Swim", Icon: Waves, hex: "#277F86" },
};

export const SPORT_ORDER: Sport[] = ["run", "ride", "swim"];
