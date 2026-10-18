// iINU Live: a calm room where the Inu lives its own little routine, watches you, and listens.
import {createVoice} from './voice.js';
import {createSound} from './sound.js';
export function createLive(ctx){
const {T,scene,camera,canvas,mover,bones,actions,play,getDog,getMixer,reduce,stageLights,onExit}=ctx;
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const $=s=>document.querySelector(s);
const body=document.body,ui=$('#live-ui'),shell=$('#live-shell'),activity=$('#live-activity'),hint=$('#live-hint');
const BG=new T.Color('#e9e6e1');
const rand=(a,b)=>a+Math.random()*(b-a),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),damp=(a,b,l,dt)=>a+(b-a)*(1-Math.exp(-l*dt));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)},posmod=(a,m)=>((a%m)+m)%m;
const perf=()=>performance.now();

/* ---------- Room ---------- */
const room=new T.Group();room.visible=false;scene.add(room);
const matte=(c,r=.95)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:0});
const fabric=(c,sh='#eef2e8')=>new T.MeshPhysicalMaterial({color:c,roughness:.9,metalness:0,sheen:.45,sheenRoughness:.7,sheenColor:new T.Color(sh)});
const ground=new T.Mesh(new T.CircleGeometry(40,96),matte('#e6e2dc',1));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;room.add(ground);
const rug=new T.Mesh(new T.CircleGeometry(3.6,96),matte('#ddd6cb',1));rug.rotation.x=-Math.PI/2;rug.position.set(.6,.004,.4);rug.receiveShadow=true;room.add(rug);
const BEDC=V(-3.7,0,-1.5),BOWL=V(3.3,0,1.7),PLANT=V(4.9,0,-2.9),BALL=V(1.4,0,-2.4);
// bed: a plush horseshoe bolster with a low front lip, opening toward the room
const BED_OPEN=Math.atan2(.6-BEDC.x,1.4-BEDC.z),openDir=V(Math.sin(BED_OPEN),0,Math.cos(BED_OPEN));
const BED_IN=BEDC.clone().addScaledVector(openDir,.22),BED_OUT=BEDC.clone().addScaledVector(openDir,3.1);
const bed=new T.Group();bed.position.copy(BEDC);room.add(bed);
{
  const shellC=fabric('#98a88d'),cushC=fabric('#c0cab3'),baseC=fabric('#8d9c83');
  const base=new T.Mesh(new T.CylinderGeometry(2.25,2.3,.12,96),baseC);base.position.y=.06;
  const prof=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI/2;prof.push(new T.Vector2(1.6+Math.sin(a)*.2,.12+Math.cos(a)*.13))}prof.unshift(new T.Vector2(0,.25));prof.push(new T.Vector2(1.8,.1));
  const cushion=new T.Mesh(new T.LatheGeometry(prof.map((p,i)=>i===0?p:p),96),cushC);
  const R=1.95,r=.3,gap=1.25,arc=Math.PI*2-gap;
  const bol=new T.Mesh(new T.TorusGeometry(R,r,32,160,arc),shellC);bol.rotation.x=Math.PI/2;bol.position.y=.36;
  const lip=new T.Mesh(new T.TorusGeometry(R,.14,24,60,gap),shellC);lip.rotation.x=Math.PI/2;lip.rotation.z=arc;lip.position.y=.2;
  const holder=new T.Group();holder.add(bol,lip);
  for(const a of [0,arc]){const cap=new T.Mesh(new T.SphereGeometry(r,32,20),shellC);cap.position.set(Math.cos(a)*R,.36,Math.sin(a)*R);cap.scale.set(1,1,1);holder.add(cap)}
  // torus angle θ sits at local (cosθ, sinθ) in XZ; rotate so the gap centre faces the room
  const gapMid=arc+gap/2,want=Math.atan2(openDir.z,openDir.x);holder.rotation.y=gapMid-want;
  [base,cushion].forEach(m=>bed.add(m));bed.add(holder);
  bed.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
}
// bowl: white ceramic with water
const bowl=new T.Group();bowl.position.copy(BOWL);room.add(bowl);
const ceramic=new T.MeshStandardMaterial({color:'#f6f4f0',roughness:.35});
const bprof=[[0,0],[.3,0],[.34,.02],[.44,.2],[.46,.24],[.42,.25],[.33,.07],[0,.07]].map(([x,y])=>new T.Vector2(x,y));
const shellM=new T.Mesh(new T.LatheGeometry(bprof,64),ceramic);shellM.castShadow=true;shellM.receiveShadow=true;bowl.add(shellM);
const water=new T.Mesh(new T.CircleGeometry(.39,48),new T.MeshStandardMaterial({color:'#cfdde0',roughness:.1}));water.rotation.x=-Math.PI/2;water.position.y=.17;bowl.add(water);
// plant: terracotta pot, a few soft leaves
const plant=new T.Group();plant.position.copy(PLANT);room.add(plant);
const pot=new T.Mesh(new T.CylinderGeometry(.58,.44,1.05,48),matte('#d9c2ae',.9));pot.position.y=.525;pot.castShadow=true;pot.receiveShadow=true;plant.add(pot);
const soil=new T.Mesh(new T.CircleGeometry(.54,32),matte('#8a7766',1));soil.rotation.x=-Math.PI/2;soil.position.y=1.0;plant.add(soil);
const leafG=new T.SphereGeometry(1,24,16);
for(let i=0;i<11;i++){const a=i/11*Math.PI*2+rand(-.2,.2),tilt=rand(.25,.75),len=rand(.75,1.15);
  const leaf=new T.Mesh(leafG,matte(i%2?'#7f9c76':'#6c8a64',.8));leaf.scale.set(.2,len,.05);
  const piv=new T.Group();piv.position.y=1.0;piv.rotation.set(0,a,0);leaf.position.y=len*.92;const tiltG=new T.Group();tiltG.rotation.x=tilt;tiltG.add(leaf);piv.add(tiltG);leaf.castShadow=true;plant.add(piv)}
const ball=new T.Mesh(new T.SphereGeometry(.24,32,24),new T.MeshStandardMaterial({color:'#ff9455',roughness:.55}));ball.position.copy(BALL).setY(.24);ball.castShadow=true;room.add(ball);
const ripple=new T.Mesh(new T.RingGeometry(.42,.5,64),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));ripple.rotation.x=-Math.PI/2;ripple.position.y=.01;room.add(ripple);let rippleT=1;
const sun=new T.DirectionalLight(0xfff4e8,0);sun.position.set(-6,13,7);sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:40});sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;sun.shadow.radius=5;scene.add(sun,sun.target);
const sky=new T.HemisphereLight(0xffffff,0xd8d0c4,0);scene.add(sky);
const bounce=new T.DirectionalLight(0xfff0e4,0);bounce.position.set(5,3,-6);scene.add(bounce);

