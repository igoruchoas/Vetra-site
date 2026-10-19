/* Vetra — interações
   Inspirações: React Bits (SplitText/BlurText, ShinyText, DecryptedText, ScrollVelocity, SpotlightCard,
   Magnet, TiltedCard, CountUp, DotGrid) · 21st.dev (nav em pílula, accordion, pricing) · Figma (canvas multiplayer). */
(() => {
  'use strict';

  /* ===== Configuração de contato: preencha quando tiver os canais ===== */
  const CONFIG = {
    whatsapp: '',            // ex.: '5511999999999' (DDI + DDD + número, só dígitos)
    email: '',               // ex.: 'contato@vetra.dev'
    instagram: 'vetra.dev'
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- Toast ---------- */
  const toastEl = $('#toast'); let toastT;
  const toast = (m, ms = 2600) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); };

  /* ---------- Nav ---------- */
  const nav = $('#nav'), toggle = $('#navToggle'), sheet = $('#navSheet');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', sheet).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  const links = $$('.nav__links a'), pill = $('.nav__pill');
  let active = null;
  const movePill = (a) => {
    if (!a) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1; pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  links.forEach(a => a.addEventListener('mouseenter', () => movePill(a)));
  $('.nav__links').addEventListener('mouseleave', () => movePill(active));
  const sections = ['servicos', 'processo', 'planos', 'faq'].map(id => document.getElementById(id));
  const updateActive = () => {
    const y = innerHeight * .4; let cur = null;
    sections.forEach(s => { const r = s.getBoundingClientRect(); if (r.top < y && r.bottom > y) cur = s.id; });
    const a = links.find(l => l.getAttribute('href') === '#' + cur) || null;
    if (a !== active) { active = a; links.forEach(l => l.classList.toggle('is-active', l === a)); movePill(a); }
  };

  /* ---------- SplitText (BlurText) ---------- */
  const split = (el) => {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { f.append(' '); return; }
          const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = p; f.append(s);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  };
  $$('.split').forEach(split);

  /* ---------- DecryptedText ---------- */
  const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789/<>{}#$_';
  const decrypt = (el) => {
    if (reduce || el.dataset.done) return; el.dataset.done = 1;
    const final = el.dataset.text || el.textContent; const len = final.length; const t0 = performance.now(); const dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur); const fixed = Math.floor(p * len);
      let out = final.slice(0, fixed);
      for (let k = fixed; k < len; k++) out += final[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Reveal + gatilhos de visibilidade ---------- */
  const watchers = [];
  const whenVisible = (el, fn, ratio = .88) => watchers.push({ el, fn, ratio });
  const runWatchers = () => {
    for (let i = watchers.length - 1; i >= 0; i--) {
      const w = watchers[i]; const r = w.el.getBoundingClientRect();
      if (r.top < innerHeight * w.ratio && r.bottom > 0) { w.fn(w.el); watchers.splice(i, 1); }
    }
  };
  $$('.reveal').forEach(el => {
    if (reduce) return;
    if (el.getBoundingClientRect().top > innerHeight * .95) {
      el.classList.add('pre');
      const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      el.style.transitionDelay = (sib.indexOf(el) % 3) * 90 + 'ms';
      whenVisible(el, e => e.classList.remove('pre'));
    }
  });
  $$('.decrypt').forEach(el => whenVisible(el, decrypt, .9));

  /* ---------- CountUp ---------- */
  $$('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count), d = +(el.dataset.dec || 0);
    if (reduce) return;
    el.textContent = fmt(0, d);
    whenVisible(el, () => {
      const t0 = performance.now(), dur = 1700;
      const tick = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)), d); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  });

  /* ---------- Gráfico ---------- */
  const chart = $('.chart');
  if (chart && !reduce) { chart.classList.add('pre'); whenVisible(chart, c => requestAnimationFrame(() => c.classList.remove('pre'))); }

  /* ---------- Spotlight cards ---------- */
  $$('.spot').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------- Magnet ---------- */
  if (fine && !reduce) $$('.magnet').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- Tilt nos planos ---------- */
  if (fine && !reduce) $$('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- Hero: grade de pontos que acende sob o cursor ---------- */
  const hero = $('.hero'), lit = $('.hero__dots--lit');
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); lit.style.setProperty('--mx', e.clientX - r.left + 'px'); lit.style.setProperty('--my', e.clientY - r.top + 'px'); });
  hero.addEventListener('pointerleave', () => { lit.style.setProperty('--mx', '-500px'); lit.style.setProperty('--my', '-500px'); });

  /* ---------- Canvas Figma ao vivo ---------- */
  const fig = $('#fig'), board = $('#board'), mock = $('#mock');
  const sel = $('#sel'), selTag = $('#selTag'), selSize = $('#selSize'), note = $('#note');
  const curA = $('#curA'), curB = $('#curB'), term = $('#term'), me = $('#me');
  const T = { copy: $('#mCopy'), img: $('#mImg'), btn: $('#mBtn'), live: $('#mLive'), toast: $('#mToast') };
  const rel = (el) => { const b = board.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height }; };
  const moveTo = (cur, x, y) => { cur.style.transform = `translate(${x}px, ${y}px)`; };
  const select = (el, tag) => {
    if (!el) { sel.classList.remove('on'); return; }
    const p = rel(el), pad = 4, k = 1440 / Math.max(1, mock.offsetWidth);
    sel.style.transform = `translate(${p.x - pad}px, ${p.y - pad}px)`; sel.style.width = p.w + pad * 2 + 'px'; sel.style.height = p.h + pad * 2 + 'px';
    selTag.textContent = tag; selSize.textContent = `W ${Math.round(p.w * k)} · H ${Math.round(p.h * k)}`; sel.classList.add('on');
  };
  let typeT;
  const type = (txt) => {
    clearInterval(typeT); if (reduce) { term.textContent = txt; return; }
    let i = 0; term.textContent = '';
    typeT = setInterval(() => { term.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(typeT); }, 28);
  };
  const showNote = (on) => {
    if (!on) { note.classList.remove('on'); return; }
    const p = rel(T.btn), bw = board.clientWidth, nw = Math.min(220, bw * .55);
    let x = p.x + p.w + 14, y = p.y - 8;
    if (x + nw > bw - 8) { x = clamp(p.x, 8, bw - nw - 8); y = p.y + p.h + 14; }
    note.style.maxWidth = nw + 'px'; note.style.left = x + 'px'; note.style.top = y + 'px'; note.classList.add('on');
  };
  const steps = [
    () => { mock.className = 'mock s1'; showNote(false); select(T.copy, 'Texto'); const p = rel(T.copy); moveTo(curA, p.x + p.w * .8, p.y + p.h * .9); const b = rel(board); moveTo(curB, board.clientWidth * .82, board.clientHeight * .12); type('git init'); },
    () => { mock.className = 'mock'; select(T.img, 'Imagem'); const p = rel(T.img); moveTo(curA, p.x + p.w * .6, p.y + p.h * .55); type('git commit -m "layout aprovado"'); },
    () => { select(T.btn, 'Botão'); const p = rel(T.btn); moveTo(curB, p.x + p.w * .7, p.y + p.h * .6); setTimeout(() => showNote(true), 650); type('# comentário: botão mais chamativo'); },
    () => { mock.className = 'mock pop'; const p = rel(T.btn); moveTo(curA, p.x + p.w * .4, p.y + p.h * .8); setTimeout(() => select(T.btn, 'Botão'), 520); setTimeout(() => showNote(false), 900); type('git commit -m "botão em destaque"'); },
    () => { mock.className = 'mock pop live'; select(null); const l = rel(T.live); moveTo(curA, l.x + l.w * .55, l.y + l.h + 6); const t = rel(T.toast); moveTo(curB, t.x + t.w * .5, t.y + t.h * .7); type('git push  →  no ar ✓'); }
  ];
  const durations = [2600, 2600, 2900, 2600, 4200];
  let si = 0, figTimer = null, figVisible = true;
  const runStep = () => { steps[si](); figTimer = setTimeout(() => { si = (si + 1) % steps.length; if (figVisible && !document.hidden) runStep(); else figTimer = null; }, durations[si]); };
  if (reduce) { mock.className = 'mock pop live'; moveTo(curA, -60, -60); moveTo(curB, -60, -60); term.textContent = 'git push  →  no ar ✓'; }
  else {
    requestAnimationFrame(() => runStep());
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { figVisible = e.isIntersecting; if (figVisible && !figTimer) runStep(); }).observe(fig);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && figVisible && !figTimer) runStep(); });
    addEventListener('resize', () => { clearTimeout(figTimer); figTimer = null; runStep(); });
  }
  // cursor "Você" do visitante, estilo multiplayer
  if (fine) {
    fig.addEventListener('pointermove', e => { const r = fig.getBoundingClientRect(); me.style.transform = `translate(${e.clientX - r.left - 2}px, ${e.clientY - r.top - 2}px)`; me.classList.add('on'); fig.classList.add('hovering'); });
    fig.addEventListener('pointerleave', () => { me.classList.remove('on'); fig.classList.remove('hovering'); });
  }

  /* ---------- Marquee (ScrollVelocity) ---------- */
  const tracks = $$('.marquee__track').map(tr => { const g = $('.marquee__group', tr); for (let i = 0; i < 3; i++) tr.append(g.cloneNode(true)); return { tr, g, x: 0, base: +tr.dataset.speed }; });
  let lastY = scrollY, vel = 0;

  /* ---------- Processo ---------- */
  const stepsEl = $('#steps'), stepsFill = $('.steps__line i'), stepItems = $$('.step');
  const runSteps = () => {
    const r = stepsEl.getBoundingClientRect(), mid = innerHeight * .6;
    const p = clamp((mid - r.top) / r.height, 0, 1);
    stepsFill.style.height = (p * 100) + '%';
    stepItems.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < mid));
  };

  /* ---------- Loop principal ---------- */
  let prevT = performance.now();
  const loop = (t) => {
    const dt = Math.min(50, t - prevT) / 1000; prevT = t;
    const dy = scrollY - lastY; lastY = scrollY; vel += (dy * 4 - vel) * .1;
    if (!reduce) tracks.forEach(k => {
      const w = k.g.offsetWidth || 1;
      k.x -= (k.base + Math.abs(vel) * 2) * dt;
      k.x = ((k.x % w) - w) % w;
      k.tr.style.transform = `translate3d(${k.x}px,0,0)`;
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const onScroll = () => { nav.classList.toggle('is-scrolled', scrollY > 30); runWatchers(); runSteps(); updateActive(); };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  /* ---------- Cards vivos ---------- */
  const FEED = [['Pedido de orçamento', 'via formulário'], ['Clique no WhatsApp', 'página inicial'], ['Novo contato', 'Google → site'], ['Agendamento', 'botão "Agendar"'], ['Pedido de cardápio', 'Instagram → site']];
  const feed = $('#feed'); let fi = 3;
  const STATUS = ['Agendado', 'Confirmado', 'Concluído'];
  const sts = $$('.st'); sts.forEach((s, i) => { s.dataset.s = i % 3; s.textContent = STATUS[i % 3]; });
  const LOG = [['PageView', '/'], ['ViewContent', '/planos'], ['Lead', 'botão WhatsApp'], ['PageView', '/servicos'], ['Contact', 'formulário'], ['ViewContent', '/sobre']];
  const logEl = $('#log'); let li = 3;
  if (!reduce) {
    setInterval(() => {
      if (document.hidden) return;
      const last = feed.lastElementChild; const [b, s] = FEED[fi++ % FEED.length];
      last.querySelector('b').textContent = b; last.querySelector('span').textContent = s; last.querySelector('em').textContent = 'agora';
      [...feed.children].forEach((c, i) => { if (c !== last) c.querySelector('em').textContent = ['3 min', '12 min'][i] || '20 min'; });
      feed.prepend(last); last.classList.remove('in'); void last.offsetWidth; last.classList.add('in');
    }, 3000);
    setInterval(() => { if (document.hidden) return; sts.forEach(s => { const n = (+s.dataset.s + 1) % 3; s.dataset.s = n; s.textContent = STATUS[n]; }); }, 2000);
    setInterval(() => {
      if (document.hidden) return;
      const [ev, path] = LOG[li++ % LOG.length]; const d = document.createElement('div');
      if (ev === 'Lead' || ev === 'Contact') d.className = 'log__hit';
      d.innerHTML = '<span></span><em></em>'; d.firstChild.textContent = ev; d.lastChild.textContent = path; d.classList.add('in');
      logEl.append(d); if (logEl.children.length > 3) logEl.firstElementChild.remove();
    }, 2400);
  }

  /* ---------- Prova (medições reais deste acesso) ---------- */
  const pLoad = $('#pLoad'), pView = $('#pView');
  const setView = () => { pView.textContent = fmt(innerWidth) + ' px'; };
  setView(); addEventListener('resize', setView);
  const setLoad = () => {
    const n = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const ms = n && n.domContentLoadedEventEnd > 0 ? n.domContentLoadedEventEnd : performance.now();
    pLoad.textContent = fmt(ms / 1000, ms < 10000 ? 2 : 1).replace(/0$/, '') + ' s';
  };
  if (document.readyState === 'complete') setLoad(); else addEventListener('load', () => setTimeout(setLoad, 0));

  /* ---------- FAQ ---------- */
  $$('.qa').forEach(q => {
    const b = $('button', q);
    b.addEventListener('click', () => {
      const open = !q.classList.contains('is-open');
      $$('.qa').forEach(x => { x.classList.remove('is-open'); $('button', x).setAttribute('aria-expanded', 'false'); });
      q.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Contato ---------- */
  const ways = $('#ways'), hint = $('#formHint');
  if (CONFIG.whatsapp) {
    const a = document.createElement('a'); a.className = 'way'; a.target = '_blank'; a.rel = 'noopener';
    a.href = `https://wa.me/${CONFIG.whatsapp}`; a.innerHTML = '<span class="way__k">WhatsApp</span><b></b>';
    a.querySelector('b').textContent = '+' + CONFIG.whatsapp; ways.prepend(a);
    hint.textContent = 'Sua mensagem abre pronta no nosso WhatsApp.';
  }
  if (CONFIG.email) {
    const a = document.createElement('div'); a.className = 'way'; a.innerHTML = '<span class="way__k">E-mail</span><b></b>';
    a.querySelector('b').textContent = CONFIG.email; ways.append(a);
  }
  $$('[data-plan]').forEach(b => b.addEventListener('click', () => {
    $('#plano').value = b.dataset.plan; $('#t-site').checked = true; setErr('f-tipo');
  }));
  const form = $('#form');
  const setErr = (id, msg) => { const f = document.getElementById(id); if (!f) return; f.classList.toggle('is-err', !!msg); $('.field__err', f).textContent = msg || ''; };
  const read = () => ({ nome: $('#nome').value.trim(), negocio: $('#negocio').value.trim(), plano: $('#plano').value, msg: $('#msg').value.trim(), tipo: $$('input[name="tipo"]:checked').map(i => i.value) });
  form.addEventListener('input', () => { const d = read(); if (d.nome) setErr('f-nome'); if (d.tipo.length) setErr('f-tipo'); });
  const openLink = (href) => { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove(); };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = read(); let ok = true;
    if (!d.nome) { setErr('f-nome', 'Diga como podemos te chamar.'); ok = false; }
    if (!d.tipo.length) { setErr('f-tipo', 'Escolha pelo menos uma opção. Se não souber, marque "Ainda não sei".'); ok = false; }
    if (!ok) { (d.nome ? $('#t-site') : $('#nome')).focus(); return; }
    const lines = [`Olá! Vim pelo site da Vetra.`, `Sou ${d.nome}${d.negocio ? `, do ${d.negocio}` : ''}.`, `Preciso de: ${d.tipo.join(', ')}.`];
    if (d.plano) lines.push(`Plano de interesse: ${d.plano}.`);
    if (d.msg) lines.push('', d.msg);
    const text = lines.join('\n');
    if (CONFIG.whatsapp) { openLink(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`); toast('Abrindo o WhatsApp com a sua mensagem…'); return; }
    const go = () => openLink(`https://ig.me/m/${CONFIG.instagram}`);
    const fallback = () => { const m = $('#msg'); m.value = text; m.focus(); m.select(); toast('Copie a mensagem selecionada e cole no nosso direct.', 4200); go(); };
    try {
      navigator.clipboard.writeText(text).then(() => { toast('Mensagem copiada! Cole no direct que acabou de abrir.', 4200); go(); }, fallback);
    } catch { fallback(); }
  });

  /* ---------- Grade de pontos no contato (DotGrid) ---------- */
  const cv = $('#grid');
  if (cv) {
    const c = cv.getContext('2d'), host = cv.parentElement; let W, H, dots = [], m = { x: -999, y: -999 }, vis = false;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = host.clientWidth; H = host.clientHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); dots = []; for (let y = 12; y < H; y += 24) for (let x = 12; x < W; x += 24) dots.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 }); };
    size(); addEventListener('resize', size);
    host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; });
    host.addEventListener('pointerleave', () => { m.x = m.y = -999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(host); else vis = true;
    const draw = () => {
      if (vis) {
        c.clearRect(0, 0, W, H);
        for (const d of dots) {
          const dx = d.x - m.x, dy = d.y - m.y, dist = Math.hypot(dx, dy) || 1;
          if (dist < 120 && !reduce) { const f = (1 - dist / 120) * 2.4; d.vx += dx / dist * f; d.vy += dy / dist * f; }
          d.vx += (d.ox - d.x) * .06; d.vy += (d.oy - d.y) * .06; d.vx *= .82; d.vy *= .82; d.x += d.vx; d.y += d.vy;
          const near = Math.max(0, 1 - dist / 170);
          c.fillStyle = near > .05 ? `rgba(77,181,255,${.18 + near * .75})` : 'rgba(255,255,255,.1)';
          c.beginPath(); c.arc(d.x, d.y, 1.1 + near * 1.5, 0, 6.283); c.fill();
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ---------- Rodapé: palavra que acende ---------- */
  const fw = $('#fword');
  fw.addEventListener('pointermove', e => { const r = fw.getBoundingClientRect(); fw.style.setProperty('--fx', e.clientX - r.left + 'px'); fw.style.setProperty('--fy', e.clientY - r.top + 'px'); });
  fw.addEventListener('pointerleave', () => fw.style.setProperty('--fx', '-400px'));
  if (!fine && !reduce) { let a = 0; setInterval(() => { a += .025; fw.style.setProperty('--fx', (50 + Math.sin(a) * 46) + '%'); }, 30); }

  $('#ano').textContent = new Date().getFullYear();
})();
