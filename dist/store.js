// The record is a list of sittings, each with the instant it finished and an id
// this device made up -- not a list of days. A day depends on where the reader
// put the boundary and the boundary can move, so a day index is something to
// compute rather than keep (see streaks.js). The id is what lets a device offer
// its whole history to an account on every sign-in without counting one twice.
import {clampBoundaryHour,DEFAULT_BOUNDARY_HOUR} from './practice-day.js';
const KEY='karma.v1',KEEP=1000,DAY=86400000;
const newId=()=>crypto?.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const tidy=list=>{
  const seen=new Set(),out=[];
  for(const s of list){if(!s||typeof s.id!=='string'||!Number.isFinite(s.at)||seen.has(s.id))continue;seen.add(s.id);out.push({id:s.id,at:s.at});}
  return out.sort((a,b)=>a.at-b.at).slice(-KEEP);
};
// v1 and v2 recorded whole days under a fixed 01:00 Asia/Singapore boundary and
// never kept an instant. The best recoverable is the middle of each old day,
// 1 PM in Singapore, which lands on the same date under any boundary in range.
const fromLegacyDays=days=>days.filter(Number.isSafeInteger).map(d=>({id:newId(),at:d*DAY+5*3600000}));
export function createStore(storage){
  let available=true;
  let state={version:3,accountId:null,sessions:[],priorSessions:0,boundaryHour:DEFAULT_BOUNDARY_HOUR,showStreaks:true,captions:false,still:false,volume:1,muted:false,musicMuted:false,musicVolume:.22,narrator:'derek'};
  try{
    const raw=JSON.parse(storage.getItem(KEY)||'null');
    if([1,2,3].includes(raw?.version)){
      if(['derek','sarah'].includes(raw.narrator))state.narrator=raw.narrator;
      state.sessions=raw.version===3?tidy(Array.isArray(raw.sessions)?raw.sessions:[]):tidy(fromLegacyDays(Array.isArray(raw.days)?raw.days:[]));
      const counted=Number.isSafeInteger(raw.priorSessions)&&raw.priorSessions>=0?raw.priorSessions:state.sessions.length;
      state.priorSessions=Math.max(counted,state.sessions.length);
      if(typeof raw.accountId==='string'&&raw.accountId)state.accountId=raw.accountId;
      if(raw.boundaryHour!==undefined)state.boundaryHour=clampBoundaryHour(raw.boundaryHour);
      if(typeof raw.showStreaks==='boolean')state.showStreaks=raw.showStreaks;
      for(const key of ['captions','still','muted','musicMuted'])if(typeof raw[key]==='boolean')state[key]=raw[key];
      if(Number.isFinite(raw.volume))state.volume=Math.max(0,Math.min(1,raw.volume));
      if(Number.isFinite(raw.musicVolume))state.musicVolume=Math.max(0,Math.min(1,raw.musicVolume));
    }
    storage.setItem(KEY,JSON.stringify(state));
  }catch{available=false;}
  function save(){if(available){try{storage.setItem(KEY,JSON.stringify(state));}catch{available=false;}}}
  const prefs=()=>({captions:state.captions,still:state.still,volume:state.volume,muted:state.muted,musicMuted:state.musicMuted,musicVolume:state.musicVolume,narrator:state.narrator,boundaryHour:state.boundaryHour,showStreaks:state.showStreaks});
  return {get state(){return state;},get available(){return available;},get sessions(){return state.sessions;},get boundaryHour(){return state.boundaryHour;},
    update(patch){if(['derek','sarah'].includes(patch.narrator))state.narrator=patch.narrator;for(const k of ['captions','still','muted','musicMuted'])if(typeof patch[k]==='boolean')state[k]=patch[k];for(const k of ['volume','musicVolume'])if(Number.isFinite(patch[k]))state[k]=Math.max(0,Math.min(1,patch[k]));save();},
    // A device whose clock runs ahead would otherwise park a sitting in the
    // future, where it would hold a streak open.
    recordSession(at=Date.now()){const s={id:newId(),at:Math.min(at,Date.now())};state.sessions=tidy([...state.sessions,s]);state.priorSessions++;save();return s;},
    // Take on what the account holds; it already has this device's sittings.
    adopt(sessions){state.sessions=tidy([...state.sessions,...sessions]);state.priorSessions=Math.max(state.priorSessions,state.sessions.length);save();return state.sessions;},
    // A different reader on this device starts from nothing rather than
    // inheriting a stranger's streak. Returns the sittings to offer the account.
    switchAccount(id){
      if(state.accountId===id)return [...state.sessions];
      const mine=state.accountId===null?[...state.sessions]:[];
      const keep=state.accountId===null?state.priorSessions:0;
      state={...state,...prefs(),accountId:id,sessions:mine,priorSessions:keep};save();return mine;
    },
    // Sign-out. The record is in the account by now; it does not stay on a shared device.
    forget(){state={...state,...prefs(),accountId:null,sessions:[],priorSessions:0};save();},
    setBoundaryHour(hour){state.boundaryHour=clampBoundaryHour(hour);save();},
    setShowStreaks(on){state.showStreaks=Boolean(on);save();}
  };
}
