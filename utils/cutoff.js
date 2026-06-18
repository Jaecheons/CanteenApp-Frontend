// utils/cutoff.js
const CUTOFF_TIMES = {
  Breakfast: { hour: 8, minute: 30 },
  Lunch: { hour: 10, minute: 30 },
  'Evening Snacks': { hour: 15, minute: 0 },
  Dinner: { hour: 17, minute: 0 },
};

export function isCutoffPassed(mealType, fromDate) {
  const now = new Date();
  const selected = new Date(fromDate);

  const isToday =
    selected.getFullYear() === now.getFullYear() &&
    selected.getMonth() === now.getMonth() &&
    selected.getDate() === now.getDate();

  if (!isToday) return false;

  const cutoff = CUTOFF_TIMES[mealType];
  if (!cutoff) return false;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoff.hour, cutoff.minute, 0, 0);

  return now > cutoffDate;
}