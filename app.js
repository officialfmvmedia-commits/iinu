import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/* ---------- Setup ---------- */
const params=new URLSearchParams(location.search);
const reduceMQ=matchMedia('(prefers-reduced-motion: reduce)');
const reduce=reduceMQ.matches||params.has('reduced');
const skipIntro=reduce||params.get('intro')==='0'||params.has('scroll')||params.has('live')||(!!location.hash&&params.get('intro')!=='1');
const body=document.body,intro=document.querySelector('#intro'),barFill=document.querySelector('#bar-fill'),note=document.querySelector('#intro-note');
// dtcap: test-only override of the per-frame time cap (lets slow headless renders keep real-time pace)
const DTCAP=Math.min(.5,Number(params.get('dtcap'))||.05);
if('scrollRestoration' in history)history.scrollRestoration='manual';

const canvas=document.querySelector('#stage');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight,false);renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;

const scene=new T.Scene();
const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=0;
const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.1,100);

// Lights: a key spot that sweeps on, two rims, a soft fill.
const hemi=new T.HemisphereLight(0xffffff,0x202024,0);scene.add(hemi);
const key=new T.SpotLight(0xfff3e6,0,40,.5,.75,0);key.position.set(-10,9,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0004;key.shadow.normalBias=.03;key.shadow.radius=6;scene.add(key,key.target);key.target.position.set(0,1,0);
const rimL=new T.DirectionalLight(0x9cc3ff,0);rimL.position.set(-6,4,-7);scene.add(rimL);
const rimR=new T.DirectionalLight(0xffc49a,0);rimR.position.set(7,3,-5);scene.add(rimR);
const fill=new T.DirectionalLight(0xffffff,0);fill.position.set(3,2,8);scene.add(fill);

// Stage: shadow catcher plus a soft pool of light.
const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({opacity:0,transparent:true}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const poolTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=g.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,256,256);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t})();
const pool=new T.Mesh(new T.PlaneGeometry(9,9),new T.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,depthWrite:false,color:0x3a3633,blending:T.AdditiveBlending}));pool.rotation.x=-Math.PI/2;pool.position.y=.002;scene.add(pool);

