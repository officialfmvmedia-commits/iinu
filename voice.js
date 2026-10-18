// iINU Voice: Web Speech API listener + forgiving command parser.
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
// Each command: phrases (matched as whole words, with light fuzzy matching on longer words). Order = priority.
export const COMMANDS=[
  {id:'good',phrases:['good boy','good girl','good dog','good pup','good puppy','good job','well done','whos a good','who is a good','attaboy','atta boy','good','nice']},
  {id:'bed',phrases:['go to bed','go to your bed','bed time','bedtime','go to sleep','time for bed','your bed','bed','sleep','nap','go lay down','go lie down']},
  {id:'dead',phrases:['play dead','bang','play possum']},
  {id:'roll',phrases:['roll over','rollover','roll','barrel roll']},
  {id:'lie',phrases:['lie down','lay down','lie','lay','down','laydown','get down']},
  {id:'shake',phrases:['shake','paw','give me paw','give paw','give me your paw','high five','shake hands']},
  {id:'sit',phrases:['sit down','sit','sitting','sit sit','set','sits','sitt','sat']},
  {id:'speak',phrases:['speak','bark','woof','say something','talk','ruff']},
  {id:'spin',phrases:['spin','spin around','turn around','twirl','circle','do a spin']},
  {id:'come',phrases:['come here','come','come on','here boy','here girl','over here','to me','here']},
  {id:'stay',phrases:['stay','wait','hold','hold it','stay there']},
  {id:'stop',phrases:['stop','freeze','halt','enough','no']},
  {id:'free',phrases:['go explore','explore','go play','free','okay','ok','go on','release','break','at ease','all done','go ahead','play']},
];
const norm=s=>' '+String(s).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()+' ';
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m||n;const d=[];for(let i=0;i<=m;i++){d[i]=[i];for(let j=1;j<=n;j++)d[i][j]=i?0:j}
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[m][n]}
function phraseIn(words,phrase){const pw=phrase.split(' ');
  for(let i=0;i+pw.length<=words.length;i++){let ok=true,fuzzy=0;for(let j=0;j<pw.length;j++){const w=words[i+j],q=pw[j];if(w===q)continue;if(q.length>=4&&w.length>=4&&Math.abs(w.length-q.length)<=1&&lev(w,q)<=1){fuzzy++;continue}ok=false;break}if(ok)return {i,fuzzy}}return null}
export function parse(text,name=''){
  let t=norm(text);const nm=norm(name).trim();
  // strip the dog's name and polite filler
  if(nm)t=t.split(' '+nm+' ').join(' ');
  t=t.replace(/ (hey|ok hey|please|now|buddy|pup|puppy|doggy|doggo|boy|girl|inu|iinu|i inu) /g,m=>m===' boy '||m===' girl '?m:' ');
  const words=t.trim().split(' ').filter(Boolean);if(!words.length)return null;
  let best=null;
  for(let k=0;k<COMMANDS.length;k++){const c=COMMANDS[k];for(const ph of c.phrases){const r=phraseIn(words,ph);if(r){const score=ph.split(' ').length*10-r.fuzzy*3-k*.1;if(!best||score>best.score)best={id:c.id,score,phrase:ph,words:words.length}}}}
  // A lone weak word inside a long sentence is probably chatter, not a command.
  if(best&&best.score<11&&words.length>6)return null;
  return best?best.id:null;
}
export function createVoice({onCommand,onTranscript,onState,getName}){
  const supported=!!SR&&(window.isSecureContext!==false);
  let rec=null,want=false,running=false,stream=null,level=0,an=null,lvlBuf=null,lastAt=0,handledIdx=-1,restartT=0,fails=0;
  const st=s=>onState?.(s);
  async function enable(){
    if(!supported){st('unsupported');return false}
    st('asking');
    // Ask for the mic explicitly first: it gives one clear permission prompt and a level meter for the glow.
    try{if(navigator.mediaDevices?.getUserMedia){stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});meter()}}
    catch(e){st(e&&(e.name==='NotAllowedError'||e.name==='SecurityError')?'denied':'error');return false}
    want=true;start();return true;
  }
  function meter(){try{const AC=window.AudioContext||window.webkitAudioContext;const c=new AC();const s=c.createMediaStreamSource(stream);an=c.createAnalyser();an.fftSize=512;lvlBuf=new Uint8Array(an.fftSize);s.connect(an);meter.ctx=c}catch{an=null}}
  function getLevel(){if(!an)return 0;an.getByteTimeDomainData(lvlBuf);let s=0;for(let i=0;i<lvlBuf.length;i++){const v=(lvlBuf[i]-128)/128;s+=v*v}const r=Math.sqrt(s/lvlBuf.length);level+=(Math.min(1,r*6)-level)*.3;return level}
  function start(){
    if(!want||running)return;
    rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang=navigator.language||'en-US';rec.maxAlternatives=3;
    rec.onstart=()=>{running=true;fails=0;st('listening')};
    rec.onresult=e=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i],alts=[...r].map(a=>a.transcript);const text=alts[0]||'';
        onTranscript?.(text,r.isFinal);
        if(i<=handledIdx)continue;
        let id=null;for(const a of alts){id=parse(a,getName?.());if(id)break}
        if(id&&(r.isFinal||strongInterim(alts[0]))){handledIdx=i;onCommand(id,text);}
        else if(r.isFinal&&!id&&text.trim().length>1){handledIdx=i;onCommand(null,text)}
      }
    };
    rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){want=false;st('denied')}else if(e.error==='no-speech'||e.error==='aborted'){}else{fails++;if(fails>4){st('error')}}};
    rec.onend=()=>{running=false;handledIdx=-1;if(want){clearTimeout(restartT);restartT=setTimeout(()=>{try{start()}catch{}},fails?800:150)}else st('off')};
    try{rec.start()}catch(e){running=false}
  }
  // Act on interim text only when it is short and unambiguous, so a quick "sit" feels instant.
  function strongInterim(text){const w=norm(text).trim().split(' ').filter(Boolean);return w.length<=4}
  function pause(){want=false;clearTimeout(restartT);try{rec?.abort()}catch{};running=false;stream?.getTracks().forEach(t=>t.stop());stream=null;try{meter.ctx?.close()}catch{};an=null;st('off')}
  return {supported,enable,pause,getLevel,isOn:()=>want,parse};
}
