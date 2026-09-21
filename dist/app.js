import {createStore} from './store.js';
import {BOUNDARY_HOURS,clampBoundaryHour,dayIndexForCalendarDate,formatBoundaryHour,practiceDayIndex} from './practice-day.js';
import {splitMinutes,summarise} from './streaks.js';
import {AudioMixer} from './audio-mixer.js';
import {createAccount} from './account.js';
const $=s=>document.querySelector(s);
let local;try{local=window.localStorage;}catch{local=null;}
const store=createStore(local),account=createAccount(),audio=$('#audio'),motion=matchMedia('(prefers-reduced-motion: reduce)');
const mixer=new AudioMixer(audio,$('#music-audio'),message=>{$('#music-status').textContent=message;$('#music-status').hidden=!message;});
let state='home',scene=null,cues=[],startedAt=null,completed=false,attempt=0,hideTimer=null,loadTimer=null,raf=null;
// The practice day is derived, under whatever boundary is set now.
const karmaDay=(at=Date.now())=>practiceDayIndex(at,store.boundaryHour);
const streaks=()=>summarise(store.sessions,store.boundaryHour,{priorSessions:store.state.priorSessions});
// Null means "the month today is in", so reopening settings comes back to now.
let calendarMonth=null;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
let narratorReady=false,narratorRequest=0;
let daily={date:'',title:'Rest & Recovery',topic:'Karma',audioBaseUrl:'assets'};
const controls=$('#player-controls');
const interfaceToggle=$('#interface-toggle');
const interfaceElements=document.querySelectorAll('.header, main, #artwork-hint, dialog');
let interfaceHidden=false;
interfaceToggle.addEventListener('click',()=>{
  interfaceHidden=!interfaceHidden;
  // Keep the artwork and audio running; block every hidden control immediately.
  interfaceToggle.focus({preventScroll:true});
  for(const element of interfaceElements)element.inert=interfaceHidden;
  document.body.classList.toggle('interface-hidden',interfaceHidden);
  interfaceToggle.textContent=interfaceHidden?'Show':'Hide';
  interfaceToggle.setAttribute('aria-label',interfaceHidden?'Show interface':'Hide interface');
  interfaceToggle.setAttribute('aria-pressed',String(interfaceHidden));
});
$('#scene').addEventListener('artworkchange',event=>{
  const {index,count,title,description,tone}=event.detail||{};
  document.body.dataset.artTone=tone?'dark':'light';
  $('#artwork-title').textContent=title||'';$('#artwork-description').textContent=description||'';
  $('#artwork-alt').textContent=`Asian ink painting: ${title}. ${description}`;
  $('#artwork-count').textContent=`${index+1} / ${count}`;
  $('#artwork-prev').disabled=index===0;$('#artwork-next').disabled=index===count-1;
  $('#artwork-hint').setAttribute('aria-label',`${title}. ${description} Tap painted trees or water, or swipe to change artwork.`);
});
$('#artwork-prev').addEventListener('click',()=>scene?.shiftArtwork(-1));
$('#artwork-next').addEventListener('click',()=>scene?.shiftArtwork(1));
const phase=t=>t<58?'Nothing to do. Nowhere to be.':t<111?'Let the breath find its own rhythm.':t<196?'A small act of care.':t<257?'Let yourself rest.':'Carry a little kindness with you.';
function setState(next){
  state=next;document.body.dataset.state=next;
  $('#home').hidden=next!=='home';$('#session').hidden=!['loading','playing','paused','error'].includes(next);$('#complete').hidden=next!=='complete';
  $('#resume').hidden=!['paused','error'].includes(next);
  $('#resume span').textContent=next==='error'?'Try again':'Resume meditation';
  $('#pause').setAttribute('aria-label',next==='playing'?'Pause meditation':'Resume meditation');
  $('#pause use').setAttribute('href',next==='playing'?'#i-pause':'#i-play');
  $('#pause').disabled=next==='loading';
  $('#session-message').textContent=next==='loading'?'Preparing your meditation...':next==='error'?'The audio could not play. Please try again.':next==='paused'?'Take your time. We will be here.':phase(audio.currentTime);
  scene?.setActive(next==='home'||next==='playing');
  mixer.setPlaying(next==='playing');
  updateMediaPlayback();
  if(next==='playing')tick();else if(raf){cancelAnimationFrame(raf);raf=null;}
  if(next!=='playing')showControls(false);
}
function refreshHome(){
  const summary=streaks(),todayDone=summary.days.includes(summary.today);
  $('#begin span').textContent=todayDone?'Meditate again':'Begin meditation';
  $('#home-status').textContent=todayDone?'You made time for rest today.':'';
  $('#history-note').textContent=store.available?(summary.days.length?`${summary.days.length} day${summary.days.length===1?'':'s'} of practice saved.`:'Your first quiet moment is waiting.'): 'Browser storage is unavailable. You can still meditate; your history will last for this visit only.';
}
function syncSettings(){
  $('#narrator-setting').value=store.state.narrator;
  const chosen=$('#narrator-setting').selectedOptions[0];
  if(chosen)$('#voice-guide').textContent=chosen.textContent.split(String.fromCharCode(0xB7))[0].trim();
  $('#captions-setting').checked=store.state.captions;$('#motion-setting').checked=store.state.still||motion.matches;
  $('#motion-setting').disabled=motion.matches;
  $('#volume').value=Math.round(store.state.volume*100);$('#volume-value').textContent=`${Math.round(store.state.volume*100)}%`;
  const noVolume=!mixer.volumeSupported;
  $('#volume').disabled=noVolume;$('#music-volume').disabled=noVolume;$('#volume-note').hidden=!noVolume;
  mixer.applySettings(store.state);
  $('#mute').setAttribute('aria-pressed',String(audio.muted));$('#mute').setAttribute('aria-label',audio.muted?'Unmute all audio':'Mute all audio');$('#mute use').setAttribute('href',audio.muted?'#i-muted':'#i-sound');
  $('#music-setting').checked=!store.state.musicMuted;
  $('#music-volume').value=Math.round(store.state.musicVolume*100);$('#music-volume-value').textContent=`${Math.round(store.state.musicVolume*100)}%`;
  $('#music-toggle').textContent=store.state.musicMuted?'Music off':'Music on';$('#music-toggle').setAttribute('aria-pressed',String(store.state.musicMuted));$('#music-toggle').setAttribute('aria-label',store.state.musicMuted?'Unmute background music':'Mute background music');
  $('#captions').setAttribute('aria-pressed',String(store.state.captions));$('#captions').setAttribute('aria-label',store.state.captions?'Hide captions':'Show captions');
  scene?.setReduced(store.state.still||motion.matches);renderProgress();
}
const mediaSession=()=>globalThis.navigator?.mediaSession;
function updateMediaMetadata(){
  const ms=mediaSession();
  if(!ms||typeof globalThis.MediaMetadata!=='function')return;
  try{
    ms.metadata=new globalThis.MediaMetadata({
      title:daily.title||'Rest & Recovery',
      artist:'Karma',
      album:'Daily Karma meditation',
      artwork:[{src:new URL('assets/stillness.webp',location.href).href,sizes:'1024x1536',type:'image/webp'}]
    });
  }catch{}
}
function updateMediaPlayback(){
  const ms=mediaSession();if(!ms)return;
  try{ms.playbackState=state==='playing'?'playing':['paused','loading','error'].includes(state)?'paused':'none';}catch{}
  if(typeof ms.setPositionState!=='function')return;
  try{
    if(['home','complete'].includes(state))ms.setPositionState();
    else ms.setPositionState({duration:300,position:Math.max(0,Math.min(300,audio.currentTime||0)),playbackRate:1});
  }catch{}
}
function setupMediaSession(){
  const ms=mediaSession();if(!ms)return;
  const on=(action,handler)=>{try{ms.setActionHandler(action,handler);}catch{}};
  on('play',()=>{if(state!=='playing')void play();});
  on('pause',()=>pause());
  on('stop',()=>exit());
  updateMediaMetadata();
}
function renderProgress(){
  const time=Math.min(300,audio.currentTime||0);
  $('#progress-circle').style.strokeDashoffset=207.345*(1-time/300);
  $('#progress').setAttribute('aria-valuenow',String(Math.floor(time)));
  $('#progress').setAttribute('aria-valuetext',`${Math.floor(time/60)} minutes and ${Math.floor(time%60)} seconds of 5 minutes`);
  const cue=cues.find(c=>time>=c.start&&time<c.end);
  mixer.sync(time,!!cue,state==='playing'&&!audio.paused&&audio.readyState>=3);
  updateMediaPlayback();
  const visible=store.state.captions&&cue&&['playing','paused'].includes(state);
  $('#caption').hidden=!visible;
  if(visible&&$('#caption').textContent!==cue.text)$('#caption').textContent=cue.text;
}
function tick(){
  if(state!=='playing')return;
  renderProgress();scene?.setTime(audio.currentTime);
  const next=phase(audio.currentTime);if($('#session-message').textContent!==next)$('#session-message').textContent=next;
  raf=requestAnimationFrame(tick);
}
function showControls(autohide=true){
  clearTimeout(hideTimer);controls.classList.remove('concealed');controls.inert=false;$('#reveal').setAttribute('aria-expanded','true');
  if(autohide&&state==='playing')hideTimer=setTimeout(()=>{if(!controls.contains(document.activeElement)){controls.classList.add('concealed');controls.inert=true;$('#reveal').setAttribute('aria-expanded','false');}},3000);
}
function fail(){clearTimeout(loadTimer);audio.pause();if(['home','complete'].includes(state))return;setState('error');$('#resume').focus();}
async function play(fresh=false){
  if(!narratorReady){await loadNarrator();if(!narratorReady)return;}
  if(state==='loading'||state==='playing')return;
  const id=++attempt;
  if(fresh){audio.currentTime=0;startedAt=Date.now();completed=false;}
  if(audio.error)audio.load();
  setState('loading');renderProgress();
  loadTimer=setTimeout(()=>{if(id===attempt&&state==='loading'){attempt++;fail();}},25000);
  try{
    const unlocked=mixer.unlock();
    const voiceStarted=audio.play();
    void mixer.start(audio.currentTime);
    await Promise.all([unlocked,voiceStarted]);
    if(id!==attempt)return;
    clearTimeout(loadTimer);
    if(document.hidden){pause();return;}
    setState('playing');$('#pause').focus({preventScroll:true});showControls();
  }catch{if(id===attempt)fail();}
}
function pause(){
  if(!['playing','loading'].includes(state))return;
  ++attempt;clearTimeout(loadTimer);audio.pause();setState('paused');renderProgress();
}
function exit(){++attempt;clearTimeout(loadTimer);audio.pause();audio.currentTime=0;startedAt=null;completed=false;setState('home');renderProgress();refreshHome();$('#begin').focus({preventScroll:true});}
function finish(){
  if(completed||startedAt===null||audio.currentTime<299.8)return;
  completed=true;
  const before=streaks(),sitting=store.recordSession(startedAt);
  account.recordSession(sitting).catch(()=>{});
  setState('complete');
  const after=streaks(),firstToday=!before.days.includes(after.today);
  $('#practice-note').textContent=!store.state.showStreaks?'':firstToday?(after.current>1?`${after.current} days of making space for yourself.`:'A small beginning. A little more space.'):'Another quiet moment, just for you.';
  $('#complete-title').setAttribute('tabindex','-1');$('#complete-title').focus({preventScroll:true});refreshHome();
}
$('#begin').addEventListener('click',()=>play(true));$('#resume').addEventListener('click',()=>play());
$('#pause').addEventListener('click',()=>state==='playing'?pause():play());$('#exit').addEventListener('click',exit);$('#done').addEventListener('click',exit);
$('.brand').addEventListener('click',e=>{e.preventDefault();exit();});
$('#mute').addEventListener('click',()=>{store.update({muted:!store.state.muted});syncSettings();});
$('#captions').addEventListener('click',()=>{store.update({captions:!store.state.captions});syncSettings();});
$('#captions-setting').addEventListener('change',e=>{store.update({captions:e.target.checked});syncSettings();});
$('#motion-setting').addEventListener('change',e=>{store.update({still:e.target.checked});syncSettings();});
$('#volume').addEventListener('input',e=>{store.update({volume:Number(e.target.value)/100,muted:false});syncSettings();});
function setMusicMuted(musicMuted){store.update({musicMuted});syncSettings();if(!musicMuted&&state==='playing'&&mixer.failed){void mixer.unlock();void mixer.start(audio.currentTime);mixer.setPlaying(true);}}
$('#music-toggle').addEventListener('click',()=>setMusicMuted(!store.state.musicMuted));
$('#music-setting').addEventListener('change',e=>setMusicMuted(!e.target.checked));
$('#music-volume').addEventListener('input',e=>{store.update({musicVolume:Number(e.target.value)/100,musicMuted:false});syncSettings();});
$('#narrator-setting').addEventListener('change',e=>{
  if(e.target.value===store.state.narrator)return;
  pause();++attempt;audio.pause();mixer.stop();audio.currentTime=0;completed=false;
  if(!['home','complete'].includes(state))setState('paused');
  store.update({narrator:e.target.value});syncSettings();void loadNarrator();
});
$('#reveal').addEventListener('click',()=>{showControls();$('#pause').focus();});
$('#session').addEventListener('pointerdown',()=>showControls());controls.addEventListener('focusin',()=>showControls(false));controls.addEventListener('focusout',()=>showControls());
document.addEventListener('visibilitychange',()=>{
  // Playback deliberately continues while the screen is off. Only the
  // artwork stops, because nothing is looking at it.
  if(document.hidden){scene?.setActive(false);if(raf){cancelAnimationFrame(raf);raf=null;}return;}
  scene?.setActive(state==='home'||state==='playing');
  if(state==='playing'&&!raf)tick();
  refreshHome();
});
audio.addEventListener('ended',finish);audio.addEventListener('error',fail);audio.addEventListener('timeupdate',renderProgress);
audio.addEventListener('waiting',()=>{if(state==='playing'){$('#session-message').textContent='Taking a moment to load the audio...';mixer.setPlaying(false);}});
audio.addEventListener('pause',()=>{if(state==='playing'&&!audio.ended)setState('paused');});
for(const [button,dialog] of [['settings-open','settings-dialog'],['narrator-open','settings-dialog'],['session-settings','settings-dialog'],['about-open','about-dialog'],['transcript-open','transcript-dialog'],['signin-open','signin-dialog'],['account-signin','signin-dialog']]){
  $('#'+button).addEventListener('click',()=>{if(state==='playing')pause();if(dialog==='settings-dialog')renderStreaks();$('#'+dialog).showModal();});
}
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('keydown',e=>{if(!interfaceHidden&&e.code==='Space'&&['playing','paused'].includes(state)&&e.target===document.body){e.preventDefault();state==='playing'?pause():play();}});
motion.addEventListener('change',syncSettings);
async function loadNarrator(){
  const id=++narratorRequest,name=store.state.narrator;
  narratorReady=false;cues=[];
  $('#narrator-status').textContent='Preparing your narrator...';
  try{
    const assetVersion=daily.generatedAt||daily.date;
    const version=assetVersion?`?v=${encodeURIComponent(assetVersion)}`:'';
    const response=await fetch(`assets/meditation-${name}.json${version}`,{cache:'no-store'});
    if(!response.ok)throw Error();
    const data=await response.json();if(id!==narratorRequest)return;
    audio.src=`${daily.audioBaseUrl||'assets'}/meditation-${name}.mp3${version}`;
    audio.querySelector('track').src=`assets/meditation-${name}.vtt${version}`;
    audio.load();cues=data.cues;narratorReady=true;
    $('#narrator-status').textContent='Changing narrator restarts the meditation.';
    $('#transcript-content').replaceChildren(...cues.map(c=>{const p=document.createElement('p');p.className='transcript-cue';const t=document.createElement('time');t.textContent=`${Math.floor(c.start/60)}:${String(c.start%60).padStart(2,'0')}`;p.append(t,document.createTextNode(c.text));return p;}));renderProgress();
  }catch{
    if(id!==narratorRequest)return;
    $('#narrator-status').textContent='This narrator could not load. Choose another narrator or try again.';
    $('#transcript-content').textContent='The transcript could not load. Please refresh to try again.';
  }
}
async function loadDailyMeditation(){
  try{
    const response=await fetch('assets/daily-meditation.json',{cache:'no-store'});
    if(!response.ok)throw Error();
    const data=await response.json();
    if(!data.date||!data.title||!data.topic)throw Error();
    daily={...daily,...data};
    $('#home-daily-title').textContent=daily.title;
    $('#home-daily-meta').textContent=`${daily.topic} · 5 min guided meditation`;
    $('#session-title').textContent=daily.title;
    $('#transcript-title').textContent=`${daily.topic}: ${daily.title}`;
    updateMediaMetadata();
  }catch{/* The bundled meditation remains available if the daily manifest is temporarily unavailable. */}
}
// Signing in is an addition, never a gate: everything here reads the local
// record first and lets the account catch up behind it.
const EMAIL=/^[^s@]+@[^s@]+.[^s@]+$/;
let syncedFor=null;
function signinError(message){$('#signin-error').textContent=message;$('#signin-error').hidden=!message;}
function resetSigninForm(){$('#signin-form').hidden=false;$('#signin-sent').hidden=true;signinError('');$('#signin-submit').disabled=false;$('#signin-submit').textContent='Send my link';}
function renderGreeting({signedIn,firstName}){
  const name=signedIn?firstName:null;
  $('#home-eyebrow').textContent=name?(store.sessions.length?`WELCOME BACK, ${name.toUpperCase()}`:`WELCOME, ${name.toUpperCase()}`):'DAILY KARMA MEDITATION';
}
async function syncAccount(userId){
  if(syncedFor===userId)return;
  syncedFor=userId;
  const sessions=await account.sync(store.switchAccount(userId));
  if(sessions)store.adopt(sessions);
  // The boundary and the toggle belong to the reader, so the account's answer
  // wins over whatever this device happened to have.
  const {boundaryHour,showStreaks}=account.snapshot;
  if(boundaryHour!==null)store.setBoundaryHour(boundaryHour);
  if(showStreaks!==null)store.setShowStreaks(showStreaks);
  refreshHome();renderStreaks();renderGreeting(account.snapshot);
}
account.onChange(snap=>{
  $('#signin-open').hidden=!snap.available||snap.signedIn;
  $('#account-out').hidden=snap.signedIn;$('#account-in').hidden=!snap.signedIn;
  $('#account-email').textContent=snap.email??'';
  if(document.activeElement!==$('#account-name'))$('#account-name').value=snap.firstName??'';
  renderGreeting(snap);
  if(snap.signedIn){$('#signin-dialog').close();syncAccount(snap.userId);}else{syncedFor=null;renderStreaks();}
});
$('#signin-open').addEventListener('click',resetSigninForm);
$('#account-signin').addEventListener('click',resetSigninForm);
$('#signin-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const name=$('#signin-name').value.trim(),email=$('#signin-email').value.trim();
  if(!name){signinError('Tell us your first name, so the app knows how to greet you.');$('#signin-name').focus();return;}
  if(!EMAIL.test(email)){signinError('That email address does not look right.');$('#signin-email').focus();return;}
  signinError('');$('#signin-submit').disabled=true;$('#signin-submit').textContent='Sending...';
  const {ok,message}=await account.sendLink(email,name);
  $('#signin-submit').disabled=false;$('#signin-submit').textContent='Send my link';
  if(!ok){signinError(message);return;}
  $('#signin-sent-email').textContent=email;$('#signin-form').hidden=true;$('#signin-sent').hidden=false;$('#signin-again').focus();
});
$('#signin-again').addEventListener('click',()=>{resetSigninForm();$('#signin-email').focus();});
$('#account-name').addEventListener('change',async()=>{
  const name=$('#account-name').value.trim(),current=account.snapshot.firstName;
  if(!name){$('#account-name').value=current??'';return;}
  if(name===current)return;
  $('#account-name-note').textContent='Saving...';
  const {ok}=await account.rename(name);
  $('#account-name-note').textContent=ok?'Saved.':'Could not save that just now.';
  setTimeout(()=>{$('#account-name-note').textContent='';},2600);
});
$('#account-signout').addEventListener('click',async()=>{
  await account.signOut();
  // The record is in the account by now; leaving it would show one reader's
  // streak to whoever picks up the device next.
  store.forget();refreshHome();renderStreaks();$('#about-dialog').close();
});

