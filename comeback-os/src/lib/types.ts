export type MetricTrend = "up" | "down" | "flat";
export type MetricKind =
  | "bodyweight"
  | "lift"
  | "running_threshold"
  | "ftp"
  | "css"
  | "custom";

export interface PlannedWorkout {
  id: string;
  date: string;
  title: string;
  source: "trainingpeaks" | "coros" | "manual";
  sport: string;
  duration: string;
  intensity: string;
}

export interface ActivitySummary {
  sessions: number;
  hours: number;
  distanceKm: number;
  elevationM: number;
  source: "strava" | "coros" | "manual";
}

export interface MetricSnapshot {
  id: string;
  label: string;
  kind: MetricKind;
  value: string;
  delta: string;
  trend: MetricTrend;
  since: string;
}

export interface DailyWellness {
  date: string;
  waterLitres: number;
  waterTargetLitres: number;
  caloriesHit: boolean;
  readiness: number;
  sleepHours?: number;
  sleepSource?: "coros" | "manual";
  hrvMs?: number;
  restingHeartRate?: number;
  painFlag?: string;
}

export interface ProgressPhoto {
  id: string;
  url: string;
  caption: string;
  date: string;
}

export interface ComebackDashboardData {
  athleteName: string;
  eventFocus: string;
  eventDate: string;
  weekNumber: number;
  plannedWorkouts: PlannedWorkout[];
  activitySummary: ActivitySummary;
  metrics: MetricSnapshot[];
  wellness: DailyWellness;
  photos: ProgressPhoto[];
  nextActions: string[];
}