/* ---------- Skeleton helpers ---------- */
const up=V(0,1,0),lat=V(1,0,0),fwd=V(0,0,1),vtmp=V(),qtmp=new T.Quaternion(),qa=new T.Quaternion();
function rotBone(b,worldAxis,angle){if(!b||!angle)return;b.parent.getWorldQuaternion(qtmp);vtmp.copy(worldAxis).applyQuaternion(qtmp.invert()).normalize();b.quaternion.premultiply(qa.setFromAxisAngle(vtmp,angle));b.updateMatrixWorld(true)}
const B={};let AX=null;
function findBones(){const d=getDog();const f=s=>{let b;d.traverse(n=>{if(n.name.startsWith(s))b=n});return b};
  Object.assign(B,{jaw:f('jaw_jnt'),lidL:f('L_upper_lid_base_jnt'),lidR:f('R_upper_lid_base_jnt'),earL:f('L_ear_base_jnt'),earR:f('R_ear_base_jnt'),
    t1:f('tail_1_jnt'),t2:f('tail_2_jnt'),t3:f('tail_3_jnt'),spine:f('spine_2_jnt'),chest:bones.chest,head:bones.head,neckMid:bones.neckMid,neckBase:bones.neckBase,pelvis:f('pelvis_jnt')})}
// Cache body-relative axes (lateral / up / forward) in each bone's parent frame, from the standing pose,
// so jaw, lids, ears, tail and breathing stay correct in any posture (sitting, lying, on the side).
function cacheAxes(){
  const d=getDog(),m=getMixer();Object.values(actions).forEach(a=>a.stop());const a=actions.standing;a.reset().play();a.setEffectiveWeight(1);a.time=0;m.update(0);
  const hs=mover.rotation.y;mover.rotation.y=0;mover.position.set(0,0,0);mover.updateMatrixWorld(true);d.updateMatrixWorld(true);
  AX={};for(const [k,b] of Object.entries(B)){if(!b)continue;b.parent.getWorldQuaternion(qtmp);qtmp.invert();AX[k]={lat:lat.clone().set(1,0,0).applyQuaternion(qtmp).normalize(),up:V(0,1,0).applyQuaternion(qtmp).normalize(),fwd:V(0,0,1).applyQuaternion(qtmp).normalize()}}
  mover.rotation.y=hs;
}
function rotL(k,axis,angle){const b=B[k];if(!b||!angle||!AX[k])return;b.quaternion.premultiply(qa.setFromAxisAngle(AX[k][axis],angle))}

/* ---------- The Inu ---------- */
const E={pos:V(),heading:0,speed:0,y:0,phase:0,shuffle:0,plan:[],step:null,mode:'auto',act:'',hist:[],lastBed:-1e9,pose:'stand',busy:0,
  lookYaw:0,lookPitch:0,idleYaw:0,idleT:0,watching:false,label:'',lookMode:'free',sniff:0,
  jaw:0,lid:0,chin:0,earPerk:0,earBack:0,tilt:0,tiltSign:1,wag:0,breathe:0,barks:[],yawnT:-1,ackT:-9,twitchT:-9,twitchSide:1,
  goodT:-9,lastTap:0,onBed:false,maxSpeed:0,maxAt:'',lastMover:null,t:0};
const near=(p,c,r)=>Math.hypot(p.x-c.x,p.z-c.z)<r;
const nameOf=()=>{try{return (localStorage.getItem('inu-name')||'').trim()}catch{return ''}};
const camHeading=()=>Math.atan2(camera.position.x-E.pos.x,camera.position.z-E.pos.z);
function approach(P,d){const dir=V(E.pos.x-P.x,0,E.pos.z-P.z);if(dir.lengthSq()<.01)dir.set(0,0,1);return P.clone().addScaledVector(dir.normalize(),d)}
const OBST=[{c:BEDC,r:2.6,k:'bed'},{c:PLANT,r:1.35,k:'plant'},{c:BOWL,r:.9,k:'bowl'},{c:BALL,r:.6,k:'ball'}];
const inRoom=p=>p.set(clamp(p.x,-6.2,6.2),0,clamp(p.z,-4.3,3.9));
function closestOnSeg(a,b,c){const ab=b.clone().sub(a);ab.y=0;const l=ab.lengthSq();const t=l?clamp(c.clone().sub(a).dot(ab)/l,0,1):0;return a.clone().addScaledVector(ab,t).setY(0)}
function route(from,to,skip){
  const pts=[];let a=from.clone().setY(0);
  for(let n=0;n<4;n++){let hit=null;
    for(const o of OBST){if(o.k===skip||near(a,o.c,o.r*.9)||near(to,o.c,o.r))continue;const q=closestOnSeg(a,to,o.c);if(q.distanceTo(V(o.c.x,0,o.c.z))<o.r){hit=o;break}}
    if(!hit)break;
    const q=closestOnSeg(a,to,hit.c),dir=q.clone().sub(V(hit.c.x,0,hit.c.z));if(dir.lengthSq()<1e-4){const ab=to.clone().sub(a);dir.set(-ab.z,0,ab.x)}
    const w=inRoom(V(hit.c.x,0,hit.c.z).addScaledVector(dir.normalize(),hit.r+.55));pts.push(w);a=w}
  pts.push(to.clone().setY(0));return pts;
}
function freeSpot(){let g;for(let i=0;i<24;i++){g=V(rand(-5.4,5.4),0,rand(-3.6,3.4));if(g.distanceTo(E.pos)>2.2&&OBST.every(o=>!near(g,o.c,o.r+.3)))break}return g}

/* ---------- Postures (real clips) ---------- */
// stand <-> sit <-> lie, sit <-> side. Every change goes through these real-clip edges, so nothing teleports.
const EDGES={
  'stand>sit':()=>{play('sitting',{fade:1.1,once:false});return 1.15},
  'sit>stand':()=>{play('standing',{fade:1.0});return 1.05},
  'sit>lie':()=>{play('rollover',{fade:1.25,time:2.1,once:true});return 1.3},
  'lie>sit':()=>{play('sitting',{fade:1.15,once:false});return 1.2},
  'sit>side':()=>{play('play_dead',{fade:.5,time:1.45,once:true});E.sideHold=true;return 1.55},
  'side>sit':()=>{const a=actions.play_dead;E.sideHold=false;a.paused=false;return {wait:()=>a.time>=7.25||!a.isRunning(),then:()=>{play('sitting',{fade:.6,once:false});return .65}}},
};
const PATH={stand:{sit:['stand>sit'],lie:['stand>sit','sit>lie'],side:['stand>sit','sit>side']},sit:{stand:['sit>stand'],lie:['sit>lie'],side:['sit>side']},
  lie:{sit:['lie>sit'],stand:['lie>sit','sit>stand'],side:['lie>sit','sit>side']},side:{sit:['side>sit'],stand:['side>sit','sit>stand'],lie:['side>sit','sit>lie']}};
