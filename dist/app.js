import {createStore,karmaDay} from './store.js';
import {AudioMixer} from './audio-mixer.js';
const $=s=>document.querySelector(s);
let local;try{local=window.localStorage;}catch{local=null;}
const store=createStore(local),audio=$('#audio'),motion=matchMedia('(prefers-reduced-motion: reduce)');
const mixer=new AudioMixer(audio,$('#music-audio'),message=>{$('#music-status').textContent=message;$('#music-status').hidden=!message;});
let state='home',scene=null,cues=[],activeDay=null,completed=false,attempt=0,hideTimer=null,loadTimer=null,raf=null;
const controls=$('#player-controls');
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
  if(next==='playing')tick();else if(raf){cancelAnimationFrame(raf);raf=null;}
  if(next!=='playing')showControls(false);
}
function refreshHome(){
  const todayDone=store.state.days.includes(karmaDay());
  $('#begin span').textContent=todayDone?'Meditate again':'Begin meditation';
  $('#home-status').textContent=todayDone?'You made time for rest today.':'';
  $('#history-note').textContent=store.available?(store.state.days.length?`${store.state.days.length} day${store.state.days.length===1?'':'s'} of practice saved on this device.`:'Your first quiet moment is waiting.'): 'Browser storage is unavailable. You can still meditate; your history will last for this visit only.';
}
function syncSettings(){
  $('#captions-setting').checked=store.state.captions;$('#motion-setting').checked=store.state.still||motion.matches;
  $('#motion-setting').disabled=motion.matches;
  $('#volume').value=Math.round(store.state.volume*100);$('#volume-value').textContent=`${Math.round(store.state.volume*100)}%`;
  mixer.applySettings(store.state);
  $('#mute').setAttribute('aria-pressed',String(audio.muted));$('#mute').setAttribute('aria-label',audio.muted?'Unmute all audio':'Mute all audio');$('#mute use').setAttribute('href',audio.muted?'#i-muted':'#i-sound');
  $('#music-setting').checked=!store.state.musicMuted;
  $('#music-volume').value=Math.round(store.state.musicVolume*100);$('#music-volume-value').textContent=`${Math.round(store.state.musicVolume*100)}%`;
  $('#music-toggle').textContent=store.state.musicMuted?'Music off':'Music on';$('#music-toggle').setAttribute('aria-pressed',String(store.state.musicMuted));$('#music-toggle').setAttribute('aria-label',store.state.musicMuted?'Unmute background music':'Mute background music');
  $('#captions').setAttribute('aria-pressed',String(store.state.captions));$('#captions').setAttribute('aria-label',store.state.captions?'Hide captions':'Show captions');
  scene?.setReduced(store.state.still||motion.matches);renderProgress();
}
function renderProgress(){
  const time=Math.min(300,audio.currentTime||0);
  $('#progress-circle').style.strokeDashoffset=207.345*(1-time/300);
  $('#progress').setAttribute('aria-valuenow',String(Math.floor(time)));
  $('#progress').setAttribute('aria-valuetext',`${Math.floor(time/60)} minutes and ${Math.floor(time%60)} seconds of 5 minutes`);
  const cue=cues.find(c=>time>=c.start&&time<c.end);
  mixer.sync(time,!!cue,state==='playing'&&!audio.paused&&audio.readyState>=3);
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
  if(state==='loading'||state==='playing')return;
  const id=++attempt;
  if(fresh){audio.currentTime=0;activeDay=karmaDay();completed=false;}
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
function exit(){++attempt;clearTimeout(loadTimer);audio.pause();audio.currentTime=0;activeDay=null;completed=false;setState('home');renderProgress();refreshHome();$('#begin').focus({preventScroll:true});}
function finish(){
  if(completed||activeDay===null||audio.currentTime<299.8)return;
  completed=true;const added=store.complete(activeDay);setState('complete');
  $('#practice-note').textContent=added?(store.streak(activeDay)>1?`${store.streak(activeDay)} days of making space for yourself.`:'A small beginning. A little more space.'):'Another quiet moment, just for you.';
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
$('#reveal').addEventListener('click',()=>{showControls();$('#pause').focus();});
$('#session').addEventListener('pointerdown',()=>showControls());controls.addEventListener('focusin',()=>showControls(false));controls.addEventListener('focusout',()=>showControls());
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();scene?.setActive(false);}else{scene?.setActive(state==='home');refreshHome();}});
audio.addEventListener('ended',finish);audio.addEventListener('error',fail);audio.addEventListener('timeupdate',renderProgress);
audio.addEventListener('waiting',()=>{if(state==='playing'){$('#session-message').textContent='Taking a moment to load the audio...';mixer.setPlaying(false);}});
audio.addEventListener('pause',()=>{if(state==='playing'&&!audio.ended)setState('paused');});
for(const [button,dialog] of [['settings-open','settings-dialog'],['session-settings','settings-dialog'],['about-open','about-dialog'],['transcript-open','transcript-dialog']]){
  $('#'+button).addEventListener('click',()=>{if(state==='playing')pause();$('#'+dialog).showModal();});
}
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('keydown',e=>{if(e.code==='Space'&&['playing','paused'].includes(state)&&e.target===document.body){e.preventDefault();state==='playing'?pause():play();}});
motion.addEventListener('change',syncSettings);
fetch('assets/meditation.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  cues=data.cues;$('#transcript-content').replaceChildren(...cues.map(c=>{const p=document.createElement('p');p.className='transcript-cue';const t=document.createElement('time');t.textContent=`${Math.floor(c.start/60)}:${String(c.start%60).padStart(2,'0')}`;p.append(t,document.createTextNode(c.text));return p;}));renderProgress();
}).catch(()=>{$('#transcript-content').innerHTML='<p>The transcript could not load. Please refresh to try again.</p>';});
refreshHome();syncSettings();
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
