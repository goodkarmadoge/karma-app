// Narration is the timeline owner. The optional music follows its position.
export class AudioMixer {
  constructor(voice,music,onError=()=>{}) {
    this.voice=voice;this.music=music;this.onError=onError;this.context=null;
    this.voiceGain=null;this.musicGain=null;this.playing=false;this.failed=false;
    this.musicStarting=false;this.settings={volume:1,muted:false,musicMuted:false,musicVolume:.22};
    this.speaking=false;this.position=0;this.lastTarget=null;
    music.addEventListener('error',()=>this.musicError());
  }
  unlock() {
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!this.context&&Context){
      this.context=new Context();
      this.voiceGain=this.context.createGain();this.musicGain=this.context.createGain();
      this.context.createMediaElementSource(this.voice).connect(this.voiceGain).connect(this.context.destination);
      this.context.createMediaElementSource(this.music).connect(this.musicGain).connect(this.context.destination);
      this.voice.volume=1;this.music.volume=1;this.musicGain.gain.value=0;this.lastTarget=null;
    }
    this.applySettings(this.settings);
    return this.context?.state==='suspended'?this.context.resume():Promise.resolve();
  }
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
  setGain(node,value){
    if(!node)return;
    node.gain.cancelScheduledValues(this.context.currentTime);
    node.gain.setTargetAtTime(value,this.context.currentTime,.18);
  }
  applyLevels(){
    const s=this.settings;
    // Let the opening cue ring out; fade music in from 6s, and out at the end.
    const envelope=Math.min(1,Math.max(0,(this.position-6)/6),Math.max(0,(300-this.position)/7));
    const voice=s.muted?0:s.volume;
    const music=(!this.playing||s.muted||s.musicMuted)?0:s.musicVolume*envelope*(this.speaking?.45:1);
    const target=[voice,music];
    if(this.voiceGain){
      if(!this.lastTarget||Math.abs(voice-this.lastTarget[0])>.001)this.setGain(this.voiceGain,voice);
      if(!this.lastTarget||Math.abs(music-this.lastTarget[1])>.001)this.setGain(this.musicGain,music);
    }else{this.voice.volume=voice;this.music.volume=music;}
    this.lastTarget=target;
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