const POSE_OFF={standing:[0,0],sitting:[0,-.1],shake:[0,-.1],rollover:[0,-.25]};
function poseOffset(out){let sx=0,sz=0,sw=0;
  for(const [k,a] of Object.entries(actions)){if(!a.isRunning()&&!a.paused)continue;const w=a.getEffectiveWeight();if(w<1e-3)continue;let o=POSE_OFF[k];
    if(k==='play_dead'){const s=sstep(1.7,2.75,a.time)*(1-sstep(5.6,7.0,a.time));o=[1.2*s,-.1]}
    if(!o)o=[0,0];sx+=o[0]*w;sz+=o[1]*w;sw+=w}
  if(sw>0){sx/=sw;sz/=sw}out.set(sx,0,sz);return out}
// how much head-look / sniff to layer on, per running clip
function lookAllowance(){let s=0,sw=0;for(const [k,a] of Object.entries(actions)){if(!a.isRunning()&&!a.paused)continue;const w=a.getEffectiveWeight();if(w<1e-3)continue;
  let v=k==='standing'?1:k==='sitting'?.9:k==='rollover'?(a.time<1.85?0:.75):k==='shake'?.25:0;s+=v*w;sw+=w}return sw?s/sw:1}
const standW=()=>actions.standing?.isRunning()?actions.standing.getEffectiveWeight():0;

/* ---------- Plan runner ---------- */
// A plan is a list of small steps. Autonomy and voice both write plans; a voice command replaces the plan.
const S={
  pose:p=>({t:'pose',p}),walk:(to,o={})=>({t:'walk',to,...o}),turn:h=>({t:'turn',h}),wait:(d,o={})=>({t:'wait',d,...o}),
  label:k=>({t:'fx',fn:()=>say(k)}),fx:fn=>({t:'fx',fn}),circle:()=>({t:'circle'}),chill:(d,o={})=>({t:'chill',d,...o}),
  roll:()=>({t:'roll'}),shake:()=>({t:'shake'}),bark:()=>({t:'bark'}),spin:()=>({t:'spin'}),yawn:()=>({t:'yawn'}),hold:(d,o={})=>({t:'hold',d,...o}),
};
function walkTo(goal,o={}){
  // leaving the bed: step out through the opening instead of over the bolster
  const inBed=near(E.pos,BEDC,2.1)&&!near(goal,BEDC,2.1);const exit=BEDC.clone().addScaledVector(openDir,2.7);
  const pts=inBed?[exit,...route(exit,goal,o.skip)]:route(E.pos,goal,o.skip);
  return pts.map((p,i,a)=>S.walk(p,{...o,via:i<a.length-1}));
}
function setPlan(steps,mode){
  // leaving a one-shot clip mid-way: settle it back into its posture's hold clip first
  if(E.step?.t==='shake'&&E.step.started&&E.pose==='sit')play('sitting',{fade:.5,once:false});
  E.rolling=false;E.plan=steps;E.step=null;if(mode)E.mode=mode}
function runStep(dt){
  if(!E.step){E.step=E.plan.shift()||null;if(!E.step){onPlanDone();return}E.step.age=0;E.step.started=false}
  const s=E.step;s.age+=dt;let done=false;
  switch(s.t){
    case 'fx':s.fn();done=true;break;
    case 'pose':{
      if(E.busy>0||E.speed>.04||E.shuffle>.15)break;
      if(s.edgeWait){if(s.edgeWait.wait()){E.busy=s.edgeWait.then();s.edgeWait=null}break}
      if(E.pose===s.p){done=true;break}
      const seq=PATH[E.pose][s.p];const e=seq[0];const to=e.split('>')[1];const r=EDGES[e]();E.pose=to;
      if(E.onBed)sound.rustle(pan(),.8,.7);
      if(typeof r==='number')E.busy=r;else s.edgeWait=r;
      break}
    case 'walk':{
      if(E.pose!=='stand'){E.plan.unshift(s);E.step=S.pose('stand');E.step.age=0;break}
      if(E.busy>0)break;
      const d=s.to.clone().sub(E.pos);d.y=0;const dist=d.length();
      const desired=Math.atan2(d.x,d.z),turn=wrap(desired-E.heading),fast=s.fast,rate=fast?2.4:1.6;
      E.heading+=clamp(turn,-dt*rate,dt*rate);
      const vmax=(s.speed||(fast?1.05:.62));
      const slow=s.via?1:Math.min(1,dist/.9);
      E.speed=damp(E.speed,vmax*slow*Math.max(.1,1-Math.abs(turn)/Math.PI),4,dt);
      E.pos.x+=Math.sin(E.heading)*E.speed*dt;E.pos.z+=Math.cos(E.heading)*E.speed*dt;
      if(dist<(s.via?.45:.2))done=true;break}
    case 'turn':{
      if(E.pose!=='stand'||E.busy>0){if(E.pose!=='stand')done=true;break}
      const h=typeof s.h==='function'?s.h():s.h;const t=wrap(h-E.heading);E.heading+=clamp(t,-dt*2.2,dt*2.2);E.shuffle=Math.min(1,Math.abs(t)*2.5);if(Math.abs(t)<.04){E.shuffle=0;done=true}break}
    case 'spin':{
      if(E.pose!=='stand'||E.busy>0)break;
      if(!s.started){s.started=true;s.h0=E.heading;s.dir=Math.random()<.5?1:-1;s.total=Math.PI*2;s.dur=2.3;s.k=0}
      s.k=Math.min(1,s.k+dt/s.dur);const e=s.k<.5?2*s.k*s.k:1-Math.pow(-2*s.k+2,2)/2;E.heading=s.h0+s.dir*s.total*e;E.shuffle=Math.sin(Math.PI*s.k)*1.6+.25;
      if(s.k>=1){E.shuffle=0;done=true}break}
    case 'circle':{
      if(E.pose!=='stand'||E.busy>0)break;
      if(!s.started){s.started=true;s.h0=E.heading;s.sg=Math.random()<.5?1:-1;let tot=posmod(s.sg*(BED_OPEN-E.heading),Math.PI*2);if(tot<Math.PI*1.2)tot+=Math.PI*2;s.tot=tot;s.R=.28;s.k=0;s.dur=tot/1.9;
        const th=s.h0-s.sg*Math.PI/2;s.c=E.pos.clone().sub(V(Math.sin(th)*s.R,0,Math.cos(th)*s.R));sound.rustle(pan(),1.4,.8)}
      s.k=Math.min(1,s.k+dt/s.dur);const e=s.k<.5?2*s.k*s.k:1-Math.pow(-2*s.k+2,2)/2;E.heading=s.h0+s.sg*s.tot*e;
      const th=E.heading-s.sg*Math.PI/2;E.pos.set(s.c.x+Math.sin(th)*s.R,0,s.c.z+Math.cos(th)*s.R);E.shuffle=Math.sin(Math.PI*s.k)*1.2+.3;
      if(s.k>=1){E.shuffle=0;done=true}break}
    case 'wait':{if(!s.started){s.started=true;if(s.look)E.lookMode=s.look}if(s.age>=s.d){E.lookMode='free';done=true}break}
    case 'hold':{if(!s.started){s.started=true;E.lookMode=s.look||'camera'}if(s.age>=s.d){E.lookMode='free';done=true}break}
    case 'chill':{ // lying or side-sleeping: breathe, glance, twitch an ear, doze
      if(E.busy>0)break;
      if(!s.started){s.started=true;s.next=rand(2.5,5);s.doze=0;s.side=E.pose==='side'}
      s.next-=dt;
      if(s.next<=0){const r=Math.random();
        if(s.side){E.twitchT=E.t;E.twitchSide=Math.random()<.5?1:-1;s.next=rand(4,8)}
        else if(s.doze>0){s.next=rand(3,6)}
        else if(r<.4&&s.age>4&&s.age<s.d-6){s.doze=rand(6,11);E.lookMode='none';s.next=s.doze;say('doze')}
        else if(r<.7){E.idleYaw=rand(-.8,.8);E.idleT=rand(1.5,2.5);s.next=rand(3,6)}
        else{E.twitchT=E.t;E.twitchSide=Math.random()<.5?1:-1;s.next=rand(2.5,5)}}
      if(s.doze>0){s.doze-=dt;if(s.doze<=0){E.lookMode='free';say(s.side?'sleep':'chill')}}
      if(s.age>=s.d){E.lookMode='free';done=true}break}
    case 'roll':{ // real clip: rollover 0 -> 1.8 from the lying pose
      if(E.busy>0)break;if(E.pose!=='lie'){E.plan.unshift(s);E.step=S.pose('lie');E.step.age=0;break}
      const a=actions.rollover;if(!s.started){s.started=true;a.paused=false;a.time=0;E.rolling=true;sound.rustle(pan(),1.2,.6)}
      if(a.time>=1.95){E.rolling=false;done=true}break}
    case 'shake':{ // real clip: shake, from and back to sitting
      if(E.busy>0)break;if(E.pose!=='sit'){E.plan.unshift(s);E.step=S.pose('sit');E.step.age=0;break}
      if(!s.started){s.started=true;play('shake',{fade:.45,once:true})}
      if(actions.shake.time>=6.25||!actions.shake.isRunning()){play('sitting',{fade:.5,once:false});E.busy=.55;done=true}break}
    case 'bark':{if(!s.started){s.started=true;const now=E.t;E.barks=[now+.05,now+.36];sound.bark([0,.31],pan())}if(s.age>=.9)done=true;break}
    case 'yawn':{if(!s.started){s.started=true;E.yawnT=E.t}if(s.age>=2.6)done=true;break}
  }
  if(done)E.step=null;
}
function onPlanDone(){if(E.mode==='cmd'){E.mode='auto';say('free')}if(reduce){E.plan=[S.wait(1e9)];return}schedule()}

