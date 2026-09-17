import * as THREE from './assets/three.module.js';

// Coordinates are in image UV space: (0,0) is the bottom-left of a painting.
// Each scene uses the actual source image; its motion is masked to the subject.
const S = (id,title,description,water,tree,leaves=0,tone=0,special=[0,0,0]) => ({id,title,description,water,tree,leaves,tone,special});
export const ARTWORKS = [
  S(15,'First light','Still water beneath the mountains.',[.03,.46],[.1,.11,.22,.19]),
  S(2,'Songbird','A golden bird rests among pine needles.',[0,0],[.77,.40,.30,.24],0,0,[1,.76,.40]),
  S(4,'Autumn leaves','Vermilion maple leaves drift down.',[.00,.17],[.82,.75,.34,.27],3),
  S(6,'Lakeside rest','A quiet shore opens across the lake.',[.04,.45],[.11,.13,.22,.20]),
  S(7,'Golden garden','Yellow leaves fall beside a garden bridge.',[.02,.45],[.22,.60,.34,.39],1),
  S(8,'Blossom lake','Pink blossoms frame clear still water.',[.04,.48],[.79,.51,.30,.30],2),
  S(9,'Lantern dusk','A lantern glows under red maple leaves.',[0,0],[.48,.60,.36,.30],3,1,[2,.53,.32]),
  S(11,'Lantern path','A warm light rests in the dark valley.',[.02,.22],[.24,.34,.28,.25],0,1,[2,.50,.24]),
  S(12,'Koi current','Koi drift through swirling water.',[.03,.93],[0,0,0,0],0,0,[3,.55,.55]),
  S(13,'Golden ridge','A yellow tree brightens the high cliffs.',[0,0],[.25,.22,.37,.31],1),
  S(17,'Lotus moon','A lotus rests beside the moonlit water.',[.03,.47],[.84,.19,.22,.21],0,1,[4,.25,.20]),
  S(18,'Kingfisher bamboo','A kingfisher waits among bamboo leaves.',[0,0],[.72,.56,.32,.43],0,0,[1,.59,.52])
];

