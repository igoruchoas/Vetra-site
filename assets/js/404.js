(() => {
  document.getElementById('ano').textContent = new Date().getFullYear();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // terminal digitando
  const el = document.getElementById('typed'), txt = 'git checkout main  # voltando para a direção certa';
  if (reduce) el.textContent = txt;
  else { let i = 0; const t = setInterval(() => { el.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(t); }, 45); }
  // o ▷ procura a direção e passa a seguir o mouse
  const p = document.getElementById('pointer'), svg = p.querySelector('svg');
  let cur = 0;
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      p.classList.remove('search');
      const r = p.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
      let d = a - cur; d = ((d + 540) % 360) - 180; cur += d;
      svg.style.setProperty('--a', cur.toFixed(1) + 'deg');
    }, { passive: true });
  }
})();