/* ---------- Autonomy: weighted, non-repeating activities ---------- */
const ACTS={
  wander:{w:.28,build:()=>[...walkTo(freeSpot()),S.label('look'),S.wait(rand(1.2,2.6))],label:'walk'},
  idle:{w:.17,build:()=>[S.pose('stand'),S.label('look'),S.wait(rand(3,6))],label:'look'},
  sniff:{w:.15,build:()=>{const out=[S.pose('stand'),S.label('sniff')];let p=E.pos.clone();for(let i=0;i<3;i++){let g;for(let k=0;k<12;k++){const a=rand(0,Math.PI*2);g=inRoom(p.clone().add(V(Math.sin(a)*rand(1,1.8),0,Math.cos(a)*rand(1,1.8))));if(OBST.every(o=>!near(g,o.c,o.r+.2)))break}
      out.push(S.walk(g,{speed:.32,sniff:true}),S.wait(rand(1.2,2.2),{look:'sniff'}));p=g}return out},label:'sniff'},
  sit:{w:.12,build:()=>[S.pose('stand'),S.turn(()=>Math.random()<.6?camHeading():E.heading+rand(-1,1)),S.label('sit'),S.pose('sit'),S.wait(rand(6,12)),S.label('getup'),S.pose('stand')],label:'sit'},
  bed:{w:.15,ok:()=>E.t-E.lastBed>45,build:bedPlan,label:'bed'},
  bowl:{w:.07,build:()=>[...walkTo(approach(BOWL,1.55),{skip:'bowl'}),S.turn(()=>Math.atan2(BOWL.x-E.pos.x,BOWL.z-E.pos.z)),S.label('bowl'),S.wait(rand(2.8,4),{look:'sniff'})],label:'bowl'},
  ball:{w:.06,build:()=>[...walkTo(approach(BALL,1.45),{skip:'ball'}),S.turn(()=>Math.atan2(BALL.x-E.pos.x,BALL.z-E.pos.z)),S.label('ball'),S.wait(rand(2.2,3.4),{look:'sniff'})],label:'ball'},
};
function bedPlan(o={}){
  E.lastBed=E.t;const side=o.side??Math.random()<.3,d=o.d??(side?rand(15,30):rand(15,40));
  return [S.label('bedgo'),...walkTo(BED_OUT,{skip:null}),S.walk(BED_IN,{speed:.42}),S.label('bed'),S.circle(),S.turn(BED_OPEN),
    ...(side?[S.pose('sit'),S.fx(()=>sound.rustle(pan(),1.1,1)),S.pose('side'),S.label('sleep'),S.chill(d),S.label('wake'),S.pose('sit')]
            :[S.pose('lie'),S.label('chill'),S.chill(d)]),
    S.label('getup'),S.pose('stand'),S.label('stretch'),S.yawn(),S.wait(.6),S.fx(()=>{E.forceNext='wander'})];
}
function schedule(){
  let pick=E.forceNext;E.forceNext=null;
  if(!pick){
    const recent=E.hist.slice(-2);let w=Object.entries(ACTS).filter(([k,a])=>!recent.includes(k)&&(!a.ok||a.ok()));
    if(E.t-E.lastBed>120)w=w.map(([k,a])=>[k,{...a,w:k==='bed'?a.w*3:a.w}]);
    const tot=w.reduce((s,[,a])=>s+a.w,0);let r=Math.random()*tot;pick=w[w.length-1][0];for(const [k,a] of w){r-=a.w;if(r<=0){pick=k;break}}
  }
  E.hist.push(pick);if(E.hist.length>12)E.hist.shift();E.act=pick;
  setPlan(ACTS[pick].build(),'auto');if(pick==='wander')say('walk');
}

