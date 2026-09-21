// A practice day does not begin at midnight. It begins at an hour the reader
// picks -- 2 AM by default -- so a sitting finished at 11:44 PM and one finished
// at 12:15 AM belong to the same day rather than to two. Under a midnight
// boundary somebody who sits last thing at night loses a day every time they
// drift past twelve, which records a break in a practice that did not break.
//
// Everything downstream works in day indices, whole days counted from the epoch,
// so adjacency is `b===a+1` and cannot be got wrong by a timezone.
const MS_PER_DAY=86400000;
export const DEFAULT_BOUNDARY_HOUR=2;
// Midnight through 6 AM and no further: past that a day stops meaning what the
// word means to the person reading it.
export const BOUNDARY_HOURS=[0,1,2,3,4,5,6];
export const clampBoundaryHour=hour=>Number.isFinite(hour)?Math.min(6,Math.max(0,Math.trunc(hour))):DEFAULT_BOUNDARY_HOUR;
// Shifting backwards by the boundary does the work: at 2 AM, 12:15 AM Tuesday
// becomes 10:15 PM Monday. The shift is in wall-clock terms and the index is
// built from the resulting calendar parts, so a DST change moves the boundary
// with the clock instead of sliding the day by an hour.
export function practiceDayIndex(at,boundaryHour){
  const d=new Date(at);
  d.setHours(d.getHours()-clampBoundaryHour(boundaryHour));
  return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/MS_PER_DAY);
}
export const dayIndexForCalendarDate=(y,m,d)=>Math.floor(Date.UTC(y,m,d)/MS_PER_DAY);
export const formatBoundaryHour=hour=>{const h=clampBoundaryHour(hour);return `${h===0?12:h}:00 AM`;};
