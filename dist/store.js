const KEY='karma.v1',KEEP=400;
export const karmaDay=(ms=Date.now())=>Math.floor((ms+7*3600000)/86400000);
const tidy=days=>[...new Set(days.filter(Number.isSafeInteger))].sort((a,b)=>a-b).slice(-KEEP);
function longestRun(days){const set=new Set(days);let best=0;for(const d of set){if(set.has(d-1))continue;let n=0;for(let x=d;set.has(x);x++)n++;if(n>best)best=n;}return best;}
export function createStore(storage){
  let available=true;
  let state={version:2,accountId:null,days:[],longestStreak:0,captions:false,still:false,volume:1,muted:false,musicMuted:false,musicVolume:.22,narrator:'derek'};
  try{
    const raw=JSON.parse(storage.getItem(KEY)||'null');
    if(raw?.version===1||raw?.version===2){
      if(['derek','sarah'].includes(raw.narrator))state.narrator=raw.narrator;
      state.days=Array.isArray(raw.days)?tidy(raw.days):[];
      if(typeof raw.accountId==='string'&&raw.accountId)state.accountId=raw.accountId;
      for(const key of ['captions','still','muted','musicMuted'])if(typeof raw[key]==='boolean')state[key]=raw[key];
      if(Number.isFinite(raw.volume))state.volume=Math.max(0,Math.min(1,raw.volume));
      if(Number.isFinite(raw.musicVolume))state.musicVolume=Math.max(0,Math.min(1,raw.musicVolume));
      if(Number.isSafeInteger(raw.longestStreak)&&raw.longestStreak>=0)state.longestStreak=raw.longestStreak;
      state.longestStreak=Math.max(state.longestStreak,longestRun(state.days));
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
    update(patch){if(['derek','sarah'].includes(patch.narrator))state.narrator=patch.narrator;for(const k of ['captions','still','muted','musicMuted'])if(typeof patch[k]==='boolean')state[k]=patch[k];for(const k of ['volume','musicVolume'])if(Number.isFinite(patch[k]))state[k]=Math.max(0,Math.min(1,patch[k]));save();},
    complete(day){if(!Number.isSafeInteger(day)||state.days.includes(day))return false;state.days=tidy([...state.days,day]);state.longestStreak=Math.max(state.longestStreak,streak(day));save();return true;},
    // Take on the day set the account holds. It already has this device's days.
    adopt(days){state.days=tidy(days);state.longestStreak=Math.max(state.longestStreak,longestRun(state.days));save();return state.days;},
    // A different reader on this device starts from nothing rather than
    // inheriting a stranger's streak. Returns the days to offer the account.
    switchAccount(id){
      if(state.accountId===id)return [...state.days];
      const mine=state.accountId===null?[...state.days]:[];
      state.accountId=id;state.days=mine;if(!mine.length)state.longestStreak=0;save();return mine;
    },
    // Sign-out. The record is in the account by now; it does not stay on a shared device.
    forget(){state.accountId=null;state.days=[];state.longestStreak=0;save();}
  };
}