/* ---------- Voice commands ---------- */
const CMD_LABEL={sit:'sit',lie:'lie',bed:'bedgo',roll:'roll',shake:'shake',speak:'speak',spin:'spin',come:'come',stay:'stay',stop:'stop',good:'good',dead:'dead',free:'free'};
function command(id,{to=null}={}){
  if(!on)return;
  E.ackT=E.t;E.tiltSign=Math.random()<.5?1:-1;E.mode='cmd';E.act='cmd:'+id;E.lookMode='camera';hint.classList.add('gone');
  const face=S.turn(()=>camHeading()),standing=E.pose==='stand';
  const stopHere=()=>{E.speed=Math.min(E.speed,.3)};
  let p;
  switch(id){
    case 'sit':p=[...(standing?[face]:[]),S.pose('sit'),S.label('sit'),S.hold(16)];break;
    case 'lie':p=[...(standing?[face]:[]),S.pose('lie'),S.label('lie'),S.hold(18)];break;
    case 'roll':p=[...(standing?[face]:[]),S.pose('lie'),S.label('roll'),S.roll(),S.label('lie'),S.hold(10)];break;
    case 'shake':p=[...(standing?[S.turn(()=>camHeading()+.6)]:[]),S.pose('sit'),S.label('shake'),S.shake(),S.label('sit'),S.hold(8)];break;
    case 'dead':p=[...(standing?[face]:[]),S.pose('sit'),S.label('dead'),S.pose('side'),S.hold(3.5,{look:'none'}),S.pose('sit'),S.label('sit'),S.hold(6)];break;
    case 'speak':p=[S.label('speak'),S.bark(),S.hold(4)];break;
    case 'spin':p=[S.pose('stand'),S.label('spin'),S.spin(),S.turn(()=>camHeading()),S.label('here'),S.hold(3)];break;
    case 'come':{const c=to||comeSpot();ripple.position.set(c.x,.012,c.z);rippleT=to?0:1;p=[S.label('come'),...walkTo(c,{fast:true}),S.turn(()=>camHeading()),S.label('here'),S.hold(7)];break}
    case 'bed':p=bedPlan({d:rand(25,40),side:false});break;
    case 'stay':stopHere();p=[S.label('stay'),S.hold(40)];break;
    case 'stop':stopHere();p=[S.label('stop'),S.hold(8)];break;
    case 'good':E.goodT=E.t;p=[S.label('good'),S.hold(4.5)];break;
    case 'free':E.lookMode='free';E.mode='auto';say('free');p=[...walkTo(freeSpot()),S.wait(rand(1,2))];break;
  }
  if(id!=='stay'&&id!=='stop'&&id!=='good'&&id!=='speak'&&E.step?.t==='walk')E.speed*=.6;
  // speak and good-boy layer onto whatever the dog is doing, without changing posture
  setPlan(p,id==='free'?'auto':'cmd');if(id!=='free')E.label='';
}
function comeSpot(){const d=V(camera.position.x-C.t.x,0,camera.position.z-C.t.z).normalize();const g=inRoom(V(C.t.x,0,C.t.z).addScaledVector(d,3.2));for(const o of OBST)if(near(g,o.c,o.r))g.copy(V(o.c.x,0,o.c.z).add(g.clone().sub(o.c).setY(0).normalize().multiplyScalar(o.r+.2)));return g}
function callTo(p){
  if(reduce)return;
  const g=inRoom(p.clone());for(const o of OBST)if(near(g,o.c,o.r*.7))g.copy(V(o.c.x,0,o.c.z).add(g.clone().sub(o.c).setY(0).normalize().multiplyScalar(o.r*.75)));
  rippleT=0;ripple.position.set(g.x,.012,g.z);command('come',{to:g});
}

/* ---------- Captions ---------- */
const TEXT={walk:'is exploring.',come:'is coming over.',here:'is right here.',look:'is taking a look around.',watch:'is watching you.',sniff:'is sniffing around.',bowl:'is checking the bowl.',ball:'found the ball.',
  sit:'is sitting.',lie:'is lying down.',bedgo:'is heading to bed.',bed:'is settling into bed.',chill:'is chilling in bed.',doze:'is dozing off.',sleep:'is fast asleep.',wake:'is waking up.',getup:'is getting up.',stretch:'is having a big stretch.',
  stay:'is staying.',stop:'stopped.',roll:'is rolling over.',shake:'is shaking your hand.',speak:'says woof.',spin:'is spinning.',good:'is so happy.',dead:'is playing dead.',free:'is off exploring.',relax:'is relaxing.'};
function say(k){E.key=k;label()}
function label(){
  let k=E.key||'walk';if(reduce&&E.mode==='auto')k='relax';
  if(E.watching&&E.mode==='auto'&&k==='look')k='watch';
  const t=TEXT[k]||TEXT.walk;if(t===E.label)return;E.label=t;activity.classList.add('swap');clearTimeout(label.to);label.to=setTimeout(()=>{activity.textContent=t;activity.classList.remove('swap')},reduce?0:300);
}

/* ---------- Pointer: watch, drag-to-look, click-to-call ---------- */
const P={ndc:new T.Vector2(),floor:V(),has:false,last:-99,down:null,dragYaw:0,dragPitch:0};
const ray=new T.Raycaster(),plane=new T.Plane(V(0,1,0),0);
function updFloor(){ray.setFromCamera(P.ndc,camera);return ray.ray.intersectPlane(plane,P.floor)}
function setNdc(e){const r=canvas.getBoundingClientRect();P.ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1)}
canvas.addEventListener('pointermove',e=>{if(!on)return;setNdc(e);P.has=true;P.last=perf();
  if(P.down){const dx=e.clientX-P.down.x,dy=e.clientY-P.down.y;if(Math.hypot(dx,dy)>6)P.down.drag=true;if(P.down.drag){canvas.classList.add('dragging');P.dragYaw=clamp(P.down.yaw-dx*.0035,-.85,.85);P.dragPitch=clamp(P.down.pitch+dy*.0025,-.22,.38)}}});
