// ─── Shared date utilities ────────────────────────────────────────────────────
// Used by entries.tsx and reports.tsx

export const startOfDay = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

export const endOfDay = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
};

/** Returns "YYYY-MM-DD" in local time (avoids UTC-3 bug). */
export const dateKey = (d: Date): string => d.toLocaleDateString('en-CA');

/** Monday of the current week (local time). */
export const getThisMonday = (): Date => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return startOfDay(monday);
};

/** First day of the current month at 00:00. */
export const getFirstOfMonth = (): Date => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

/** Formats a Date as "DD/MM/YYYY". */
export const formatDateBR = (d: Date): string => {
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
};