// ---------- the streak, its calendar, and where a day begins ----------
function buildBoundaryOptions(){
  $('#boundary-setting').replaceChildren(...BOUNDARY_HOURS.map(h=>{const o=document.createElement('option');o.value=String(h);o.textContent=formatBoundaryHour(h);return o;}));
}
function renderCalendar(summary){
  const today=new Date(),shown=calendarMonth??new Date(today.getFullYear(),today.getMonth(),1);
  const year=shown.getFullYear(),month=shown.getMonth();
  $('#cal-month').textContent=`${MONTHS[month]} ${year}`;
  $('#cal-next').disabled=year===today.getFullYear()&&month===today.getMonth();
  const practised=new Set(summary.days);
  // getDay() is Sunday-first; the grid is Monday-first.
  const lead=(new Date(year,month,1).getDay()+6)%7,length=new Date(year,month+1,0).getDate(),cells=[];
  for(let i=0;i<lead;i++){const b=document.createElement('span');b.className='calendar-day';b.dataset.blank='true';cells.push(b);}
  for(let day=1;day<=length;day++){
    const index=dayIndexForCalendarDate(year,month,day),cell=document.createElement('span');
    cell.className='calendar-day';cell.setAttribute('role','listitem');cell.textContent=String(day);
    if(practised.has(index))cell.dataset.practised='true';
    if(index===summary.today)cell.dataset.today='true';
    if(index>summary.today)cell.dataset.future='true';
    cell.setAttribute('aria-label',practised.has(index)?`${MONTHS[month]} ${day}, practised`:`${MONTHS[month]} ${day}`);
    cells.push(cell);
  }
  $('#cal-grid').replaceChildren(...cells);
}
function renderStreaks(){
  const on=store.state.showStreaks;
  $('#streaks-setting').checked=on;$('#streak-panel').hidden=!on;
  if(!on)return;
  const summary=streaks(),lapsed=summary.current===0;
  $('#streak-badge').dataset.lapsed=String(lapsed);
  $('#streak-count').textContent=String(summary.current);
  $('#streak-unit').textContent=summary.current===1?'day':'days';
  $('#streak-line').textContent=lapsed?(summary.totalSessions?'Your streak is resting. Sit today and it begins again.':'Sit once and your streak begins.'):(summary.days.includes(summary.today)?'Counted for today.':'Still alive. Today is not yet counted.');
  $('#stat-longest').textContent=String(summary.longest);
  $('#stat-sessions').textContent=String(summary.totalSessions);
  const {hours,minutes}=splitMinutes(summary.totalMinutes);
  $('#stat-time').textContent=hours?`${hours}h ${minutes}m`:`${minutes}m`;
  $('#boundary-setting').value=String(clampBoundaryHour(store.boundaryHour));
  $('#boundary-note').textContent=`A sitting counts for the day before until ${formatBoundaryHour(store.boundaryHour)}.`;
  renderCalendar(summary);
}
$('#streaks-setting').addEventListener('change',e=>{
  store.setShowStreaks(e.target.checked);account.setShowStreaks(e.target.checked).catch(()=>{});
  renderStreaks();refreshHome();
});
$('#boundary-setting').addEventListener('change',e=>{
  const hour=clampBoundaryHour(Number(e.target.value));
  store.setBoundaryHour(hour);account.setBoundaryHour(hour).catch(()=>{});
  // Nothing is rewritten: every figure and every square recomputes from the
  // same sittings under the new boundary.
  renderStreaks();refreshHome();
});
$('#cal-prev').addEventListener('click',()=>{
  const t=new Date(),shown=calendarMonth??new Date(t.getFullYear(),t.getMonth(),1);
  calendarMonth=new Date(shown.getFullYear(),shown.getMonth()-1,1);renderCalendar(streaks());
});
$('#cal-next').addEventListener('click',()=>{
  const t=new Date(),shown=calendarMonth??new Date(t.getFullYear(),t.getMonth(),1);
  const next=new Date(shown.getFullYear(),shown.getMonth()+1,1);
  if(next>new Date(t.getFullYear(),t.getMonth(),1))return;
  calendarMonth=next;renderCalendar(streaks());
});