canvas.addEventListener('pointerdown',e=>{if(!on)return;gesture();setNdc(e);P.has=true;P.last=perf();P.down={x:e.clientX,y:e.clientY,t:perf(),yaw:P.dragYaw,pitch:P.dragPitch,drag:false};canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointerup',e=>{if(!on||!P.down)return;const d=P.down;P.down=null;canvas.classList.remove('dragging');if(!d.drag&&perf()-d.t<600){setNdc(e);if(updFloor())callTo(P.floor.clone())}});
canvas.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')P.has=false});
addEventListener('keydown',e=>{if(!on)return;gesture();if(e.key==='Escape'){if(!micCard.hidden)hideCard('later');else close()}});
$('#live-done').addEventListener('click',()=>close());
if(matchMedia('(hover:none)').matches)$('.hint-verb').textContent='Tap';

/* ---------- Sound + voice UI ---------- */
const sound=createSound();
const micCard=$('#mic-card'),micBtn=$('#live-mic'),soundBtn=$('#live-sound'),pill=$('#voice-pill'),pillText=$('#voice-text'),tryEl=$('#voice-try'),toastEl=$('#voice-toast');
const pan=()=>{const v=mover.position.clone().project(camera);return clamp(v.x*.7,-.8,.8)};
function gesture(){sound.unlock();if(on&&sound.enabled)sound.startAmbience()}
function syncSoundBtn(){soundBtn.classList.toggle('off',!sound.enabled);soundBtn.setAttribute('aria-pressed',String(sound.enabled));soundBtn.setAttribute('aria-label',sound.enabled?'Turn sound off':'Turn sound on');soundBtn.title=sound.enabled?'Sound on':'Sound off'}
soundBtn.addEventListener('click',()=>{sound.setEnabled(!sound.enabled);gesture();syncSoundBtn()});syncSoundBtn();
let vstate='off',pillTO=0,tryTO=0,toastTO=0;
const voice=createVoice({
  getName:nameOf,
  onState:s=>{vstate=s;micBtn.classList.toggle('on',s==='listening');micBtn.classList.toggle('denied',s==='denied');micBtn.setAttribute('aria-pressed',String(s==='listening'));
    pill.hidden=!(s==='listening'||s==='asking');pill.classList.toggle('asking',s==='asking');if(s==='listening'&&!pill.classList.contains('hearing'))pillText.textContent='Listening';
    if(s==='denied')toast('Microphone access is off. Turn it on in your browser’s site settings to use voice.',5200);
    if(s==='error')toast('Voice isn’t available right now.',3500);
    if(s==='unsupported')toast('Voice commands work in Chrome and Safari.',3500)},
  onTranscript:(t,final)=>showHeard(t,final),
  onCommand:(id,text)=>{if(!on)return;if(id){heard(id);command(id)}else miss()},
});
function showHeard(t,final){if(!t.trim())return;pill.classList.add('hearing');pillText.textContent='“'+t.trim()+'”';clearTimeout(pillTO);pillTO=setTimeout(()=>{pill.classList.remove('hearing');if(vstate==='listening')pillText.textContent='Listening'},final?2600:3200)}
function heard(id){pill.classList.remove('miss');pill.classList.add('got');setTimeout(()=>pill.classList.remove('got'),700);tryEl.classList.add('gone')}
function miss(){pill.classList.add('miss');setTimeout(()=>pill.classList.remove('miss'),900);toast('Didn’t catch that. Try “sit” or “go to bed.”',2600);showTry(6000)}
function toast(m,ms=2600){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastTO);toastTO=setTimeout(()=>toastEl.classList.remove('show'),ms)}
function showTry(ms=12000){tryEl.classList.remove('gone');clearTimeout(tryTO);tryTO=setTimeout(()=>tryEl.classList.add('gone'),ms)}
const pref={get(){try{return sessionStorage.getItem('iinu-mic')}catch{return null}},set(v){try{sessionStorage.setItem('iinu-mic',v)}catch{}}};
function showCard(){if(!voice.supported||!on)return;micCard.hidden=false;requestAnimationFrame(()=>micCard.classList.add('show'));$('#mic-yes').focus({preventScroll:true})}
function hideCard(v){if(v)pref.set(v);micCard.classList.remove('show');setTimeout(()=>{if(!micCard.classList.contains('show'))micCard.hidden=true},450);micBtn.hidden=!voice.supported}
async function enableMic(){gesture();hideCard('on');const ok=await voice.enable();if(ok){sound.chirp(true);showTry(14000)}}
$('#mic-yes').addEventListener('click',enableMic);
$('#mic-no').addEventListener('click',()=>{gesture();hideCard('later')});
micBtn.addEventListener('click',()=>{gesture();if(voice.isOn()){voice.pause();pref.set('later')}else enableMic()});
pill.addEventListener('click',()=>showTry(9000));
window.__iinuVoice=text=>{if(!on)return null;showHeard(text,true);const id=voice.parse(text,nameOf());if(id){heard(id);command(id)}else miss();return id};
window.__iinuBed=(side,d=20)=>{E.mode='cmd';setPlan(bedPlan({side,d}),'cmd')};
window.__iinuVoiceUI=s=>{voice.__fake=s;if(s==='listening'){pill.hidden=false;pillText.textContent='Listening';vstate='listening';micBtn.classList.add('on');micBtn.hidden=false}};

/* ---------- Camera ---------- */
const C={t:V(0,1,0),yaw:0,pitch:.34};
function camGoal(){
  const mobile=innerWidth<760,dist=viewDist();
  const tx=E.pos.x*(mobile?.75:.45),tz=E.pos.z*.3;
  return {t:V(tx,mobile?1.2:1.0,tz),yaw:P.dragYaw+(reduce?0:Math.sin(perf()*.00007)*.1),pitch:clamp((mobile?.42:.34)+P.dragPitch,.14,.75),dist};
}
function viewDist(){return 13.5*Math.max(1,Math.pow(1.6/(innerWidth/innerHeight),.5))}
let camDist=13.5;
function placeCamera(dt,instant){
  const g=camGoal();const k=instant?1:1-Math.exp(-dt*1.6);
  C.t.lerp(g.t,k);C.yaw+=(g.yaw-C.yaw)*(instant?1:1-Math.exp(-dt*4));C.pitch+=(g.pitch-C.pitch)*(instant?1:1-Math.exp(-dt*4));camDist+=(g.dist-camDist)*(instant?1:k);
  camera.clearViewOffset();
  camera.position.set(C.t.x+Math.sin(C.yaw)*Math.cos(C.pitch)*camDist,C.t.y+Math.sin(C.pitch)*camDist,C.t.z+Math.cos(C.yaw)*Math.cos(C.pitch)*camDist);
  camera.lookAt(C.t);camera.updateMatrixWorld();
}

/* ---------- Per-frame ---------- */
const off=V(),wp=V(),glowEl=pill.querySelector('.voice-glow');
function env(x,a,b,c){return x<0?0:x<a?x/a:x<a+b?1:x<a+b+c?1-(x-a-b)/c:0} // attack, hold, release
function tick(dt){
  const dog=getDog(),mixer=getMixer();if(!dog)return;
  E.t+=dt;
  // Procedural layers are additive on top of the clip pose. Restore last frame's clip pose first, so if the mixer
  // doesn't rewrite a bone this frame (paused / clamped clip), the layers can't accumulate and drift.
  if(!E.touch){E.touch=[...new Set([...bones.legs.flatMap(l=>[l.upper,l.lower]),bones.neckBase,bones.neckMid,bones.head,...Object.values(B)].filter(Boolean))];E.base=E.touch.map(b=>b.quaternion.clone())}
  E.touch.forEach((b,i)=>b.quaternion.copy(E.base[i]));
  mixer.update(dt);
  E.touch.forEach((b,i)=>E.base[i].copy(b.quaternion));
  // keep long holds alive inside real clips
  const ro=actions.rollover,pd=actions.play_dead;
  if(E.sideHold&&pd.time>=4.4)pd.paused=true;
  E.busy=Math.max(0,E.busy-dt);
  if(E.step?.t!=='walk')E.speed=damp(E.speed,0,7,dt);
  if(!E.step||(E.step.t!=='turn'&&E.step.t!=='spin'&&E.step.t!=='circle'))E.shuffle=damp(E.shuffle,0,8,dt);
  runStep(dt);
  // Head: the pointer when it's near, the camera after a command, otherwise idle glances.
  let wantYaw=0,wantPitch=0,watching=false;const allow=lookAllowance();
  const pointerFresh=P.has&&perf()-P.last<5000;
  if(E.lookMode!=='none'&&E.lookMode!=='sniff'&&pointerFresh&&updFloor()){
    const dx=P.floor.x-E.pos.x,dz=P.floor.z-E.pos.z,dd=Math.hypot(dx,dz);
    if(dd<7){const rel=wrap(Math.atan2(dx,dz)-E.heading);watching=true;wantYaw=clamp(rel,-1.05,1.05)*(E.step?.t==='walk'?.45:1);wantPitch=clamp((dd-3.2)*-.07,-.25,.35)}
  }
  if(!watching&&E.lookMode==='camera'){const rel=wrap(camHeading()-E.heading);wantYaw=clamp(rel,-1,1);wantPitch=.12}
  if(!watching&&E.lookMode==='free'&&E.step?.t!=='walk'&&!reduce){E.idleT-=dt;if(E.idleT<=0){E.idleT=rand(1.1,2.4);E.idleYaw=rand(-.9,.9)}wantYaw=E.idleYaw}
  if(watching!==E.watching){E.watching=watching;label()}
  E.lookYaw=damp(E.lookYaw,wantYaw*allow,reduce?3:4,dt);E.lookPitch=damp(E.lookPitch,wantPitch*allow,4,dt);
  const sniffing=(E.lookMode==='sniff'||E.step?.sniff)&&E.pose==='stand';
  E.sniff=damp(E.sniff,sniffing?standW():0,3,dt);
  // Expression layers
  const t=E.t,ack=env(t-E.ackT,.15,.35,.5),good=env(t-E.goodT,.2,3.2,.8);
  const bark=E.barks.reduce((m,b)=>Math.max(m,env(t-b,.05,.06,.16)),0),yawn=env(t-E.yawnT,.6,1.0,.8);
  const dozing=E.lookMode==='none'&&(E.pose==='lie'||E.pose==='side')||E.pose==='side'&&E.step?.t==='chill';
  E.jaw=damp(E.jaw,Math.max(bark*.5,yawn*.85,good*.28),18,dt);
  E.lid=damp(E.lid,Math.max(dozing?1:0,yawn*.9,good*.25),dozing?1.5:6,dt);
  E.chin=damp(E.chin,dozing&&E.pose==='lie'?1:0,1.2,dt);
  E.earPerk=damp(E.earPerk,ack,10,dt);E.earBack=damp(E.earBack,Math.max(good*.8,yawn*.6),5,dt);E.tilt=damp(E.tilt,ack*E.tiltSign,8,dt);
  E.wag=damp(E.wag,Math.max(good,ack*.5,E.step?.t==='walk'&&E.mode==='cmd'?.6:0),4,dt);
  E.breathe=damp(E.breathe,E.pose==='lie'||E.pose==='side'?1:.35,2,dt);
  // Legs (procedural walk) and body bob
  E.phase+=Math.max(E.speed,E.shuffle*.25)*dt*9;
  const w=Math.min(1,Math.max(E.speed/.4,E.shuffle*.5))*standW();
  lat.set(1,0,0).applyAxisAngle(up,E.heading);fwd.set(0,0,1).applyAxisAngle(up,E.heading);
  mover.rotation.y=E.heading;mover.updateMatrixWorld(true);dog.updateMatrixWorld(true);
  if(w>.001)for(const l of bones.legs){const ph=E.phase+l.p;rotBone(l.upper,lat,Math.sin(ph)*.3*w);rotBone(l.lower,lat,Math.max(0,Math.cos(ph))*.38*w)}
  // footfalls
  const stepN=Math.floor(E.phase/Math.PI);if(stepN!==E.lastTap){E.lastTap=stepN;if(w>.25)sound.tap(pan(),(E.onBed?.45:1)*Math.min(1,w))}
  // head yaw across the neck chain, pitch for sniffing / looking
  const yaw=E.lookYaw,sn=E.sniff,wob=Math.sin(perf()*.012)*.05*sn;
  rotBone(bones.neckBase,up,yaw*.35);rotBone(bones.neckMid,up,yaw*.3);rotBone(bones.head,up,yaw*.35);
  rotBone(bones.neckBase,lat,.55*sn);rotBone(bones.neckMid,lat,.35*sn);rotBone(bones.head,lat,.3*sn+wob-E.lookPitch*.6);
  // body-relative layers (cached axes): chin rest, bark bob, yawn, tilt, ears, eyes, jaw, tail, breathing
  rotL('neckBase','lat',.32*E.chin-.25*yawn);rotL('head','lat',.12*E.chin-.12*bark-.2*yawn);
  rotL('head','fwd',.3*E.tilt);
  const tw=env(t-E.twitchT,.06,.08,.25);
  rotL('earL','lat',.22*E.earPerk-.45*E.earBack+(E.twitchSide>0?.35*tw:0));rotL('earR','lat',.22*E.earPerk-.45*E.earBack+(E.twitchSide<0?.35*tw:0));
  rotL('lidL','lat',.9*E.lid);rotL('lidR','lat',.9*E.lid);rotL('jaw','lat',.9*E.jaw);
  const wg=Math.sin(t*15)*E.wag;rotL('t1','up',.32*wg);rotL('t2','up',.22*wg);rotL('t3','up',.14*wg);
  const br=Math.sin(t*Math.PI*2*(E.pose==='side'?.22:.28))*E.breathe;rotL('spine','lat',.018*br);rotL('chest','lat',-.022*br);
  // position: anchor + posture offset (keeps the body centred as clips move the root), bed height
  poseOffset(off);off.applyAxisAngle(up,E.heading);
  const onBed=near(E.pos,BEDC,1.85);if(onBed!==E.onBed){E.onBed=onBed;sound.rustle(pan(),.6,.5)}
  E.y=damp(E.y,onBed?.26:0,5,dt);
  mover.position.set(E.pos.x+off.x,E.y+Math.abs(Math.sin(E.phase*2))*.025*Math.min(1,E.speed/.4),E.pos.z+off.z);
  // continuity monitor (tests): fastest the pelvis has moved
  mover.updateMatrixWorld(true);B.pelvis.getWorldPosition(wp);if(E.lastMover&&dt>.02){const dd=wp.distanceTo(E.lastMover),v=dd/dt;if(v>E.maxSpeed){E.maxSpeed=v;E.maxAt=(E.step?.t||'-')+'/'+E.pose+'@'+E.t.toFixed(1)}if(v>3&&dd>.12){(E.jumps||(E.jumps=[])).push([+E.t.toFixed(2),+dd.toFixed(2),+dt.toFixed(3),E.step?.t||'-',E.pose,Object.entries(actions).filter(([k,a])=>a.getEffectiveWeight()>.01&&(a.isRunning()||a.paused)).map(([k,a])=>k+':'+a.time.toFixed(1)+'/'+a.getEffectiveWeight().toFixed(2)).join(' ')]);if(E.jumps.length>30)E.jumps.shift()}}E.lastMover=(E.lastMover||V()).copy(wp);
  if(rippleT<1){rippleT=Math.min(1,rippleT+dt/1.3);ripple.scale.setScalar(.4+rippleT*1.6);ripple.material.opacity=(1-rippleT)*.9}else ripple.material.opacity=0;
  if(!pill.hidden)pill.style.setProperty('--lvl',(voice.getLevel()).toFixed(3));
  placeCamera(dt,false);
}

/* ---------- Enter / exit ---------- */
let on=false,savedScroll=0,cardTO=0;
function applyRig(live){
  const L=stageLights;
  room.visible=live;L.floor.visible=!live;L.pool.visible=!live;
  L.key.castShadow=!live;sun.castShadow=live;
  sun.intensity=live?2.1:0;sky.intensity=live?1.55:0;bounce.intensity=live?.5:0;
  if(live){for(const k of ['hemi','key','rimL','rimR','fill'])L[k].intensity=0;scene.environmentIntensity=.55;scene.background=BG;scene.fog=new T.Fog(BG,18,46)}
  else{scene.background=null;scene.fog=null}
}
function enterScene(){
  on=true;applyRig(true);if(!B.head)findBones();cacheAxes();E.touch=null;
  E.pos.set(.4,0,.9);E.heading=.25;E.speed=0;E.y=0;E.lookYaw=0;E.sniff=0;E.label='';E.pose='stand';E.busy=0;E.sideHold=false;E.rolling=false;E.hist=[];E.lastBed=E.t-30;E.mode='auto';E.lookMode='free';E.lastMover=null;E.maxSpeed=0;
  play('standing',{fade:.01});setPlan(reduce?[S.label('relax'),S.wait(1e9)]:[S.label('look'),S.wait(2.2)],'auto');say(reduce?'relax':'look');
  P.dragYaw=0;P.dragPitch=0;C.t.set(E.pos.x*.45,1,E.pos.z*.3);C.yaw=0;C.pitch=.34;camDist=viewDist();
  tick(0);placeCamera(0,true);
  body.classList.add('live-on');ui.hidden=false;requestAnimationFrame(()=>ui.classList.add('show'));
  hint.classList.toggle('gone',reduce);clearTimeout(hintTO);hintTO=setTimeout(()=>hint.classList.add('gone'),8000);
  micBtn.hidden=!voice.supported;pill.hidden=true;tryEl.classList.add('gone');
  clearTimeout(cardTO);const pr=pref.get();
  if(voice.supported&&pr!=='later'&&!voice.isOn())cardTO=setTimeout(showCard,1300);
  else if(pr==='on'&&voice.supported&&!voice.isOn())voice.enable().then(ok=>ok&&showTry(10000));
  if(sound.enabled)sound.startAmbience();
}
let hintTO=0;
function leaveScene(){on=false;clearTimeout(cardTO);voice.pause();sound.stopAmbience();micCard.classList.remove('show');micCard.hidden=true;applyRig(false);mover.position.set(0,0,0);mover.rotation.y=0;ui.classList.remove('show');ui.hidden=true;body.classList.remove('live-on');play('standing',{fade:.01});onExit()}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function rectOf(el){const r=el?.getBoundingClientRect();if(!r||r.bottom<0||r.top>innerHeight)return {left:innerWidth*.3,top:innerHeight*.3,width:innerWidth*.4,height:innerHeight*.4};return r}
function shellTo(r,radius,opacity){Object.assign(shell.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',borderRadius:radius+'px',opacity:String(opacity)})}
let busy=false,fromEl=null;
async function open({from=null,instant=false}={}){
  if(on||busy)return;busy=true;fromEl=from;savedScroll=scrollY;if(!instant)sound.unlock();
  if(instant||reduce){enterScene();busy=false;return}
  shell.classList.remove('anim');shellTo(rectOf(from),28,1);shell.offsetWidth;
  shell.classList.add('anim');shellTo({left:0,top:0,width:innerWidth,height:innerHeight},0,1);
  await wait(780);enterScene();await wait(60);shellTo({left:0,top:0,width:innerWidth,height:innerHeight},0,0);await wait(650);shell.classList.remove('anim');busy=false;
}
async function close(){
  if(!on||busy)return;busy=true;
  if(reduce){leaveScene();scrollTo({top:savedScroll,behavior:'instant'});busy=false;return}
  shell.classList.remove('anim');shellTo({left:0,top:0,width:innerWidth,height:innerHeight},0,0);shell.offsetWidth;shell.classList.add('anim');shell.style.opacity='1';
  await wait(600);leaveScene();scrollTo({top:savedScroll,behavior:'instant'});await wait(30);
  shellTo(rectOf(fromEl||$('#live-open')),28,0);await wait(780);shell.classList.remove('anim');busy=false;
}
function state(){
  const d=getDog();let screen=null;
  if(d&&on){const v=mover.position.clone().setY(1.6).project(camera);screen=[(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]}
  return {on,mode:E.mode,act:E.act,pose:E.pose,step:E.step?.t||null,plan:E.plan.length,key:E.key,label:E.label,watching:E.watching,onBed:E.onBed,
    pos:E.pos.toArray().map(n=>+n.toFixed(2)),mover:mover.position.toArray().map(n=>+n.toFixed(2)),heading:+E.heading.toFixed(2),t:+E.t.toFixed(1),maxSpeed:+E.maxSpeed.toFixed(2),maxAt:E.maxAt,hist:E.hist.join(','),
    voice:vstate,sound:sound.state(),card:!micCard.hidden,screen,clips:Object.fromEntries(Object.entries(actions).filter(([k,a])=>a.isRunning()||a.paused).map(([k,a])=>[k,[+a.time.toFixed(2),+a.getEffectiveWeight().toFixed(2),a.paused]])),jumps:E.jumps};
}
return {isOn:()=>on,tick,open,close,state,resetMax:()=>{E.maxSpeed=0;E.maxAt=''}};
}
