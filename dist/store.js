const KEY='karma.v1';
export const karmaDay=(ms=Date.now())=>Math.floor((ms+7*3600000)/86400000);
export function createStore(storage){
  let available=true;
  let state={version:1,days:[],longestStreak:0,captions:false,still:false,volume:1,muted:false};
  try{
    const raw=JSON.parse(storage.getItem(KEY)||'null');
    if(raw?.version===1){
      state.days=Array.isArray(raw.days)?[...new Set(raw.days.filter(Number.isSafeInteger))].sort((a,b)=>a-b).slice(-90):[];
      for(const key of ['captions','still','muted'])if(typeof raw[key]==='boolean')state[key]=raw[key];
      if(Number.isFinite(raw.volume))state.volume=Math.max(0,Math.min(1,raw.volume));
      if(Number.isSafeInteger(raw.longestStreak)&&raw.longestStreak>=0)state.longestStreak=raw.longestStreak;
    }
    storage.setItem(KEY,JSON.stringify(state));
  }catch{available=false;}
  function save(){if(available){try{storage.setItem(KEY,JSON.stringify(state));}catch{available=false;}}}
  function streak(day=karmaDay()){
    let current=state.days.includes(day)?day:day-1,n=0;
    while(state.days.includes(current--))n++;
    return n;
  }
  return {get state(){return state;},get available(){return available;},streak,
    update(patch){for(const k of ['captions','still','muted'])if(typeof patch[k]==='boolean')state[k]=patch[k];if(Number.isFinite(patch.volume))state.volume=Math.max(0,Math.min(1,patch.volume));save();},
    complete(day){if(!Number.isSafeInteger(day)||state.days.includes(day))return false;state.days=[...state.days,day].sort((a,b)=>a-b).slice(-90);state.longestStreak=Math.max(state.longestStreak,streak(day));save();return true;}
  };
}
