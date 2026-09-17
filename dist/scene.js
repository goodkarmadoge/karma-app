import * as THREE from './assets/three.module.js';

// Dream Loop-style scene: the supplied painting stays the source of truth while
// the shader gives it depth, water, and responsive air.
export class KarmaScene {
  constructor(canvas) {
    this.canvas = canvas; this.running = false; this.reduced = false; this.time = 0;
    this.frame = null; this.homeTime = 0; this.last = 0; this.slow = 0; this.lost = false;
    this.artTarget = 0; this.artPosition = 0; this.pointer = null; this.breeze = 0;
    this.ripples = Array.from({length: 6}, () => ({x: .5, y: .68, age: 99, strength: 0}));
    this.artworks = [
      {title: 'First light', description: 'Mist lifts from the mountain lake.'},
      {title: 'Deep water', description: 'The reflected valley settles into blue quiet.'},
      {title: 'Reed garden', description: 'A soft breeze moves through the foreground.'}
    ];
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, alpha: true, antialias: false, powerPreference: 'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.scene = new THREE.Scene();
    this.texture = await new THREE.TextureLoader().loadAsync('assets/stillness.webp'); this.texture.colorSpace = THREE.NoColorSpace;
    this.material = new THREE.ShaderMaterial({uniforms: {
      art: {value: this.texture}, resolution: {value: new THREE.Vector2()}, time: {value: 0}, motion: {value: 1},
      artProgress: {value: 0}, breeze: {value: 0}, rippleCenters: {value: this.ripples.map(r => new THREE.Vector2(r.x, r.y))},
      rippleAges: {value: this.ripples.map(r => r.age)}, rippleStrengths: {value: this.ripples.map(r => r.strength)}
    }, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`, fragmentShader: `precision highp float;
      uniform sampler2D art;uniform vec2 resolution;uniform float time;uniform float motion;uniform float artProgress;uniform float breeze;
      uniform vec2 rippleCenters[6];uniform float rippleAges[6];uniform float rippleStrengths[6];varying vec2 vUv;
      void main(){float imageAspect=2./3.;float aspect=resolution.x/resolution.y;vec2 uv=vUv;float anchor=resolution.x<=600.?0.:.42;
        if(aspect>imageAspect){float scale=imageAspect/aspect;uv.y=vUv.y*scale+(1.-scale)*anchor;}else{float scale=aspect/imageAspect;uv.x=(vUv.x-.5)*scale+.5;}
        vec2 original=uv;float journey=clamp(artProgress,0.,2.);float deep=smoothstep(0.,1.,journey);float reeds=smoothstep(1.,2.,journey);
        float zoom=1.+deep*.032+reeds*.045;uv=(uv-.5)/zoom+.5;uv.x+=deep*-.014+reeds*.018;uv.y+=deep*.012+reeds*-.018;
        float water=smoothstep(.04,.18,original.y)*(1.-smoothstep(.39,.47,original.y));float reedMask=smoothstep(.06,.28,original.x)*smoothstep(.51,.88,original.y);
        float wave=sin(original.y*180.+time*.65)*sin(original.x*16.+time*.21);float rustle=sin(time*1.7+original.y*23.)*.003*breeze*reedMask;
        uv.x+=(wave*.0018*water+rustle)*motion;uv.y+=sin(uv.x*47.+time*.37)*.0006*water*motion;vec3 color=texture2D(art,uv).rgb;
        float mistBand=exp(-pow((original.y-.44)/.04,2.));float mist=(sin(original.x*11.+time*.07)+sin(original.x*23.-time*.04))*.5+.5;
        color=mix(color,vec3(.957,.941,.902),max(0.,mist)*mistBand*.055*motion);color=mix(color,vec3(.69,.74,.75),deep*.065*water);color=mix(color,vec3(.90,.88,.80),reeds*.045*reedMask);
        vec3 rippleTint=vec3(.92,.94,.88);for(int i=0;i<6;i++){float age=rippleAges[i];float fade=1.-smoothstep(0.,2.8,age);float radius=age*.13;float distanceTo=distance(original,rippleCenters[i]);float ring=exp(-pow((distanceTo-radius)/.009,2.))*fade*rippleStrengths[i];float wake=exp(-pow((distanceTo-radius*.72)/.023,2.))*fade*rippleStrengths[i]*.24;color=mix(color,rippleTint,clamp(ring*.20+wake*.06,0.,.18));uv+=normalize(original-rippleCenters[i]+.0001)*(ring*.004+wake*.001)*water*motion;}
        gl_FragColor=vec4(color,1.);}`});
    this.geometry = new THREE.PlaneGeometry(2, 2); this.mesh = new THREE.Mesh(this.geometry, this.material); this.scene.add(this.mesh);
    this.resize = () => {if(this.lost)return;this.renderer.setSize(innerWidth,innerHeight,false);this.material.uniforms.resolution.value.set(innerWidth,innerHeight);this.draw();};
    addEventListener('resize', this.resize); this.resize(); this.canvas.classList.add('ready');
    this.canvas.addEventListener('webglcontextlost', e => {e.preventDefault();this.lost=true;this.stop();this.canvas.classList.remove('ready');});
    this.canvas.addEventListener('webglcontextrestored', () => {this.lost=false;this.resize();this.canvas.classList.add('ready');this.setActive(this.running);});
    this.bindInteraction(); this.emitArtwork();
  }

  bindInteraction() {
    this.canvas.addEventListener('pointerdown', event => {if(event.pointerType==='mouse'&&event.button!==0)return;this.pointer={startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};this.canvas.setPointerCapture?.(event.pointerId);this.addRipple(event,.9);},{passive:true});
    this.canvas.addEventListener('pointermove', event => {if(!this.pointer)return;const distance=Math.hypot(event.clientX-this.pointer.lastX,event.clientY-this.pointer.lastY);if(Math.hypot(event.clientX-this.pointer.startX,event.clientY-this.pointer.startY)>10)this.pointer.moved=true;if(distance>24){this.pointer.lastX=event.clientX;this.pointer.lastY=event.clientY;this.addRipple(event,.42);this.breeze=Math.min(1,this.breeze+.14);}},{passive:true});
    this.canvas.addEventListener('pointerup', event => {if(!this.pointer)return;const dx=event.clientX-this.pointer.startX,dy=event.clientY-this.pointer.startY;if(this.pointer.moved&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>42)this.shiftArtwork(dy<0?1:-1);this.pointer=null;},{passive:true});
    this.canvas.addEventListener('pointercancel', () => {this.pointer=null;});
    this.canvas.addEventListener('wheel', event => {event.preventDefault();this.shiftArtwork(event.deltaY>0?1:-1);},{passive:false});
    this.canvas.addEventListener('keydown', event => {if(event.key==='ArrowDown'||event.key==='PageDown'){event.preventDefault();this.shiftArtwork(1);}if(event.key==='ArrowUp'||event.key==='PageUp'){event.preventDefault();this.shiftArtwork(-1);}});
  }

  addRipple(event, strength) {const rect=this.canvas.getBoundingClientRect();const ripple=this.ripples.find(r=>r.age>2.4)||this.ripples[0];ripple.x=THREE.MathUtils.clamp((event.clientX-rect.left)/rect.width,.04,.96);ripple.y=THREE.MathUtils.clamp(1-(event.clientY-rect.top)/rect.height,.04,.96);ripple.age=0;ripple.strength=strength;}
  shiftArtwork(step) {const next=THREE.MathUtils.clamp(this.artTarget+step,0,this.artworks.length-1);if(next===this.artTarget)return;this.artTarget=next;this.emitArtwork();}
  emitArtwork() {const item=this.artworks[this.artTarget];this.canvas.dispatchEvent(new CustomEvent('artworkchange',{detail:{index:this.artTarget,...item}}));}
  setTime(time) {this.time=time;}
  setReduced(value) {this.reduced=value;if(!this.material)return;this.material.uniforms.motion.value=value?0:1;this.setActive(this.running);this.draw();}
  setActive(value) {this.running=value;this.stop();if(!this.renderer||this.lost)return;if(!value||this.reduced){this.draw();return;}this.last=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t));}
  stop() {if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
  draw() {if(this.renderer&&!this.lost)this.renderer.render(this.scene,this.camera);}
  loop(now) {if(!this.running||this.lost)return;const delta=now-this.last;this.last=now;if(document.body.dataset.state==='home')this.homeTime+=Math.min(delta,100)/1000;this.artPosition+=(this.artTarget-this.artPosition)*Math.min(1,delta/600);this.material.uniforms.time.value=document.body.dataset.state==='home'?this.homeTime:this.time;this.material.uniforms.artProgress.value=this.artPosition;this.material.uniforms.breeze.value=this.breeze;this.breeze*=Math.pow(.08,Math.min(1,delta/1000));this.ripples.forEach((r,i)=>{r.age+=delta/1000;this.material.uniforms.rippleCenters.value[i].set(r.x,r.y);this.material.uniforms.rippleAges.value[i]=r.age;this.material.uniforms.rippleStrengths.value[i]=r.strength;});this.draw();if(delta>34)this.slow++;else this.slow=0;if(this.slow>60){this.renderer.setPixelRatio(1);this.resize();this.slow=0;}this.frame=requestAnimationFrame(t=>this.loop(t));}
  dispose() {this.stop();removeEventListener('resize',this.resize);this.texture?.dispose();this.geometry?.dispose();this.material?.dispose();this.renderer?.dispose();}
}
