// Shared types + next-run math for recurring scheduled scans.
// All scheduling is computed in UTC so it's independent of server timezone.

export type ScanScannerType = "nmap" | "nuclei" | "zap";
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  /** Hour of day to run, 0–23 UTC. */
  hourUTC: number;
  /** Minute of hour, 0–59 UTC. Defaults to 0. */
  minuteUTC?: number;
  /** 0 (Sun) – 6 (Sat). Required for weekly. */
  dayOfWeek?: number;
  /** 1–28 (capped to avoid month-length edge cases). Required for monthly. */
  dayOfMonth?: number;
}

export const FREQUENCIES: ScheduleFrequency[] = ["daily", "weekly", "monthly"];

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Validate a schedule config, returning an error string or null if valid. */
export function validateSchedule(cfg: Partial<ScheduleConfig>): string | null {
  if (!cfg.frequency || !FREQUENCIES.includes(cfg.frequency)) {
    return "frequency must be daily, weekly, or monthly";
  }
  if (
    typeof cfg.hourUTC !== "number" ||
    cfg.hourUTC < 0 ||
    cfg.hourUTC > 23
  ) {
    return "hourUTC must be between 0 and 23";
  }
  if (
    cfg.minuteUTC !== undefined &&
    (typeof cfg.minuteUTC !== "number" || cfg.minuteUTC < 0 || cfg.minuteUTC > 59)
  ) {
    return "minuteUTC must be between 0 and 59";
  }
  if (cfg.frequency === "weekly") {
    if (
      typeof cfg.dayOfWeek !== "number" ||
      cfg.dayOfWeek < 0 ||
      cfg.dayOfWeek > 6
    ) {
      return "dayOfWeek (0–6) is required for weekly schedules";
    }
  }
  if (cfg.frequency === "monthly") {
    if (
      typeof cfg.dayOfMonth !== "number" ||
      cfg.dayOfMonth < 1 ||
      cfg.dayOfMonth > 28
    ) {
      return "dayOfMonth (1–28) is required for monthly schedules";
    }
  }
  return null;
}

/**
 * Compute the next run time strictly after `from` (default: now) that matches
 * the cadence. Always returns a Date in the future relative to `from`.
 */
export function computeNextRun(cfg: ScheduleConfig, from: Date = new Date()): Date {
  const hour = cfg.hourUTC;
  const minute = cfg.minuteUTC ?? 0;

  const atTime = (d: Date): Date => {
    const c = new Date(d);
    c.setUTCHours(hour, minute, 0, 0);
    return c;
  };

  if (cfg.frequency === "daily") {
    let next = atTime(from);
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (cfg.frequency === "weekly") {
    const targetDow = cfg.dayOfWeek ?? 0;
    let next = atTime(from);
    let delta = (targetDow - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + delta);
    if (next <= from) next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  // monthly
  const targetDom = Math.min(cfg.dayOfMonth ?? 1, 28);
  let next = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), targetDom, hour, minute, 0, 0),
  );
  if (next <= from) {
    next = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth() + 1,
        targetDom,
        hour,
        minute,
        0,
        0,
      ),
    );
  }
  return next;
}

/** Human-readable cadence summary for the UI, e.g. "Weekly on Monday at 14:00 UTC". */
export function describeSchedule(cfg: ScheduleConfig): string {
  const time = `${String(cfg.hourUTC).padStart(2, "0")}:${String(
    cfg.minuteUTC ?? 0,
  ).padStart(2, "0")} UTC`;
  if (cfg.frequency === "daily") return `Daily at ${time}`;
  if (cfg.frequency === "weekly") {
    return `Weekly on ${WEEKDAY_LABELS[cfg.dayOfWeek ?? 0]} at ${time}`;
  }
  const dom = cfg.dayOfMonth ?? 1;
  const suffix =
    dom % 10 === 1 && dom !== 11
      ? "st"
      : dom % 10 === 2 && dom !== 12
        ? "nd"
        : dom % 10 === 3 && dom !== 13
          ? "rd"
          : "th";
  return `Monthly on the ${dom}${suffix} at ${time}`;
}
