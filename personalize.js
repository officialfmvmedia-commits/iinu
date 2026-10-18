(()=>{
const input=document.querySelector('#inu-name'),form=document.querySelector('#name-form'),feedback=document.querySelector('#name-feedback');
const clean=value=>Array.from(String(value).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim().replace(/\s+/g,' ')).slice(0,24).join('');
function show(name){
  const display=name||'iINU';
  if(input)input.value=name;
  document.querySelectorAll('.inu-name').forEach(el=>el.textContent=display);
  document.title=name?name+' · iINU':'iINU';
}
try{show(clean(localStorage.getItem('inu-name')||''))}catch{show('')}
form?.addEventListener('submit',event=>{
  event.preventDefault();
  const name=clean(input.value);show(name);
  try{
    if(name)localStorage.setItem('inu-name',name);else localStorage.removeItem('inu-name');
    feedback.textContent=name?'Hello, '+name+'. Saved on this browser.':'Name reset to iINU.';
  }catch{feedback.textContent='Named for this visit. Browser storage is unavailable.'}
});
addEventListener('storage',event=>{if(event.key==='inu-name')show(clean(event.newValue||''))});
})();