void loadDailyMeditation().then(loadNarrator);
buildBoundaryOptions();renderStreaks();
refreshHome();syncSettings();setupMediaSession();
// Last, and awaited by nothing above it: a slow network must not hold up the
// painting, the audio or the Begin button.
account.start().catch(()=>{});
const bootScene=()=>import('./scene.js').then(async({KarmaScene})=>{
  scene=new KarmaScene($('#scene'));await scene.init();scene.setReduced(store.state.still||motion.matches);scene.setActive(!document.hidden&&(state==='home'||state==='playing'));
}).catch(()=>{$('#scene').classList.remove('ready');});
if('requestIdleCallback'in window)requestIdleCallback(bootScene,{timeout:1500});else setTimeout(bootScene,600);
addEventListener('pagehide',()=>{pause();scene?.setActive(false);});
addEventListener('pageshow',()=>{refreshHome();scene?.setActive(state==='home'&&!document.hidden);});
// Progressive enhancement: browsers without WebMCP retain the full UI.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'get_meditation_state',description:'Read the Karma player state and current playback position.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(input&&Object.keys(input).length)throw Error('No input fields are accepted.');return{state,positionSeconds:audio.currentTime,durationSeconds:300,captions:store.state.captions};}});
  register({name:'pause_meditation',description:'Pause the active Karma meditation without completing or exiting it.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No input fields are accepted.');pause();return{state,positionSeconds:audio.currentTime};}});
  addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
