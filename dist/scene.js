import * as THREE from './assets/three.module.js';
export class KarmaScene{
  constructor(canvas){this.canvas=canvas;this.running=false;this.reduced=false;this.time=0;this.frame=null;this.homeTime=0;this.last=0;this.slow=0;this.lost=false;}
  async init(){
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.scene=new THREE.Scene();
    this.texture=await new THREE.TextureLoader().loadAsync('assets/stillness.webp');
    // Preserve artwork values: shader samples stored sRGB bytes directly.
    this.texture.colorSpace=THREE.NoColorSpace;
    this.material=new THREE.ShaderMaterial({uniforms:{art:{value:this.texture},resolution:{value:new THREE.Vector2()},time:{value:0},motion:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`precision highp float;
      uniform sampler2D art;uniform vec2 resolution;uniform float time;uniform float motion;varying vec2 vUv;
      void main(){
        float imageAspect=2./3.;float aspect=resolution.x/resolution.y;
        vec2 uv=vUv;float anchor=resolution.x<=600.?0.:.42;
        if(aspect>imageAspect){float scale=imageAspect/aspect;uv.y=vUv.y*scale+(1.-scale)*anchor;}
        else{float scale=aspect/imageAspect;uv.x=(vUv.x-.5)*scale+.5;}
        vec2 original=uv;
        float water=smoothstep(.04,.18,uv.y)*(1.-smoothstep(.39,.46,uv.y));
        float reeds=smoothstep(.10,.38,uv.x);
        float wave=sin(uv.y*180.+time*.65)*sin(uv.x*16.+time*.21);
        uv.x+=wave*.0018*water*reeds*motion;
        uv.y+=sin(uv.x*47.+time*.37)*.0006*water*reeds*motion;
        vec3 color=texture2D(art,uv).rgb;
        float mistBand=exp(-pow((original.y-.44)/.04,2.));
        float mist=(sin(original.x*11.+time*.07)+sin(original.x*23.-time*.04))*.5+.5;
        color=mix(color,vec3(.957,.941,.902),max(0.,mist)*mistBand*.055*motion);
        gl_FragColor=vec4(color,1.);
      }`});
    this.geometry=new THREE.PlaneGeometry(2,2);this.mesh=new THREE.Mesh(this.geometry,this.material);this.scene.add(this.mesh);
    this.resize=()=>{if(this.lost)return;this.renderer.setSize(innerWidth,innerHeight,false);this.material.uniforms.resolution.value.set(innerWidth,innerHeight);this.draw();};
    addEventListener('resize',this.resize);this.resize();this.canvas.classList.add('ready');
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.stop();this.canvas.classList.remove('ready');});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.resize();this.canvas.classList.add('ready');this.setActive(this.running);});
  }
  setTime(time){this.time=time;}
  setReduced(value){this.reduced=value;if(!this.material)return;this.material.uniforms.motion.value=value?0:1;this.setActive(this.running);this.draw();}
  setActive(value){this.running=value;this.stop();if(!this.renderer||this.lost)return;if(!value||this.reduced){this.draw();return;}this.last=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t));}
  stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
  draw(){if(this.renderer&&!this.lost)this.renderer.render(this.scene,this.camera);}
  loop(now){
    if(!this.running||this.reduced||this.lost)return;
    const delta=now-this.last;this.last=now;
    if(document.body.dataset.state==='home')this.homeTime+=Math.min(delta,100)/1000;
    this.material.uniforms.time.value=document.body.dataset.state==='home'?this.homeTime:this.time;
    this.draw();
    if(delta>34)this.slow++;else this.slow=0;
    if(this.slow>60){this.renderer.setPixelRatio(1);this.resize();this.slow=0;}
    this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  dispose(){this.stop();removeEventListener('resize',this.resize);this.texture?.dispose();this.geometry?.dispose();this.material?.dispose();this.renderer?.dispose();}
}