// Gloss: a faint mirror of the Inu in the floor, faded out with depth below the floor line.
// Drawn as a cheap second pass of the dog only (no extra render targets), then the normal scene on top.
const fadeQ=new T.Mesh(new T.PlaneGeometry(80,12),new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,
  blending:T.CustomBlending,blendSrc:T.ZeroFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor,
  vertexShader:'varying float vy;void main(){vec4 w=modelMatrix*vec4(position,1.);vy=w.y;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:'varying float vy;void main(){gl_FragColor=vec4(0.,0.,0.,smoothstep(-.02,-1.25,vy));}'}));
fadeQ.position.set(0,-6,.5);fadeQ.renderOrder=999;fadeQ.visible=false;fadeQ.frustumCulled=false;scene.add(fadeQ);
function renderStage(){
  const op=floor.material.opacity;
  if(dog&&op>.02&&!reduce){
    renderer.shadowMap.autoUpdate=false;mover.scale.y=-1;mover.updateMatrixWorld(true);floor.visible=pool.visible=false;fadeQ.visible=true;
    renderer.toneMappingExposure=1.05*.42*(op/.55);renderer.render(scene,camera);
    mover.scale.y=1;mover.updateMatrixWorld(true);floor.visible=pool.visible=true;fadeQ.visible=false;renderer.toneMappingExposure=1.05;renderer.shadowMap.autoUpdate=true;
    renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;
  }else renderer.render(scene,camera);
}

/* ---------- Camera states, one per section ---------- */
const S=(p,t,r,s,pose='standing')=>({p:new T.Vector3(...p),t:new T.Vector3(...t),r,s,pose});
const TAU=Math.PI*2;// r=0 faces the camera, +r turns the Inu toward screen-right
const CAM={
  intro: S([0,.9,17],[0,1.25,0],1.7,0),
  hero:  S([0,1.95,9.2],[0,1.95,0],.55,0),
  design:S([0,1.6,9.2],[0,1.25,0],-.5,.22),
  sit:   S([0,2.3,9.4],[0,1.1,0],.65,-.22,'sitting'),
  specs: S([0,3.4,14],[0,1.2,0],.2-TAU,0),
  hello: S([0,1.6,8.6],[0,1.25,0],-.35-TAU,.22,'shake'),
  name:  S([0,1.9,9.6],[0,1.25,0],.6-TAU,-.22),
};
const sections=[...document.querySelectorAll('[data-cam]')];
let anchors=[];
function measure(){anchors=sections.map((el,i)=>({y:i===0?0:el.offsetTop+el.offsetHeight/2-innerHeight/2,c:CAM[el.dataset.cam]}))}
const ss=x=>x*x*(3-2*x),clamp01=x=>Math.min(1,Math.max(0,x));
const easeIO=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,easeOut=x=>1-Math.pow(1-x,3);
const tmp={p:new T.Vector3(),t:new T.Vector3(),r:0,s:0,pose:'standing'};
function scrollState(out){
  const y=scrollY;let a=anchors[0],b=anchors[0],f=0;
  for(let i=0;i<anchors.length;i++){if(y>=anchors[i].y){a=anchors[i];b=anchors[i+1]||anchors[i]}}
  if(b!==a)f=ss(clamp01((y-a.y)/(b.y-a.y)));
  out.p.lerpVectors(a.c.p,b.c.p,f);out.t.lerpVectors(a.c.t,b.c.t,f);out.r=a.c.r+(b.c.r-a.c.r)*f;out.s=a.c.s+(b.c.s-a.c.s)*f;out.pose=f<.5?a.c.pose:b.c.pose;
  if(innerWidth<760){out.s=0;out.p.sub(out.t).multiplyScalar(1.6).add(out.t);out.t.y+=1.0}
  return out;
}

/* ---------- Model ---------- */
const mover=new T.Group();scene.add(mover);
const bones={legs:[]};let dog=null,mixer=null,actions={},current='',loadDone=false,loadFailed=false,progress=0;
const manager=new T.LoadingManager();manager.onProgress=(u,l,t)=>{progress=Math.max(progress,l/t)};
// Smooth, eased blends: every running action's weight is driven by us (sum always 1), with a smoothstep curve,
// so poses ease in and out of each other instead of snapping. An action that is already fading is never reset.
let blend=null;
function play(name,{fade=.6,time=null,once=null}={}){
  if(!actions[name]||current===name)return;
  const next=actions[name];current=name;
  const one=once??(name==='sitting'||name==='play_dead'||name==='rollover');
  const live=Object.values(actions).filter(a=>a!==next&&(a.isRunning()||a.paused)&&a.isScheduled()&&a.getEffectiveWeight()>1e-3);
  const nw=next.isScheduled()?next.getEffectiveWeight():0;
  next.stopFading();next.setLoop(one?T.LoopOnce:T.LoopRepeat,one?1:Infinity);next.clampWhenFinished=one;next.setEffectiveTimeScale(1);
  if(nw<1e-3){next.reset();next.time=time??0}else{next.paused=false;if(time!=null&&nw<.05)next.time=time}
  next.enabled=true;next.setEffectiveWeight(nw);next.play();
  if(reduce||!live.length||fade<=0){live.forEach(a=>a.stop());next.setEffectiveWeight(1);blend=null;return}
  live.forEach(a=>a.stopFading());
  blend={next,from:live.map(a=>[a,a.getEffectiveWeight()]),n0:nw,t:0,dur:fade};
}
function stepBlend(dt){
  if(!blend)return;if(!blend.next.isScheduled()){blend=null;return}blend.t+=dt;const k=Math.min(1,blend.t/blend.dur),e=k*k*(3-2*k);
  const nw=blend.n0+(1-blend.n0)*e;blend.next.setEffectiveWeight(nw);
  let tot=0;blend.from.forEach(([a,w0])=>tot+=w0);const rest=1-nw;
  blend.from.forEach(([a,w0])=>a.setEffectiveWeight(tot>0?rest*w0/tot:0));
  if(k>=1){blend.from.forEach(([a])=>{a.setEffectiveWeight(0);a.stop()});blend.next.setEffectiveWeight(1);blend=null}
}
new GLTFLoader(manager).load('shiba.gltf',g=>{
  dog=g.scene;mover.rotation.set(0,0,0);mover.updateMatrixWorld(true);mover.add(dog);mixer=new T.AnimationMixer(dog);{const up=mixer.update.bind(mixer);mixer.update=dt=>{stepBlend(dt);return up(dt)}}g.animations.forEach(c=>actions[c.name]=mixer.clipAction(c));
  play('standing');mixer.update(.5);dog.updateMatrixWorld(true);
  // Normalise size and orientation (same approach as the original scene).
  const box=new T.Box3().setFromObject(dog),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=2.5/size.y;
  dog.scale.multiplyScalar(scale);dog.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);dog.updateMatrixWorld(true);
  const find=s=>{let b;dog.traverse(n=>{if(n.name.startsWith(s))b=n});return b};
  const head=find('head_jnt'),pelvis=find('pelvis_jnt');
  if(head&&pelvis){dog.updateMatrixWorld(true);const f=head.getWorldPosition(new T.Vector3()).sub(pelvis.getWorldPosition(new T.Vector3()));f.y=0;dog.rotation.y-=Math.atan2(f.x,f.z);dog.updateMatrixWorld(true);
    // re-centre the body on the turntable axis after turning
    const b2=new T.Box3().setFromObject(dog),c2=b2.getCenter(new T.Vector3());dog.position.x-=c2.x;dog.position.z-=c2.z}
  dog.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;if(n.material)n.material.envMapIntensity=1}});
  bones.head=find('head_jnt');bones.neckMid=find('neck_mid_jnt');bones.neckBase=find('neck_base_jnt');bones.chest=find('chest_jnt');
  [['L_shoulder_jnt','L_elbow_jnt',0],['R_shoulder_jnt','R_elbow_jnt',Math.PI],['L_hip_jnt','L_knee_jnt',Math.PI/2],['R_hip_jnt','R_knee_jnt',Math.PI*1.5]].forEach(([a,b,p])=>{const upper=find(a),lower=find(b);if(upper&&lower)bones.legs.push({upper,lower,p})});
  loadDone=true;progress=1;if(params.has('debug'))window.__dbg={T,dog,mixer,actions,mover,scene,camera,renderer,bones,play};onModelReady();
},e=>{if(e.total)progress=Math.max(progress,e.loaded/e.total*.15)},err=>{console.error(err);loadFailed=true;loadDone=true;note.textContent='iINU couldn’t load. Refresh to try again.'});

