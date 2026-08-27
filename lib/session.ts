const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function toIstParts(ms: number) {
  const d = new Date(ms + IST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
    day: d.getUTCDay(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

export function istDateKey(ms: number) {
  const p = toIstParts(ms);
  const mm = String(p.month + 1).padStart(2, "0");
  const dd = String(p.date).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

/** IST week id = Monday date of that week. */
export function istWeekKey(ms: number) {
  return istDateKey(weekOpenUtc(ms));
}

export function istMonthKey(ms: number) {
  const p = toIstParts(ms);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}`;
}

export function istWallToUtc(year: number, month: number, date: number, hours: number, minutes: number) {
  return Date.UTC(year, month, date, hours, minutes) - IST_OFFSET_MS;
}

export function sessionOpenUtc(ms: number) {
  const p = toIstParts(ms);
  return istWallToUtc(p.year, p.month, p.date, 9, 15);
}

export function weekOpenUtc(ms: number) {
  const p = toIstParts(ms);
  const mondayOffset = (p.day + 6) % 7;
  const monday = new Date(Date.UTC(p.year, p.month, p.date) - mondayOffset * 86400000);
  return istWallToUtc(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 9, 15);
}

export function isWeekendIst(ms: number) {
  const day = toIstParts(ms).day;
  return day === 0 || day === 6;
}

export function previousSessionMs(ms: number) {
  let t = ms - 86400000;
  while (isWeekendIst(t)) t -= 86400000;
  return t;
}

export function formatIstClock(ms: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(ms);
}

export function sessionStatus(ms: number) {
  const p = toIstParts(ms);
  if (p.day === 0 || p.day === 6) return "weekend";
  const mins = p.hours * 60 + p.minutes;
  if (mins < 9 * 60 + 15) return "preopen";
  if (mins >= 15 * 60 + 30) return "closed";
  return "live";
}

export type PlayWindowId = "opening" | "lunch" | "closing" | "active" | "closed";

export type PlayWindow = {
  id: PlayWindowId;
  veto: boolean;
  allowTrend: boolean;
  label: string;
};

export function playWindow(ms: number): PlayWindow {
  const p = toIstParts(ms);
  if (p.day === 0 || p.day === 6) {
    return { id: "closed", veto: true, allowTrend: false, label: "Weekend — no cash session" };
  }
  const mins = p.hours * 60 + p.minutes;
  if (mins < 9 * 60 + 15 || mins >= 15 * 60 + 30) {
    return { id: "closed", veto: true, allowTrend: false, label: "Cash market closed" };
  }
  if (mins < 9 * 60 + 30) {
    return { id: "opening", veto: true, allowTrend: false, label: "Opening 15m — skip auction noise" };
  }
  if (mins >= 12 * 60 && mins < 13 * 60 + 15) {
    return { id: "lunch", veto: true, allowTrend: true, label: "Lunch 12:00–13:15 IST" };
  }
  if (mins >= 15 * 60 + 15) {
    return { id: "closing", veto: true, allowTrend: true, label: "Last 15m of the cash session" };
  }
  return { id: "active", veto: false, allowTrend: false, label: "Cash session" };
}

export function sessionVetoReason(
  window: PlayWindow,
  vwapTrend: "rising" | "falling" | "flat",
  choppy: boolean,
): string | null {
  if (!window.veto) return null;
  const trending = (vwapTrend === "rising" || vwapTrend === "falling") && !choppy;
  if (window.allowTrend && trending) return null;
  if (window.allowTrend) {
    return `${window.label} — skip unless session VWAP is already trending cleanly.`;
  }
  return `${window.label}.`;
}