export class KarmaScene {
  constructor(canvas) {
    this.canvas=canvas;this.running=false;this.reduced=false;this.time=0;this.frame=null;this.homeTime=0;this.last=0;this.slow=0;this.lost=false;
    this.index=0;this.nextIndex=0;this.progress=1;this.generation=0;this.pointer=null;this.shake=0;this.lastWheel=0;
    this.ripples=Array.from({length:5},()=>({x:.5,y:.3,age:99,strength:0}));this.cache=new Map();
  }
  async textureFor(index){
    if(this.cache.has(index))return this.cache.get(index);
    const path=`assets/artwork/${String(ARTWORKS[index].id).padStart(2,'0')}.webp`;
    const promise=new THREE.TextureLoader().loadAsync(path).then(texture=>{texture.colorSpace=THREE.NoColorSpace;return texture;});
    this.cache.set(index,promise);
    return promise;
  }
  async init(){
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.scene=new THREE.Scene();
    const first=await this.textureFor(0);
    const config=ARTWORKS[0];
    this.material=new THREE.ShaderMaterial({uniforms:{
      artA:{value:first},artB:{value:first},mixArt:{value:0},resolution:{value:new THREE.Vector2()},time:{value:0},motion:{value:1},
      waterA:{value:new THREE.Vector2(...config.water)},waterB:{value:new THREE.Vector2(...config.water)},
      treeA:{value:new THREE.Vector4(...config.tree)},treeB:{value:new THREE.Vector4(...config.tree)},
      leavesA:{value:config.leaves},leavesB:{value:config.leaves},toneA:{value:config.tone},toneB:{value:config.tone},
      specialA:{value:new THREE.Vector3(...config.special)},specialB:{value:new THREE.Vector3(...config.special)},shake:{value:0},
      rippleCenters:{value:this.ripples.map(r=>new THREE.Vector2(r.x,r.y))},rippleAges:{value:this.ripples.map(r=>r.age)},rippleStrengths:{value:this.ripples.map(r=>r.strength)}
    },vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`precision highp float;
      uniform sampler2D artA,artB;uniform vec2 resolution,waterA,waterB,rippleCenters[5];
      uniform vec4 treeA,treeB;uniform vec3 specialA,specialB;uniform float mixArt,time,motion,leavesA,leavesB,toneA,toneB,shake,rippleAges[5],rippleStrengths[5];varying vec2 vUv;
      float hash(float n){return fract(sin(n*127.1)*43758.5453);}
      vec2 cover(vec2 uv){float aspect=resolution.x/resolution.y;float imageAspect=2./3.;
        if(aspect>imageAspect){float scale=imageAspect/aspect;uv.y=uv.y*scale+(1.-scale)*(resolution.x<=600.?0.:.42);}
        else{float scale=aspect/imageAspect;uv.x=(uv.x-.5)*scale+.5;}return uv;}
      float treeMask(vec2 uv,vec4 tree){vec2 radius=max(tree.zw,vec2(.001));return (1.-smoothstep(.65,1.3,length((uv-tree.xy)/radius)))*step(.01,tree.z);}
      float waterMask(vec2 uv,vec2 band){return smoothstep(band.x,band.x+.03,uv.y)*(1.-smoothstep(band.y-.04,band.y,uv.y))*step(.02,band.y-band.x);}
      vec3 sampleScene(sampler2D painting,vec2 position,vec2 band,vec4 tree,float leafType,float dark,vec3 special){
        vec2 uv=position;float w=waterMask(position,band);float t=treeMask(position,tree);
        float ambient=sin(time*.72+position.y*28.)*.0008;
        uv.x+=(ambient+sin(time*12.+position.y*38.)*.006*shake)*t*motion;
        uv.x+=sin(position.y*145.+time*.8)*sin(position.x*12.+time*.18)*.0015*w*motion;
        uv.y+=sin(position.x*55.+time*.46)*.0007*w*motion;
        float subject=exp(-pow(length((position-special.yz)*vec2(1.5,1.0))/.10,2.));
        if(special.x>.5&&special.x<1.5)uv.y+=sin(time*1.25)*.0015*subject*motion;
        if(special.x>2.5&&special.x<3.5)uv.x+=sin(time*.85+position.y*12.)*.0025*subject*motion;
        float rings=0.;for(int i=0;i<5;i++){
          float age=rippleAges[i], fade=1.-smoothstep(0.,3.2,age);
          vec2 delta=position-rippleCenters[i];float d=length(delta*vec2(.62,1.75));
          float ring=exp(-pow((d-age*.13)/.012,2.))*fade*rippleStrengths[i]*w;
          rings+=ring;uv+=normalize(delta+vec2(.0001))*.0035*ring*motion;
        }
        vec3 color=texture2D(painting,clamp(uv,vec2(.001),vec2(.999))).rgb;
        color=mix(color,vec3(.93,.93,.87),clamp(rings*.25,0.,.25));
        if(leafType>.5){for(int j=0;j<9;j++){
          float id=float(j);float speed=.036+hash(id+3.)*.035;
          float y=fract(hash(id+31.)+time*speed*motion);
          float x=tree.x+(hash(id+13.)-.5)*tree.z*1.7+sin(time*.6+id*2.)*.026;
          vec2 p=position-vec2(x,1.-y);p.x+=p.y*.15;
          float shape=exp(-pow(p.x/.007,2.)-pow(p.y/.004,2.));
          vec3 leafColor=leafType<1.5?vec3(.83,.65,.18):leafType<2.5?vec3(.83,.51,.57):vec3(.68,.23,.16);
          color=mix(color,leafColor,shape*.55*motion);
        }}
        if(special.x>1.5&&special.x<2.5)color=mix(color,vec3(1.,.48,.20),subject*(.028+.012*sin(time*1.4))*motion);
        if(special.x>3.5)color=mix(color,vec3(1.,.65,.55),subject*(.018+.008*sin(time*.9))*motion);
        if(dark>.5)color=mix(color,vec3(.50,.58,.70),.018);
        return color;
      }
      void main(){vec2 position=cover(vUv);vec3 a=sampleScene(artA,position,waterA,treeA,leavesA,toneA,specialA);
        vec3 b=sampleScene(artB,position,waterB,treeB,leavesB,toneB,specialB);
        float blend=smoothstep(0.,1.,mixArt);gl_FragColor=vec4(mix(a,b,blend),1.);}`});
    this.geometry=new THREE.PlaneGeometry(2,2);this.mesh=new THREE.Mesh(this.geometry,this.material);this.scene.add(this.mesh);
    this.resize=()=>{if(this.lost)return;this.renderer.setSize(innerWidth,innerHeight,false);this.material.uniforms.resolution.value.set(innerWidth,innerHeight);this.draw();};
    addEventListener('resize',this.resize);this.resize();this.canvas.classList.add('ready');
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.stop();this.canvas.classList.remove('ready');});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.resize();this.canvas.classList.add('ready');this.setActive(this.running);});
    this.bindInteraction();this.emitArtwork();void this.textureFor(1);
  }
  imagePoint(event){const rect=this.canvas.getBoundingClientRect();let x=(event.clientX-rect.left)/rect.width,y=1-(event.clientY-rect.top)/rect.height;const aspect=rect.width/rect.height;
    if(aspect>2/3){const scale=(2/3)/aspect;y=y*scale+(1-scale)*(rect.width<=600?0:.42);}else{x=(x-.5)*(aspect/(2/3))+.5;}return {x,y};}
  treeHit(point){const tree=ARTWORKS[this.index].tree;if(tree[2]===0)return false;return Math.hypot((point.x-tree[0])/tree[2],(point.y-tree[1])/tree[3])<1.25;}
  waterHit(point){const [low,high]=ARTWORKS[this.index].water;return high>low&&point.y>=low&&point.y<=high;}
  bindInteraction(){
    this.canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;
      this.pointer={startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};this.canvas.setPointerCapture?.(event.pointerId);
      const point=this.imagePoint(event);if(this.treeHit(point))this.shake=1;else if(this.waterHit(point))this.addRipple(point,.9);
    },{passive:true});
    this.canvas.addEventListener('pointermove',event=>{if(!this.pointer)return;const p=this.pointer;
      if(Math.hypot(event.clientX-p.startX,event.clientY-p.startY)>12)p.moved=true;
      if(Math.hypot(event.clientX-p.lastX,event.clientY-p.lastY)>26){p.lastX=event.clientX;p.lastY=event.clientY;const point=this.imagePoint(event);if(this.treeHit(point))this.shake=Math.min(1,this.shake+.25);else if(this.waterHit(point))this.addRipple(point,.35);}
    },{passive:true});
    this.canvas.addEventListener('pointerup',event=>{if(!this.pointer)return;const dx=event.clientX-this.pointer.startX,dy=event.clientY-this.pointer.startY;
      if(this.pointer.moved&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>48)this.shiftArtwork(dy<0?1:-1);this.pointer=null;
    },{passive:true});
    this.canvas.addEventListener('pointercancel',()=>{this.pointer=null;});
    this.canvas.addEventListener('wheel',event=>{event.preventDefault();const now=performance.now();if(now-this.lastWheel<650)return;this.lastWheel=now;this.shiftArtwork(event.deltaY>0?1:-1);},{passive:false});
    this.canvas.addEventListener('keydown',event=>{if(['ArrowDown','PageDown','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();this.shiftArtwork(event.key.endsWith('Down')?1:-1);}});
  }
  addRipple(point,strength){if(this.reduced)return;const r=this.ripples.find(item=>item.age>2.5)||this.ripples[0];Object.assign(r,{x:point.x,y:point.y,age:0,strength});}
  async shiftArtwork(step){const next=THREE.MathUtils.clamp(this.nextIndex+step,0,ARTWORKS.length-1);if(next===this.nextIndex)return;
    const token=++this.generation;let texture;try{texture=await this.textureFor(next);}catch{return;}if(token!==this.generation)return;
    const uniforms=this.material.uniforms;const previous=this.progress>=.5?this.nextIndex:this.index;
    this.index=previous;this.nextIndex=next;this.progress=0;this.shake=0;
    const a=ARTWORKS[previous],b=ARTWORKS[next];
    uniforms.artA.value=await this.textureFor(previous);uniforms.artB.value=texture;uniforms.mixArt.value=0;
    uniforms.waterA.value.set(...a.water);uniforms.waterB.value.set(...b.water);uniforms.treeA.value.set(...a.tree);uniforms.treeB.value.set(...b.tree);
    uniforms.specialA.value.set(...a.special);uniforms.specialB.value.set(...b.special);
    uniforms.leavesA.value=a.leaves;uniforms.leavesB.value=b.leaves;uniforms.toneA.value=a.tone;uniforms.toneB.value=b.tone;
    this.index=next;if(this.reduced){this.progress=1;uniforms.mixArt.value=1;this.draw();}
    this.emitArtwork();void this.textureFor(Math.min(next+1,ARTWORKS.length-1));
  }
  emitArtwork(){const item=ARTWORKS[this.nextIndex];this.canvas.dispatchEvent(new CustomEvent('artworkchange',{detail:{index:this.nextIndex,count:ARTWORKS.length,title:item.title,description:item.description,tone:item.tone}}));}
  setTime(time){this.time=time;}
  setReduced(value){this.reduced=value;if(!this.material)return;this.material.uniforms.motion.value=value?0:1;this.setActive(this.running);this.draw();}
  setActive(value){this.running=value;this.stop();if(!this.renderer||this.lost)return;if(!value||this.reduced){this.draw();return;}this.last=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t));}
  stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
  draw(){if(this.renderer&&!this.lost)this.renderer.render(this.scene,this.camera);}
  loop(now){if(!this.running||this.lost)return;const delta=Math.min(100,now-this.last);this.last=now;
    if(document.body.dataset.state==='home')this.homeTime+=delta/1000;
    this.material.uniforms.time.value=document.body.dataset.state==='home'?this.homeTime:this.time;
    this.progress=Math.min(1,this.progress+delta/1150);this.material.uniforms.mixArt.value=this.progress;
    this.shake*=Math.exp(-delta/340);this.material.uniforms.shake.value=this.shake;
    this.ripples.forEach((r,i)=>{r.age+=delta/1000;this.material.uniforms.rippleCenters.value[i].set(r.x,r.y);this.material.uniforms.rippleAges.value[i]=r.age;this.material.uniforms.rippleStrengths.value[i]=r.strength;});
    this.draw();if(delta>34)this.slow++;else this.slow=0;if(this.slow>60){this.renderer.setPixelRatio(1);this.resize();this.slow=0;}this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  dispose(){this.stop();removeEventListener('resize',this.resize);for(const value of this.cache.values())value.then(t=>t.dispose()).catch(()=>{});this.geometry?.dispose();this.material?.dispose();this.renderer?.dispose();}
}
