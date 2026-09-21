// Narration is the timeline owner. The optional music follows its position.
//
// Both tracks are plain media elements and deliberately stay that way. Routing
// them through Web Audio would give exact gain control, but iOS suspends an
// AudioContext the moment the screen locks, and listening with the screen off is
// the point of the thing. So the bed level and the fade envelope are baked into
// the music file, and what is left here is ducking, which is a nicety rather
// than a requirement.
//
// iOS also ignores `volume` on a media element. Where that is the case the two
// volume settings cannot do anything, and the interface says so rather than
// offering a slider that moves nothing. `muted` is honoured everywhere.
const DUCK = 0.7;

const volumeIsSettable = (el) => {
  const before = el.volume;
  try {
    el.volume = 0.5;
    const ok = Math.abs(el.volume - 0.5) < 0.01;
    el.volume = before;
    return ok;
  } catch { return false; }
};

export class AudioMixer {
  constructor(voice,music,onError=()=>{}) {
    this.voice=voice;this.music=music;this.onError=onError;
    this.playing=false;this.failed=false;
    this.musicStarting=false;this.settings={volume:1,muted:false,musicMuted:false,musicVolume:1};
    this.speaking=false;this.position=0;
    this.volumeSupported=volumeIsSettable(voice);
    music.addEventListener('error',()=>this.musicError());
  }
  // Kept so the first gesture still has something to await; there is no longer
  // an audio graph to unlock.
  unlock(){this.applySettings(this.settings);return Promise.resolve();}
  musicError(){this.failed=true;this.musicStarting=false;this.music.pause();this.onError('Background music could not load. The guided meditation is still available.');}
  start(position=0){
    this.position=position;this.playing=false;
    this.failed=false;
    if(this.music.error)this.music.load();
    if(Math.abs(this.music.currentTime-position)>.35){try{this.music.currentTime=Math.max(0,position);}catch{}}
    this.musicStarting=true;
    return Promise.resolve(this.music.play()).then(()=>{
      this.musicStarting=false;
      if(!this.playing)this.music.pause();
      this.onError('');return true;
    }).catch(error=>{this.musicStarting=false;if(error?.name!=='AbortError')this.musicError();return false;});
  }
  setPlaying(playing){
    this.playing=playing;
    if(!playing)this.music.pause();
    this.applyLevels();
  }
  applySettings(settings){
    this.settings={...this.settings,...settings};
    this.voice.muted=!!this.settings.muted;this.music.muted=!!(this.settings.muted||this.settings.musicMuted);
    this.applyLevels();
  }
  applyLevels(){
    if(!this.volumeSupported)return;
    const s=this.settings;
    // The fade in and out are already in the file; this is the duck under speech.
    this.voice.volume=Math.max(0,Math.min(1,s.volume));
    this.music.volume=Math.max(0,Math.min(1,s.musicVolume*(this.speaking?DUCK:1)));
  }
  sync(position,speaking,playing){
    this.position=position;this.speaking=speaking;this.playing=playing;
    this.applyLevels();
    if(!playing){this.music.pause();return;}
    if(this.failed||this.musicStarting)return;
    const end=Number.isFinite(this.music.duration)?this.music.duration:300;
    if(position>=end-.04){this.music.pause();return;}
    if(this.music.readyState>=1&&!this.music.seeking&&Math.abs(this.music.currentTime-position)>.35){
      try{this.music.currentTime=position;}catch{}
    }
    if(this.music.paused){
      this.musicStarting=true;
      Promise.resolve(this.music.play()).then(()=>{this.musicStarting=false;if(!this.playing)this.music.pause();}).catch(error=>{this.musicStarting=false;if(error?.name!=='AbortError')this.musicError();});
    }
  }
  stop(){this.playing=false;this.music.pause();this.applyLevels();}
}
