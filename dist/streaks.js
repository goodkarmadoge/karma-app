// Derived, never stored. A stored count would have been computed under whichever
// boundary was set at the time, so moving the boundary would leave a number that
// disagreed with the calendar beside it. Recomputing is one pass and is always right.
import {practiceDayIndex} from './practice-day.js';
export const MINUTES_PER_SESSION=5;
function longestRun(days){let best=0,run=0,prev;for(const d of days){run=prev!==undefined&&d===prev+1?run+1:1;if(run>best)best=run;prev=d;}return best;}
// Live means today or yesterday. Counting a run that ended yesterday is the part
// that matters: otherwise every streak reads as broken for the whole of each day
// until the moment its owner sits down, which is when they would be looking at it.
function currentRun(days,today){
  const last=days.at(-1);
  if(last===undefined||(last!==today&&last!==today-1))return 0;
  let run=1;
  for(let i=days.length-1;i>0;i--){if(days[i-1]!==days[i]-1)break;run++;}
  return run;
}
export function summarise(sessions,boundaryHour,{now=Date.now(),priorSessions=0}={}){
  const today=practiceDayIndex(now,boundaryHour),unique=new Set();
  // A sitting whose instant will not parse still happened; it counts in the
  // total and stays off the calendar, which is the honest handling.
  for(const s of sessions)if(Number.isFinite(s.at))unique.add(practiceDayIndex(s.at,boundaryHour));
  const days=[...unique].sort((a,b)=>a-b),totalSessions=Math.max(sessions.length,priorSessions);
  return {current:currentRun(days,today),longest:longestRun(days),totalSessions,totalMinutes:totalSessions*MINUTES_PER_SESSION,days,today};
}
export const splitMinutes=total=>{const w=Math.max(0,Math.round(total));return {hours:Math.floor(w/60),minutes:w%60};};