/* ---------- Intro timeline ---------- */
let reveal=skipIntro?1:0,revealStart=-1,introOver=false;const REVEAL_MS=3600;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let skipped=false;
function finishIntro(){
  if(introOver)return;introOver=true;
  intro.classList.add('done');body.classList.add('staged','revealed');body.classList.remove('locked');
  removeEventListener('keydown',onSkip);intro.removeEventListener('pointerdown',onSkip);
  measure();jumpToRequested();if(typeof liveReady==='function')setTimeout(liveReady,0);
}
function onSkip(e){if(e&&e.type==="keydown"&&!e.metaKey&&!e.ctrlKey)e.preventDefault();if(skipped)return;skipped=true;intro.classList.add('instant');reveal=1;finishIntro()}
async function runIntro(){
  addEventListener('keydown',onSkip);intro.addEventListener('pointerdown',onSkip);
  await wait(350);if(skipped)return;intro.classList.add('g-in');
  await wait(1300);if(skipped)return;
  if(!loadDone)intro.classList.add('loading');
  const t0=performance.now();
  while(!loadDone&&!skipped)await wait(100);
  if(skipped)return;
  barFill.style.width='100%';if(intro.classList.contains('loading'))await wait(500);
  const held=performance.now()-t0;await wait(Math.max(0,900-held));if(skipped)return;
  intro.classList.add('g-out');
  await wait(650);if(skipped)return;intro.classList.add('w-in');
  await wait(2500);if(skipped)return;intro.classList.add('w-out');
  await wait(500);if(skipped)return;
  body.classList.add('staged');revealStart=performance.now();
  intro.classList.add('done');
  await wait(REVEAL_MS*.62);if(skipped)return;body.classList.add('revealed');
  await wait(REVEAL_MS*.4);if(skipped)return;finishIntro();
}
setInterval(()=>{if(!loadDone)progress=Math.min(.92,progress+(.92-progress)*.04);barFill.style.width=(progress*100).toFixed(1)+'%'},120);

function jumpToRequested(){
  const y=Number(params.get('scroll'));
  if(Number.isFinite(y)&&y>0){scrollTo({top:y,behavior:'instant'});snap=true}
  else if(location.hash){const el=document.querySelector(location.hash);if(el){el.scrollIntoView({behavior:'instant',block:'center'});snap=true}}
}

