// Count-up numerals for the "at a glance" module, once, when they scroll in.
(()=>{
  const els=[...document.querySelectorAll('[data-count]')];if(!els.length)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease=t=>1-Math.pow(1-t,4);
  const run=el=>{const to=+el.dataset.count,dur=to>9?1400:900,t0=performance.now();
    const f=now=>{const k=Math.min(1,(now-t0)/dur);el.textContent=String(Math.round(to*ease(k)));if(k<1)requestAnimationFrame(f)};
    el.textContent='0';requestAnimationFrame(f)};
  if(reduce||!('IntersectionObserver' in window))return;
  els.forEach(el=>el.textContent='0');
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);setTimeout(()=>run(e.target),250)}}),{threshold:.6});
  els.forEach(el=>io.observe(el));
})();
