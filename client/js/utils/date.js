/** 로컬 달력 기준 YYYY-MM-DD */
export function getDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