/* ---------- Scroll niceties ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.25});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const cta=document.querySelector('#meet');
const navIO=new IntersectionObserver(([e])=>body.classList.toggle('light-nav',e.boundingClientRect.top<52&&e.boundingClientRect.bottom>52),{threshold:[0,.01,.1,.5,1],rootMargin:'0px'});
navIO.observe(cta);
addEventListener('scroll',()=>{const r=cta.getBoundingClientRect();body.classList.toggle('light-nav',r.top<52)},{passive:true});
document.querySelector('#replay').addEventListener('click',e=>{e.preventDefault();location.href=location.pathname+'?intro=1'});

let pointerX=0,pointerY=0;addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5},{passive:true});

/* ---------- Render loop ---------- */
const cur={p:CAM.intro.p.clone(),t:CAM.intro.t.clone(),r:CAM.intro.r,s:0};
let snap=true;const clock=new T.Clock();let elapsed=0;
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);measure()}
addEventListener('resize',resize);
function tick(){
  requestAnimationFrame(tick);
  if(window.__freeze)return;
  const dt=Math.min(clock.getDelta(),DTCAP);elapsed+=dt;
  if(live.on){liveTick(dt);renderer.render(scene,camera);return}
  if(liveMod&&introOver&&liveMod.preview(dt))return;
  if(revealStart>=0&&reveal<1)reveal=clamp01((performance.now()-revealStart)/REVEAL_MS);
  const e=easeIO(reveal),lk=easeOut(clamp01(reveal*1.25));
  // Lights sweep on.
  key.intensity=5.2*lk;key.position.x=-10+12*easeOut(reveal);
  rimL.intensity=2.4*clamp01(reveal*1.6-.3);rimR.intensity=1.6*clamp01(reveal*1.6-.45);
  fill.intensity=.55*lk;hemi.intensity=.35*lk;scene.environmentIntensity=.55*lk;
  floor.material.opacity=.55*lk;pool.material.opacity=lk;
  // Camera: intro pose eases into the scroll-driven product pose.
  const target=scrollState(tmp);
  const gp=CAM.intro.p.clone().lerp(target.p,e),gt=CAM.intro.t.clone().lerp(target.t,e),gr=CAM.intro.r+(target.r-CAM.intro.r)*e,gs=target.s*e;
  const k=snap||reduce||!introOver?1:1-Math.exp(-dt*5);
  cur.p.lerp(gp,k);cur.t.lerp(gt,k);cur.r+=(gr-cur.r)*k;cur.s+=(gs-cur.s)*k;snap=false;
  const sway=reduce?0:Math.sin(elapsed*.45)*.05;
  const par=reduce||!introOver?0:1;
  camera.position.copy(cur.p).add(new T.Vector3(pointerX*.6*par,-pointerY*.3*par,0));
  camera.lookAt(cur.t);
  camera.setViewOffset(innerWidth,innerHeight,-cur.s*innerWidth,0,innerWidth,innerHeight);
  mover.rotation.y=cur.r+sway;
  if(dog){if(introOver)play(target.pose);mixer.update(reduce&&current==='standing'?0:dt)}
  // Stop rendering when the closing section covers the stage.
  if(cta.getBoundingClientRect().top>0||!introOver)renderStage();
}
/* ---------- Live: the living space ---------- */
import('./live.js').then(m=>{liveMod=m.createLive({T,scene,camera,renderer,canvas,mover,bones,actions,play,getDog:()=>dog,getMixer:()=>mixer,reduce,stageLights:{hemi,key,rimL,rimR,fill,floor,pool},onExit:()=>{snap=true;mover.position.set(0,0,0)}});liveReady()});
let liveMod=null;const live={get on(){return !!liveMod?.isOn()}};
function liveTick(dt){liveMod.tick(dt,elapsed)}
if(params.has('debug'))window.__advance=(sec,step=1/30,nr)=>{for(let t=0;t<sec-1e-6;t+=step)liveTick(step);if(!nr)renderer.render(scene,camera)};
let wantLive=params.has('live');
function onModelReady(){liveReady()}
function liveReady(){if(wantLive&&liveMod&&dog&&introOver){wantLive=false;liveMod.open({instant:true})}}
document.querySelectorAll('[data-live]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();if(!liveMod||!dog)return;liveMod.open({from:document.querySelector('#live-open')})}));

measure();
if(skipIntro){intro.classList.add('instant');finishIntro()}else runIntro();
tick();
window.iinuState=()=>({live:liveMod?.state?.()||null,loaded:!!dog,failed:loadFailed,reveal,introOver,pose:current,scrollY,cam:cur.p.toArray(),rot:cur.r});
reduceMQ.addEventListener?.('change',()=>location.reload());
