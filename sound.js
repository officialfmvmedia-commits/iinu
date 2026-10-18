// iINU Sound: generative room ambience, a synthesized bark, soft paw taps and bed rustle.
// Everything is made with Web Audio at runtime (no samples), and only starts after a user gesture.
export function createSound(){
  const AC=window.AudioContext||window.webkitAudioContext;
  let ctx=null,master=null,amb=null,fx=null,verb=null,noiseBuf=null,ambOn=false,started=false,chordTO=0,chimeTO=0;
  let enabled=true;try{enabled=localStorage.getItem('iinu-sound')!=='off'}catch{}
  const AMB=.045,FX=.5;
  function irBuffer(sec,decay){const r=ctx.sampleRate,n=Math.floor(sec*r),b=ctx.createBuffer(2,n,r);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)}return b}
  function init(){
    if(ctx||!AC)return !!ctx;
    try{ctx=new AC()}catch{return false}
    master=ctx.createGain();master.gain.value=enabled?1:0;master.connect(ctx.destination);
    verb=ctx.createConvolver();verb.buffer=irBuffer(3.6,3.2);const verbOut=ctx.createGain();verbOut.gain.value=.55;verb.connect(verbOut).connect(master);
    amb=ctx.createGain();amb.gain.value=0;amb.connect(master);
    const ambWet=ctx.createGain();ambWet.gain.value=.9;amb.connect(ambWet).connect(verb);
    fx=ctx.createGain();fx.gain.value=FX;fx.connect(master);
    const fxWet=ctx.createGain();fxWet.gain.value=.12;fx.connect(fxWet).connect(verb);
    const n=ctx.sampleRate*2;noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    buildPad();return true;
  }
  /* ---------- Ambience: two slow-breathing chord banks that trade places, warm room tone, rare glass notes ---------- */
  const CHORDS=[[146.83,220,277.18,329.63,369.99],[123.47,185,246.94,293.66,369.99],[130.81,196,246.94,329.63,392],[110,164.81,246.94,277.18,329.63]];
  let banks=[],ci=0,live=0;
  function buildPad(){
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=950;lp.Q.value=.4;lp.connect(amb);
    const lfo=ctx.createOscillator(),lfoG=ctx.createGain();lfo.frequency.value=.035;lfoG.gain.value=320;lfo.connect(lfoG).connect(lp.frequency);lfo.start();
    for(let b=0;b<2;b++){
      const bank={gain:ctx.createGain(),voices:[]};bank.gain.gain.value=0;bank.gain.connect(lp);
      CHORDS[b].forEach((f,i)=>{const vg=ctx.createGain();vg.gain.value=(i===0?.26:.15);vg.connect(bank.gain);
        const oscs=[-4,4].map(c=>{const o=ctx.createOscillator();o.type=i===0?'sine':'triangle';o.frequency.value=f;o.detune.value=c;o.connect(vg);o.start();return o});
        const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=.04+Math.random()*.05;lg.gain.value=.06;l.connect(lg).connect(vg.gain);l.start();
        bank.voices.push(oscs)});
      banks.push(bank)}
    // room tone: brown-ish noise, very low
    const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;const tl=ctx.createBiquadFilter();tl.type='lowpass';tl.frequency.value=320;const tg=ctx.createGain();tg.gain.value=.22;src.connect(tl).connect(tg).connect(amb);src.start();
  }
  function setChord(bank,chord,at){bank.voices.forEach((oscs,i)=>oscs.forEach(o=>o.frequency.setValueAtTime(chord[i],at)))}
  function nextChord(){
    if(!ambOn)return;const t=ctx.currentTime,old=banks[live],nb=banks[1-live];ci=(ci+1)%CHORDS.length;
    setChord(nb,CHORDS[ci],t);nb.gain.gain.cancelScheduledValues(t);nb.gain.gain.setValueAtTime(nb.gain.gain.value,t);nb.gain.gain.linearRampToValueAtTime(1,t+7);
    old.gain.gain.cancelScheduledValues(t);old.gain.gain.setValueAtTime(old.gain.gain.value,t);old.gain.gain.linearRampToValueAtTime(0,t+8);live=1-live;
    chordTO=setTimeout(nextChord,17000+Math.random()*6000);
  }
  function chime(){
    if(!ambOn)return;const t=ctx.currentTime,notes=[587.33,659.25,739.99,880,987.77,1174.66],f=notes[Math.floor(Math.random()*notes.length)];
    const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+3.2);
    if(p){p.pan.value=Math.random()*1.2-.6;o.connect(g).connect(p).connect(amb)}else o.connect(g).connect(amb);o.start(t);o.stop(t+3.3);
    chimeTO=setTimeout(chime,9000+Math.random()*14000);
  }
  function startAmbience(){
    if(!init())return;try{ctx.resume?.()?.catch?.(()=>{})}catch{};if(ambOn)return;ambOn=true;started=true;const t=ctx.currentTime;
    setChord(banks[live],CHORDS[ci],t);banks[live].gain.gain.cancelScheduledValues(t);banks[live].gain.gain.setValueAtTime(banks[live].gain.gain.value,t);banks[live].gain.gain.linearRampToValueAtTime(1,t+2);
    amb.gain.cancelScheduledValues(t);amb.gain.setValueAtTime(amb.gain.value,t);amb.gain.linearRampToValueAtTime(AMB,t+3.5);
    clearTimeout(chordTO);clearTimeout(chimeTO);chordTO=setTimeout(nextChord,15000);chimeTO=setTimeout(chime,6000);
  }
  function stopAmbience(){
    if(!ctx||!ambOn)return;ambOn=false;clearTimeout(chordTO);clearTimeout(chimeTO);const t=ctx.currentTime;
    amb.gain.cancelScheduledValues(t);amb.gain.setValueAtTime(amb.gain.value,t);amb.gain.linearRampToValueAtTime(0,t+1.4);
    setTimeout(()=>{if(!ambOn&&ctx.state==='running')ctx.suspend?.()},1700);
  }
  /* ---------- One-shots ---------- */
  function panNode(pan){if(!ctx.createStereoPanner)return null;const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));return p}
  function out(node,pan){const p=panNode(pan);if(p){node.connect(p).connect(fx)}else node.connect(fx)}
  const shaper=(()=>{let c=null;return()=>{if(c)return c;const n=1024,a=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;a[i]=Math.tanh(x*2.6)}c=a;return c}})();
  // One bark: a pitched, rough glottal pulse (saw + square) with a breathy noise onset, soft-clipped, then shaped by dog-sized
  // vocal-tract formants and a sharp attack / fast decay envelope.
  function woof(t,p=1,pan=0,vol=1){
    const env=ctx.createGain();env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(vol,t+.008);env.gain.setValueAtTime(vol,t+.05);env.gain.exponentialRampToValueAtTime(.3*vol,t+.1);env.gain.exponentialRampToValueAtTime(.0005,t+.24);
    const src=ctx.createGain();src.gain.value=1;
    const mk=(type,mul,g)=>{const o=ctx.createOscillator();o.type=type;const f=o.frequency;f.setValueAtTime(330*p*mul,t);f.exponentialRampToValueAtTime(560*p*mul,t+.03);f.exponentialRampToValueAtTime(420*p*mul,t+.09);f.exponentialRampToValueAtTime(250*p*mul,t+.22);const og=ctx.createGain();og.gain.value=g;o.connect(og).connect(src);o.start(t);o.stop(t+.26);return o};
    mk('sawtooth',1,.7);mk('square',1.007,.25);
    // growl: amplitude roughness
    const am=ctx.createOscillator(),amg=ctx.createGain();am.frequency.value=48+Math.random()*14;amg.gain.value=.28;am.connect(amg).connect(src.gain);am.start(t);am.stop(t+.26);
    const nz=ctx.createBufferSource();nz.buffer=noiseBuf;nz.playbackRate.value=1;const nbp=ctx.createBiquadFilter();nbp.type='bandpass';nbp.frequency.value=1700;nbp.Q.value=.7;const ng=ctx.createGain();ng.gain.setValueAtTime(1.4,t);ng.gain.exponentialRampToValueAtTime(.35,t+.09);ng.gain.exponentialRampToValueAtTime(.05,t+.22);nz.connect(nbp).connect(ng).connect(src);nz.start(t,Math.random());nz.stop(t+.26);
    const ws=ctx.createWaveShaper();ws.curve=shaper();src.connect(ws);
    const sum=ctx.createGain();sum.gain.value=.5;
    [[620,4,1],[1250,5,.75],[2650,6,.32],[3600,7,.12]].forEach(([f,q,g])=>{const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.setValueAtTime(f*p*.92,t);bp.frequency.linearRampToValueAtTime(f*p,t+.04);bp.Q.value=q;const bg=ctx.createGain();bg.gain.value=g*3;ws.connect(bp).connect(bg).connect(sum)});
    const lo=ctx.createBiquadFilter();lo.type='lowpass';lo.frequency.value=5200;sum.connect(lo).connect(env);out(env,pan);
  }
  function bark(times,pan){if(!ready())return;const t=ctx.currentTime+.02;times.forEach((dt,i)=>woof(t+dt,i?.96:1.03,pan,i?.85:1))}
  function tap(pan,vol=1){if(!ready())return;const t=ctx.currentTime;const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900+Math.random()*300;const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.07);s.connect(f).connect(g);out(g,pan);s.start(t,Math.random()*1.5);s.stop(t+.08)}
  function rustle(pan,dur=.9,vol=1){if(!ready())return;const t=ctx.currentTime;const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(900,t);f.frequency.linearRampToValueAtTime(1600,t+dur*.5);f.frequency.linearRampToValueAtTime(700,t+dur);f.Q.value=.6;const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09*vol,t+dur*.3);g.gain.linearRampToValueAtTime(.05*vol,t+dur*.6);g.gain.linearRampToValueAtTime(0,t+dur);s.connect(f).connect(g);out(g,pan);s.start(t,Math.random());s.stop(t+dur+.05)}
  function chirp(ok=true){if(!ready())return;const t=ctx.currentTime;[ok?880:660,ok?1318.5:587.3].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.07);g.gain.linearRampToValueAtTime(.05,t+i*.07+.01);g.gain.exponentialRampToValueAtTime(.0001,t+i*.07+.35);o.connect(g).connect(fx);o.start(t+i*.07);o.stop(t+i*.07+.4)})}
  function ready(){return !!ctx&&ctx.state!=='closed'&&started&&enabled}
  function unlock(){if(!init())return;try{ctx.resume?.()?.catch?.(()=>{})}catch{};started=true}
  function setEnabled(v){enabled=v;try{localStorage.setItem('iinu-sound',v?'on':'off')}catch{};if(!ctx)return;const t=ctx.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(v?1:0,t+.5)}
  return {_ctx:()=>ctx,supported:!!AC,unlock,startAmbience,stopAmbience,bark,tap,rustle,chirp,setEnabled,get enabled(){return enabled},state:()=>({ctx:ctx?.state||'none',ambOn,enabled,started})};
}
