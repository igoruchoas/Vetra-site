/* Vetra v2 — rolagem, desbloqueios e interações.
   A cena 3D fica em gl.js e lê o estado em window.V3. */
(() => {
  'use strict';

  const CONFIG = { whatsapp: '5535997183927', email: 'contato@vetra.dev.br', instagram: 'vetra.dev' };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const smooth = (t) => t * t * (3 - 2 * t);

  /* Estado compartilhado com a cena 3D */
  const V3 = window.V3 = {
    t: { x: 0, y: .2, s: 1, rx: 0, ry: 0, split: 0, wire: 0, op: 1 },
    mx: 0, my: 0, vel: 0, start: false, ready: false, fps: 0, tris: 0, reduce
  };

  /* ---------- Toast ---------- */
  const toastEl = $('#toast'); let toastT;
  const toast = (m, ms = 2600) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); };

  /* ---------- Rolagem suave (Lenis) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    try { lenis = new Lenis({ lerp: .09, smoothWheel: true, wheelMultiplier: .95 }); } catch (e) { lenis = null; }
  }
  const yOf = (el) => el === document.body ? 0 : el.getBoundingClientRect().top + scrollY;
  const jumpTo = (y) => { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); };
  const scrollToEl = (el) => {
    if (!el) return;
    const y = yOf(el);
    if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------- Transição ▷ entre seções ---------- */
  const wipe = $('#wipe'), wipeLbl = $('#wipeLbl'); let wiping = false;
  const NAMES = { topo: 'início', servicos: 'serviços', cases: 'na prática', processo: 'processo', planos: 'planos', orcamento: 'orçamento', faq: 'dúvidas', contato: 'contato', prova: 'raio-x', manifesto: 'a direção' };
  const goTo = (id) => {
    const el = id === 'topo' ? document.body : document.getElementById(id);
    if (!el) return;
    if (reduce || wiping || Math.abs(yOf(el) - scrollY) < innerHeight * 1.2) { scrollToEl(el); return; }
    wiping = true; wipeLbl.textContent = '▷ ' + (NAMES[id] || id);
    wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go');
    setTimeout(() => { jumpTo(yOf(el)); }, 560);
    setTimeout(() => { wipe.classList.remove('go'); wiping = false; }, 1350);
  };
  window.vetraGoTo = goTo;
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (!(id === 'topo' || document.getElementById(id))) return;
    e.preventDefault(); setMenu(false); goTo(id);
  }));

  /* ---------- Nav ---------- */
  const nav = $('#nav'), toggle = $('#navToggle');
  function setMenu(open) {
    nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (lenis) open ? lenis.stop() : lenis.start(); else document.body.style.overflow = open ? 'hidden' : '';
  }
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  const navLinks = $$('.nav__links a');

  /* ---------- Loader ---------- */
  const loader = $('#loader'), ldN = $('#ldN'), ldBar = $('#ldBar'), ldMsg = $('#ldMsg');
  const MSGS = ['carregando direção…', 'polindo a prata…', 'calibrando o vetor…', 'pronto.'];
  const begin = () => {
    loader.classList.add('out'); root.classList.add('ready'); V3.start = true;
    try { localStorage.setItem('vetra:visto', '1'); } catch (e) {}
  };
  // quem já visitou entra direto (a logo ainda faz a montagem de abertura)
  if (reduce || root.classList.contains('seen')) { ldN.textContent = 100; setTimeout(begin, reduce ? 0 : 120); }
  else {
    const t0 = performance.now(), MIN = 1500, MAX = 3200;
    const step = (t) => {
      const el = t - t0;
      const target = V3.ready || el > MAX ? 1 : Math.min(.9, el / MIN);
      const shown = +ldN.dataset.v || 0; const nv = shown + (target - shown) * .12;
      ldN.dataset.v = nv; ldN.textContent = Math.round(nv * 100); ldBar.style.width = nv * 100 + '%';
      ldMsg.textContent = MSGS[Math.min(3, Math.floor(nv * 3.4))];
      if (nv > .995 && el > MIN) { ldN.textContent = 100; setTimeout(begin, 180); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Cursor ---------- */
  const cur = $('#cursor'), curLbl = $('#curLbl'); let cx = -100, cy = -100, tx = -100, ty = -100, ang = 0, angT = 0, overUI = false;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') {
      const dx = e.clientX - tx, dy = e.clientY - ty;
      if (dx * dx + dy * dy > 9 && tx > -100) { const a = Math.atan2(dy, dx) * 180 / Math.PI; let d = a - angT; d = ((d + 540) % 360) - 180; angT += d; }
      tx = e.clientX; ty = e.clientY; cur.classList.add('on');
    }
    V3.mx = (e.clientX / innerWidth) * 2 - 1; V3.my = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
  if (fine) {
    $$('a, button, .chip, .kind, .opt, .way').forEach(el => {
      el.addEventListener('pointerenter', () => { overUI = true; cur.classList.add('big'); });
      el.addEventListener('pointerleave', () => { overUI = false; cur.classList.remove('big'); });
    });
    $$('input, textarea, select').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('off'));
      el.addEventListener('pointerleave', () => cur.classList.remove('off'));
    });
  }

  /* ---------- Magnet ---------- */
  if (fine && !reduce) $$('.magnet').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- Tilt + spotlight ---------- */
  if (fine && !reduce) $$('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      c.classList.add('dealt'); c.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });
  $$('.svc').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------- Texto decriptado ---------- */
  const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789/<>{}#$_';
  const decrypt = (el) => {
    const final = el.dataset.text; if (reduce || !final) return;
    const len = final.length, t0 = performance.now(), dur = 900;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), fixed = Math.floor(p * len); let out = final.slice(0, fixed);
      for (let k = fixed; k < len; k++) out += final[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out; if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Palavras do manifesto ---------- */
  const words = $('#words');
  (function splitWords(el) {
    const walk = (node) => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { f.append(' '); return; } const s = document.createElement('span'); s.className = 'w'; s.textContent = p; f.append(s); });
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  })(words);
  const wordEls = $$('.w', words);

  /* ---------- Desbloqueios ---------- */
  const hudSecs = $$('[data-hud]');
  const TOTAL = hudSecs.length; $('#hudT').textContent = TOTAL;
  hudSecs.forEach(s => $$('.lk', s).forEach((el, i) => el.style.setProperty('--d', i)));
  $$('.deal').forEach((el, i) => el.style.setProperty('--d', i % 3));
  let unlocked = 0; const unlockEl = $('#unlock'), unlockName = $('#unlockName'); let unlockT;
  const unlock = (sec, silent) => {
    if (sec.classList.contains('is-unlocked')) return;
    sec.classList.add('is-unlocked', 'scan'); unlocked++;
    $$('.dec', sec).forEach(decrypt);
    $('#hudN').textContent = unlocked; $('#hudBar').style.width = (unlocked / TOTAL * 100) + '%';
    const hud = $('#hud');
    if (unlocked === TOTAL) { hud.classList.add('done'); $('use', hud).setAttribute('href', '#i-unlock'); }
    if (!silent) {
      unlockName.textContent = unlocked === TOTAL ? 'Tudo! 100% da Vetra' : sec.dataset.hud;
      unlockEl.classList.add('on'); clearTimeout(unlockT); unlockT = setTimeout(() => unlockEl.classList.remove('on'), 1900);
    }
    if (sec.id === 'servicos') startDemos();
  };
  if (reduce) hudSecs.forEach(s => unlock(s, true));

  /* ---------- Medidas e quadros-chave da cena 3D ---------- */
  const casesEl = $('#cases'), man = $('#manifesto'), svc = $('#servicos'), track = $('#track'), xray = $('#prova'), proc = $('#processo'), contato = $('#contato');
  const splitL = $('#splitL'), splitR = $('#splitR'), splitEq = $('#splitEq'), manCopy = $('.manifesto__copy');
  let KF = [], M = {}, mobile = false, svcHoriz = true;
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  const layout = () => {
    mobile = innerWidth <= 820; svcHoriz = !mobile;
    const vh = innerHeight;
    if (svcHoriz) {
      svc.style.height = '';
      const dist = Math.max(0, track.scrollWidth - innerWidth);
      svc.style.height = (dist + vh * 1.15) + 'px';
      M.svcDist = dist;
    } else svc.style.height = '';
    M.man = top(man); M.manLen = man.offsetHeight - vh;
    M.svc = top(svc); M.svcLen = svc.offsetHeight - vh;
    M.xray = top(xray); M.xrayH = xray.offsetHeight;
    M.proc = top(proc); M.cont = top(contato); M.cases = top(casesEl); M.casesLen = casesEl.offsetHeight - vh;
    const P = (o) => Object.assign({ x: 0, y: 0, s: 1, rx: 0, ry: 0, split: 0, wire: 0, op: 1, dust: 0 }, o);
    const TAU = Math.PI * 2;
    const m = M.man, L = M.manLen;
    const hero = mobile ? P({ y: .3, s: .92 }) : P({ x: .44, y: .26, s: .94, ry: -.25 });
    const side = mobile ? P({ y: -.42, s: .6, ry: .45 }) : P({ x: .5, y: 0, s: .95, ry: .45 });
    KF = [
      Object.assign({ at: 0 }, hero),
      Object.assign({ at: m }, side),
      Object.assign({ at: m + L * .4 }, side, { ry: -.5 }),
      Object.assign({ at: m + L * .58 }, P({ y: mobile ? .12 : 0, s: mobile ? .78 : 1, ry: TAU, split: 1 })),
      Object.assign({ at: m + L * .8 }, P({ y: mobile ? .12 : 0, s: mobile ? .78 : 1, ry: TAU, split: 1 })),
      Object.assign({ at: m + L * .97 }, P({ y: mobile ? .12 : 0, s: mobile ? .78 : 1, ry: TAU * 2, split: 0 })),
      Object.assign({ at: M.svc + vh * .35 }, P({ x: mobile ? 0 : .55, y: 0, s: .6, ry: TAU * 2 + 1.2, op: 0 })),
      ...(mobile ? [
        Object.assign({ at: M.xray - vh * .7 }, P({ y: .42, s: .62, ry: TAU * 2 + 2.4, op: 0 })),
        Object.assign({ at: M.xray - vh * .05 }, P({ y: .42, s: .62, ry: TAU * 3, op: 1 })),
        Object.assign({ at: M.xray + vh * .25 }, P({ y: .62, s: .6, ry: TAU * 3 + .5, wire: 1, op: 1 })),
        Object.assign({ at: M.xray + vh * .45 }, P({ y: 1.05, s: .55, ry: TAU * 3 + 1, wire: 1, op: 0 }))
      ] : [
        Object.assign({ at: M.xray - vh * .7 }, P({ x: .5, s: .92, ry: TAU * 2 + 2.4, op: 0 })),
        Object.assign({ at: M.xray - vh * .1 }, P({ x: .5, s: .92, ry: TAU * 3, op: 1 })),
        Object.assign({ at: M.xray + M.xrayH - vh * 1.1 }, P({ x: .5, s: .92, ry: TAU * 3 + .5, wire: 1, op: 1 })),
        Object.assign({ at: M.cases - vh * .25 }, P({ x: .5, s: .7, ry: TAU * 3 + 1.4, wire: 1, op: 0 }))
      ]),
      Object.assign({ at: M.cont - vh * .55 }, P({ y: mobile ? .5 : .52, s: mobile ? .62 : .66, ry: TAU * 4 - 1.5, op: 0, dust: 1 })),
      Object.assign({ at: M.cont - vh * .2 }, P({ y: mobile ? .5 : .52, s: mobile ? .62 : .66, ry: TAU * 4 - 1, op: 1, dust: 1 })),
      Object.assign({ at: M.cont + vh * .12 }, P({ y: mobile ? .5 : .52, s: mobile ? .62 : .66, ry: TAU * 4, op: 1, dust: 0 })),
      Object.assign({ at: M.cont + vh * .5 }, P({ y: (mobile ? .5 : .52) + .76, s: mobile ? .62 : .66, ry: TAU * 4 + .5, op: .6 })),
      Object.assign({ at: M.cont + vh * .65 }, P({ y: (mobile ? .5 : .52) + 1.06, s: mobile ? .62 : .66, ry: TAU * 4 + .6, op: 0 }))
    ];
  };
  const KEYS = ['x', 'y', 's', 'rx', 'ry', 'split', 'wire', 'op', 'dust'];
  const sample = (y) => {
    const out = V3.t;
    if (!KF.length) return;
    if (y <= KF[0].at) { KEYS.forEach(k => out[k] = KF[0][k]); return; }
    for (let i = 0; i < KF.length - 1; i++) {
      const a = KF[i], b = KF[i + 1];
      if (y <= b.at) { const e = smooth(clamp((y - a.at) / Math.max(1, b.at - a.at), 0, 1)); KEYS.forEach(k => out[k] = a[k] + (b[k] - a[k]) * e); return; }
    }
    const l = KF[KF.length - 1]; KEYS.forEach(k => out[k] = l[k]);
  };

  /* ---------- Demos dos serviços ---------- */
  let demosOn = false;
  function startDemos() {
    if (demosOn) return; demosOn = true;
    const dash = $('.dash'); setTimeout(() => dash.classList.add('on'), 300);
    $$('[data-count]').forEach(el => {
      const to = parseFloat(el.dataset.count), d = +(el.dataset.dec || 0);
      if (reduce) return; const t0 = performance.now() + 300, dur = 1800;
      const tick = (t) => { const p = clamp((t - t0) / dur, 0, 1); el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)), d); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    if (reduce) return;
    const PINGS = [['Novo contato pelo site', 'Google → site'], ['Clique no WhatsApp', 'página inicial'], ['Pedido de orçamento', 'formulário'], ['Agendamento', 'botão Agendar'], ['Novo contato pelo site', 'Instagram → site']];
    const pings = $('#pings'); let pi = 0;
    const addPing = () => {
      if (document.hidden) return; const [b, s] = PINGS[pi++ % PINGS.length];
      const li = document.createElement('li'); li.innerHTML = '<b></b><span></span>'; li.firstChild.textContent = b; li.lastChild.textContent = s;
      pings.prepend(li); while (pings.children.length > 3) pings.lastElementChild.remove();
    };
    addPing(); setInterval(addPing, 2600);
    const STATUS = ['Agendado', 'Confirmado', 'Concluído']; const sts = $$('.st'); const sysN = $('#sysN'); let n = 12;
    setInterval(() => { if (document.hidden) return; sts.forEach(s => { const v = (+s.dataset.s + 1) % 3; s.dataset.s = v; s.textContent = STATUS[v]; }); sysN.textContent = ++n; }, 2200);
    const LOG = [['PageView', '/'], ['ViewContent', '/planos'], ['Lead', 'botão WhatsApp'], ['PageView', '/servicos'], ['Contact', 'formulário'], ['ViewContent', '/sobre']];
    const logEl = $('#evlog'); let li = 3;
    setInterval(() => {
      if (document.hidden) return; const [ev, path] = LOG[li++ % LOG.length]; const d = document.createElement('div');
      if (ev === 'Lead' || ev === 'Contact') d.className = 'hit'; d.classList.add('in');
      d.innerHTML = '<span></span><em></em>'; d.firstChild.textContent = ev; d.lastChild.textContent = path;
      logEl.append(d); while (logEl.children.length > 3) logEl.firstElementChild.remove();
    }, 2000);
  }

  /* ---------- Marquee com velocidade da rolagem ---------- */
  const tracks = $$('.marquee__track').map(tr => { const g = $('.marquee__group', tr); for (let i = 0; i < 3; i++) tr.append(g.cloneNode(true)); return { tr, g, x: 0, base: +tr.dataset.speed }; });

  /* ---------- Prova: números reais ---------- */
  const pLoad = $('#pLoad'), pFps = $('#pFps'), pTris = $('#pTris');
  const setLoad = () => {
    const nv = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const ms = nv && nv.domContentLoadedEventEnd > 0 ? nv.domContentLoadedEventEnd : performance.now();
    pLoad.textContent = fmt(ms / 1000, ms < 10000 ? 2 : 1) + ' s';
  };
  if (document.readyState === 'complete') setLoad(); else addEventListener('load', () => setTimeout(setLoad, 0));
  setInterval(() => {
    if (V3.ready) { pFps.textContent = V3.fps ? Math.round(V3.fps) : '—'; pTris.textContent = V3.tris ? fmt(V3.tris) : '—'; }
    else if (root.classList.contains('no-gl')) { pFps.textContent = '—'; pTris.textContent = 'SVG'; }
  }, 500);
  setTimeout(() => { if (!V3.ready) root.classList.add('no-gl'); }, 4000);

  /* ---------- Títulos: letras sobem e a barra azul se desenha (estilo Lusion) ---------- */
  const auraEl = $('.aura'), marqEl = $('.marquee'); let skew = 0;
  const splitChars = (el) => {
    let ci = 0;
    const walk = (node) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const wd = document.createElement('span'); wd.className = 'wd';
            [...part].forEach(ch => { const c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; c.style.setProperty('--ci', ci++); wd.append(c); });
            frag.append(wd);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el); el.classList.add('chs'); el.style.setProperty('--n', ci);
  };
  if (!reduce) $$('[data-hud] h2, .hero__title .ln > span').forEach(splitChars);

  /* ---------- Bordas que acendem seguindo o mouse (estilo Linear) ---------- */
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--sx', (e.clientX - r.left) + 'px'); el.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    }, { passive: true });
    $$('.plan:not(.plan--top), .qa, .case, .sim__step, .way, .care, .stat, .step').forEach(el => el.classList.add('spot'));
    // palco do processo inclina em 3D com o mouse
    const bwEl = $('.bw'), stageEl = $('.build__stage');
    if (bwEl) addEventListener('pointermove', (e) => {
      const r = stageEl.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const x = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -1, 1), y = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -1, 1);
      stageEl.style.setProperty('--tx', (x * 8).toFixed(2) + 'deg'); stageEl.style.setProperty('--ty', (-y * 6).toFixed(2) + 'deg');
    }, { passive: true });
  }

  /* ---------- Aura do topo reage ao mouse ---------- */
  const glowEl = $('#glow');
  if (glowEl && matchMedia('(pointer: fine)').matches) addEventListener('pointermove', (e) => {
    glowEl.style.setProperty('--gx', ((e.clientX / innerWidth - .5) * 60).toFixed(1) + 'px');
    glowEl.style.setProperty('--gy', ((e.clientY / innerHeight - .5) * 40).toFixed(1) + 'px');
  }, { passive: true });

  /* ---------- Processo ---------- */
  const buildEl = $('#processo'), buildBar = $('#buildBar'), stepEls = $$('.step'), bwUrl = $('#bwUrl'), bwSt = $('#bwSt'), bwVis = $('#bwVis');
  const URLS = ['rascunho · papel e caneta', 'figma.com/layout-aurora', 'teste.vetra.dev.br', 'cafeaurora.com.br'];
  const STS = ['rascunho', 'em aprovação', 'em teste', 'no ar'];
  let lastStep = -1, visT = 0;


  /* ---------- Portfólio 3D (CSS 3D, guiado pela rolagem) ---------- */
  const device = $('#device'), lid = $('#lid'), phone = $('#phone'), lapImg = $('#lapImg'), phImg = $('#phImg'), lapScr = $('.laptop__screen'), phScr = $('.phone__screen');
  const casesNext = $('#casesNext'), cvDesk = $('#cvDesk'), cvMob = $('#cvMob');
  let lastCp = -1;
  const seg = (p, a, b) => smooth(clamp((p - a) / (b - a), 0, 1));
  const casesFrame = (p) => {
    const open = seg(p, 0, .28);
    lid.style.setProperty('--lid', (-92 + 92 * open).toFixed(2) + 'deg');
    device.style.setProperty('--dx', (26 - 16 * open + 4 * seg(p, .55, 1)).toFixed(2) + 'deg');
    device.style.setProperty('--dy', (-34 + 26 * open + 22 * seg(p, .3, 1)).toFixed(2) + 'deg');
    const ls = seg(p, .25, .62), lh = lapImg.offsetHeight - lapScr.clientHeight;
    if (lh > 0) lapImg.style.transform = `translate3d(0,${(-ls * lh).toFixed(1)}px,0)`;
    const pin = seg(p, .42, .62);
    phone.style.setProperty('--po', pin.toFixed(3));
    phone.style.setProperty('--px', ((1 - pin) * 90).toFixed(1) + '%');
    phone.style.setProperty('--pz', (140 + (1 - pin) * 260).toFixed(0) + 'px');
    phone.style.setProperty('--pr', (-30 + 22 * pin + 10 * seg(p, .62, 1)).toFixed(2) + 'deg');
    const ps = seg(p, .55, .94), ph = phImg.offsetHeight - phScr.clientHeight;
    if (ph > 0) phImg.style.transform = `translate3d(0,${(-ps * ph).toFixed(1)}px,0)`;
    cvDesk.classList.toggle('on', p < .55); cvMob.classList.toggle('on', p >= .55);
    casesNext.classList.toggle('on', p > .9);
  };
  [lapImg, phImg].forEach(im => im.addEventListener('load', () => { lastCp = -1; }));

  /* ---------- Simulador de orçamento ---------- */
  const PLANS = [
    { name: 'Básico', price: 299, items: ['Página simples e bonita', 'Adaptada para celular', '15 dias de correção técnica'] },
    { name: 'Profissional', price: 499, items: ['Formulário de contato', 'Google Analytics ou Pixel da Meta', 'Revisão dos textos', '1 mês de manutenção', '2 alterações no primeiro mês'] },
    { name: 'Completo', price: 799, items: ['Layout exclusivo', 'Textos escritos para o seu negócio', '3 meses de manutenção', '2 alterações por mês nesse período'] }
  ];
  const MINE = { 'Formulário de contato': 'Formulário de contato', 'Google Analytics ou Pixel da Meta': 'Google Analytics ou Pixel da Meta', 'Revisão dos textos': 'Revisão dos textos', 'Textos escritos para o meu negócio': 'Textos escritos para o seu negócio', 'Layout exclusivo': 'Layout exclusivo', 'Alterações nos primeiros meses': '3 meses de manutenção' };
  const sim = $('#orcamento'), simSite = $('#simSite'), rPlan = $('#rPlan'), rPrice = $('#rPrice'), rCur = $('#rCur'), rSub = $('#rSub'), rList = $('#rList'), rExtra = $('#rExtra'), rMeter = $('#rMeter'), rMk = $('#rMk');
  const feats = $$('input[name="feat"]', sim), kinds = $$('input[name="kind"]', sim), care = $('#simCare');
  let shownPrice = 299, priceRaf, lastPlan = '';
  const CHECK = '<svg><use href="#i-check"/></svg>';
  const animPrice = (to) => {
    cancelAnimationFrame(priceRaf); const from = shownPrice, t0 = performance.now();
    const tick = (t) => { const k = clamp((t - t0) / 650, 0, 1), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); rPrice.textContent = v; shownPrice = v; if (k < 1) priceRaf = requestAnimationFrame(tick); };
    priceRaf = requestAnimationFrame(tick);
  };
  const simState = () => {
    const k = kinds.filter(i => i.checked).map(i => i.value), site = k.includes('Site');
    const chosen = feats.filter(f => f.checked); const lv = chosen.reduce((m, f) => Math.max(m, +f.dataset.lv), 0);
    return { k, site, chosen: chosen.map(f => f.value), lv, care: care.checked };
  };
  const renderSim = () => {
    const st = simState();
    simSite.classList.toggle('is-off', !st.site);
    let planName, list = [];
    if (st.site) {
      const plan = PLANS[st.lv]; planName = plan.name;
      rPrice.parentElement.classList.remove('custom'); rCur.hidden = false; animPrice(plan.price);
      rSub.textContent = st.lv ? `site · preço fechado · inclui tudo do plano ${PLANS[st.lv - 1].name}` : 'site · preço fechado';
      const mineSet = new Set(st.chosen.map(c => MINE[c]));
      for (let i = 0; i <= st.lv; i++) PLANS[i].items.forEach(it => list.push([it, mineSet.has(it)]));
      rMeter.style.width = (st.lv * 50) + '%'; rMk.style.left = (st.lv * 50) + '%';
      // marca o que o plano já dá de bônus
      feats.forEach(f => f.closest('.opt').classList.toggle('bonus', !f.checked && +f.dataset.lv <= st.lv && st.lv > 0));
    } else {
      planName = 'Sob medida'; rPrice.parentElement.classList.add('custom'); rCur.hidden = true; cancelAnimationFrame(priceRaf); rPrice.textContent = 'A combinar';
      rSub.textContent = 'orçado depois de uma conversa rápida'; rMeter.style.width = '0%'; rMk.style.left = '0%';
      feats.forEach(f => f.closest('.opt').classList.remove('bonus'));
    }
    if (planName !== lastPlan) { rPlan.textContent = planName; rPlan.classList.remove('pop'); void rPlan.offsetWidth; rPlan.classList.add('pop'); lastPlan = planName; }
    rList.innerHTML = list.map(([t, m]) => `<li class="${m ? 'mine' : ''}">${CHECK}<span>${t}</span></li>`).join('');
    const extra = [];
    if (st.k.includes('Sistema')) extra.push(['Sistema sob medida', 'a combinar']);
    if (st.k.includes('Dashboard')) extra.push(['Dashboard sob medida', 'a combinar']);
    if (st.care) extra.push(['Manutenção mensal contínua', '+ R$ 97/mês']);
    if (!st.k.length) extra.push(['Escolha pelo menos uma opção no passo 1', '']);
    rExtra.innerHTML = extra.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  };
  sim.addEventListener('change', renderSim); renderSim();
  $('#rSend').addEventListener('click', () => {
    const st = simState();
    if (!st.k.length) { toast('Escolha pelo menos uma opção no passo 1.'); return; }
    const L = ['Olá! Montei meu projeto no site da Vetra:', '', `• Preciso de: ${st.k.join(', ')}`];
    if (st.site) { L.push(`• Plano indicado: ${PLANS[st.lv].name} (R$ ${PLANS[st.lv].price})`); if (st.chosen.length) L.push(`• Quero: ${st.chosen.join(', ')}`); }
    if (st.k.includes('Sistema') || st.k.includes('Dashboard')) L.push('• Sistema/dashboard: quero conversar sobre o orçamento');
    if (st.care) L.push('• Tenho interesse na manutenção mensal (R$ 97/mês)');
    L.push('', 'Podemos conversar?');
    const a = document.createElement('a'); a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(L.join('\n'))}`; a.target = '_blank'; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove(); toast('Abrindo o WhatsApp com o seu orçamento…');
  });

  /* ---------- Terminal secreto ---------- */
  const term = $('#term'), tOut = $('#termOut'), tForm = $('#termForm'), tIn = $('#termInput');
  const hist = []; let hi = 0, termOpen = false;
  const esc = (t) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const print = (html, cls = '') => { const p = document.createElement('p'); if (cls) p.className = cls; p.innerHTML = html; tOut.append(p); tOut.scrollTop = tOut.scrollHeight; };
  const typeOut = (lines, cls = '', d = 18) => lines.forEach((l, i) => setTimeout(() => print(l, cls), i * d));
  const ART = ['   ◢◣      vetra.', '  ◢◤ ◥◣    ──────────────────', ' ◥◣  ◢◤ ▷  tecnologia com direção', '  ◥◣◢◤     sites · sistemas · dashboards'];
  const closeAnd = (fn) => { closeTerm(); setTimeout(fn, 250); };
  const CMDS = {
    help: () => typeOut(['comandos disponíveis:', '',
      '  <span class="c">sobre</span>       quem é a Vetra', '  <span class="c">servicos</span>    o que a gente faz', '  <span class="c">planos</span>      preços dos sites',
      '  <span class="c">orcamento</span>   monte seu projeto', '  <span class="c">cases</span>       ver um exemplo de site', '  <span class="c">git log</span>     nosso processo',
      '  <span class="c">contato</span>     todos os canais', '  <span class="c">whatsapp</span>    abre a conversa agora', '  <span class="c">logo</span>        surpresa 💥',
      '  <span class="c">ls</span>, <span class="c">whoami</span>, <span class="c">date</span>, <span class="c">neofetch</span>, <span class="c">clear</span>, <span class="c">exit</span>']),
    sobre: () => typeOut(['A <span class="c">Vetra</span> nasceu de "vetor": uma força com direção.', 'Construímos sites que trazem clientes, sistemas que organizam a rotina', 'e dashboards que mostram os números. Tudo feito à mão, sem template.', '', 'Você aprova o design antes da primeira linha de código.']),
    servicos: () => typeOut(['<span class="c">sites/</span>       landing pages, institucionais, SEO, WhatsApp', '<span class="c">sistemas/</span>    agendamentos, pedidos, estoque, clientes', '<span class="c">dashboards/</span>  vendas, metas, analytics, relatórios', '<span class="c">design/</span>      Figma, aprovado antes do código']),
    planos: () => typeOut(['<span class="c">Básico</span>        R$ 299   página bonita, adaptada ao celular', '<span class="c">Profissional</span>  R$ 499   + formulário, analytics/pixel, 1 mês de manutenção', '<span class="c">Completo</span>      R$ 799   + layout exclusivo, textos, 3 meses de manutenção', '', '<span class="dim">manutenção mensal: R$ 97/mês · digite </span><span class="c">orcamento</span><span class="dim"> para montar o seu</span>']),
    orcamento: () => { print('abrindo o simulador…', 'ok'); closeAnd(() => goTo('orcamento')); },
    cases: () => { print('carregando o exemplo…', 'ok'); closeAnd(() => goTo('cases')); },
    'git log': () => typeOut(['<span class="c">commit f05b6d2</span>  git push        → no ar e medindo', '<span class="c">commit e94d0a3</span>  git commit      → desenvolvimento', '<span class="c">commit 7c2e81b</span>  git checkout -b design → design no Figma', '<span class="c">commit a1f3c9e</span>  git init        → diagnóstico']),
    contato: () => typeOut(['WhatsApp   <a href="https://wa.me/5535997183927" target="_blank" rel="noopener">(35) 99718-3927</a>', 'E-mail     <a href="mailto:contato@vetra.dev.br">contato@vetra.dev.br</a>', 'Instagram  <a href="https://instagram.com/vetra.dev" target="_blank" rel="noopener">@vetra.dev</a>', 'Site       vetra.dev.br']),
    whatsapp: () => { print('abrindo o WhatsApp… 📲', 'ok'); const a = document.createElement('a'); a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo terminal secreto do site da Vetra 😄')}`; a.target = '_blank'; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove(); },
    logo: () => { print('boom. 💥', 'ok'); closeAnd(() => { goTo('topo'); setTimeout(() => window.V3.explode && window.V3.explode(), 900); }); },
    ls: () => print('<span class="c">sites/</span>  <span class="c">sistemas/</span>  <span class="c">dashboards/</span>  planos.txt  contato.txt  segredo.txt'),
    'cat planos.txt': () => CMDS.planos(), 'cat contato.txt': () => CMDS.contato(),
    'cat segredo.txt': () => print('🤫 o melhor site é o que traz cliente. este aqui é só pra mostrar que a gente sabe fazer os dois.'),
    whoami: () => print('visitante · <span class="dim">futuro cliente da Vetra?</span>'),
    date: () => print(new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }) + ' · <span class="c">um ótimo dia para começar um projeto</span>'),
    neofetch: () => typeOut([...ART.map(l => `<span class="art">${esc(l)}</span>`), '', `<span class="c">tela</span>     ${innerWidth}×${innerHeight}`, `<span class="c">fps</span>      ${Math.round(V3.fps || 0) || '—'}`, `<span class="c">polígonos</span> ${V3.tris || '—'}`, `<span class="c">progresso</span> ${unlocked}/${TOTAL} seções desbloqueadas`]),
    vetra: () => CMDS.neofetch(),
    privacidade: () => { print('abrindo a política de privacidade…', 'ok'); location.href = 'privacidade.html'; },
    clear: () => { tOut.innerHTML = ''; },
    exit: () => closeTerm(), sair: () => closeTerm()
  };
  const ALIASES = { ajuda: 'help', '?': 'help', 'serviços': 'servicos', 'orçamento': 'orcamento', portfolio: 'cases', 'portfólio': 'cases', processo: 'git log', zap: 'whatsapp', wpp: 'whatsapp', planos: 'planos' };
  const run = (raw) => {
    const cmd = raw.trim(); if (!cmd) return;
    print(`<span class="cmd"><b>$</b> ${esc(cmd)}</span>`);
    hist.push(cmd); hi = hist.length;
    let k = cmd.toLowerCase(); k = ALIASES[k] || k;
    if (k.startsWith('sudo')) { print('permissão negada: aqui só entra com direção. 😉', 'err'); return; }
    if (k === 'rm -rf /' || k.startsWith('rm ')) { print('boa tentativa. este site tem backup. 😄', 'err'); return; }
    const fn = CMDS[k];
    if (fn) fn(); else print(`comando não encontrado: ${esc(cmd)} · digite <span class="c">help</span>`, 'err');
  };
  const openTerm = () => {
    if (termOpen) return; termOpen = true; term.hidden = false; if (lenis) lenis.stop();
    if (!tOut.children.length) typeOut([...ART.map(l => `<span class="art">${esc(l)}</span>`), '', 'Bem-vindo ao terminal secreto da Vetra. 👋', 'Digite <span class="c">help</span> para ver os comandos.', ''], '', 60);
    setTimeout(() => tIn.focus(), 60);
  };
  function closeTerm() { if (!termOpen) return; termOpen = false; term.hidden = true; if (lenis) lenis.start(); }
  tForm.addEventListener('submit', e => { e.preventDefault(); const v = tIn.value; tIn.value = ''; run(v); });
  tIn.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) tIn.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); tIn.value = hist[hi] || ''; }
    else if (e.key === 'Tab') { e.preventDefault(); const v = tIn.value.toLowerCase(); const m = Object.keys(CMDS).find(c => c.startsWith(v) && v); if (m) tIn.value = m; }
  });
  $('#termX').addEventListener('click', closeTerm);
  term.addEventListener('click', e => { if (e.target === term) closeTerm(); });
  $('#termHint').addEventListener('click', openTerm);
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (e.key === '/' && !typing && !termOpen) { e.preventDefault(); openTerm(); }
    else if (e.key === 'Escape' && termOpen) closeTerm();
  });

  /* ---------- Loop de rolagem ---------- */
  const hudEl = $('#hud'), progress = $('#progress'), svcBar = $('#svcBar'), fab = $('#waFab'), hudSecsArr = hudSecs;
  let lastY = scrollY, lastDir = 0;
  const onFrame = () => {
    const y = scrollY, vh = innerHeight;
    const dy = y - lastY; lastY = y; V3.vel += (dy - V3.vel) * .15;
    sample(y);

    // barra de progresso e nav
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    progress.style.transform = `scaleX(${clamp(y / max, 0, 1)})`;
    nav.classList.toggle('is-scrolled', y > 30);
    if (Math.abs(dy) > 2) lastDir = dy > 0 ? 1 : -1;
    nav.classList.toggle('hide', lastDir > 0 && y > vh && !nav.classList.contains('is-open'));
    fab.classList.toggle('on', y > vh * .6);
    hudEl.classList.toggle('on', root.classList.contains('ready') && y > vh * .35);

    // manifesto
    const mp = clamp((y - M.man) / Math.max(1, M.manLen), 0, 1);
    const wp = clamp(mp / .38, 0, 1); const lit = Math.round(wp * wordEls.length);
    wordEls.forEach((w, i) => w.classList.toggle('on', i < lit));
    manCopy.style.opacity = mp < .42 ? 1 : clamp(1 - (mp - .42) / .08, 0, 1);
    const showSplit = mp > .55 && mp < .86;
    splitL.classList.toggle('on', showSplit); splitR.classList.toggle('on', showSplit);
    splitEq.classList.toggle('on', mp > .88 && mp < 1 || (mp >= 1 && y < M.man + M.manLen + vh * .3));

    // serviços na horizontal
    if (svcHoriz) {
      const sp = clamp((y - M.svc) / Math.max(1, M.svcLen), 0, 1);
      track.style.transform = `translate3d(${-sp * M.svcDist}px,0,0)`;
      svcBar.style.transform = `scaleX(${sp})`;
    }

    // portfólio 3D
    const cp = clamp((y - M.cases) / Math.max(1, M.casesLen), 0, 1);
    if (cp !== lastCp && Math.abs(y - M.cases) < M.casesLen + vh * 2) { lastCp = cp; casesFrame(cp); }

    // processo
    {
      const r = buildEl.getBoundingClientRect(), len = Math.max(1, buildEl.offsetHeight - vh);
      const bp = clamp(-r.top / len, 0, 1), st = Math.min(3, Math.floor(bp * 4.0001));
      buildBar.style.transform = `scaleX(${bp})`;
      stepEls.forEach((el, i) => el.style.setProperty('--sp', clamp(bp * 4 - i, 0, 1)));
      if (st !== lastStep) {
        lastStep = st; buildEl.dataset.step = st;
        stepEls.forEach((el, i) => { el.classList.toggle('on', i === st); el.classList.toggle('done', i < st); });
        bwUrl.textContent = URLS[st]; bwSt.textContent = STS[st];
        if (st === 3 && !visT) { visT = 1; let v = 0; const iv = setInterval(() => { v += 7 + Math.round(Math.random() * 9); if (v >= 248) { v = 248; clearInterval(iv); } bwVis.textContent = v; }, 40); }
      }
    }

    // contato: o bloco azul cresce até ocupar a tela (estilo Apple)
    if (auraEl) {
      const ar = auraEl.parentElement.getBoundingClientRect();
      auraEl.parentElement.style.setProperty('--ap', clamp((vh - ar.top) / (vh * .85), 0, 1).toFixed(3));
      const xr = xray.getBoundingClientRect();
      root.classList.toggle('gl-front', (ar.top < vh * .12 && ar.bottom > vh * .2) || (xr.top < vh * .98 && xr.bottom > vh * .05));
    }
    // faixa inclina com a velocidade da rolagem (estilo Active Theory)
    if (marqEl && !reduce) { skew += (clamp(-V3.vel * .35, -10, 10) - skew) * .12; marqEl.style.transform = `skewY(${(skew * .25).toFixed(2)}deg) skewX(${skew.toFixed(2)}deg)`; }

    // desbloqueios
    for (const s of hudSecsArr) if (!s.classList.contains('is-unlocked') && s.getBoundingClientRect().top < vh * .62) unlock(s, !root.classList.contains('ready'));

    // nav ativo
    const curSec = ['servicos', 'cases', 'planos', 'orcamento', 'faq'].find(id => { const b = document.getElementById(id).getBoundingClientRect(); return b.top < vh * .4 && b.bottom > vh * .4; });
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + curSec));
  };

  let prevT = performance.now();
  const raf = (t) => {
    const dt = Math.min(50, t - prevT) / 1000; prevT = t;
    if (lenis) lenis.raf(t);
    onFrame();
    if (!reduce) tracks.forEach(k => {
      const w = k.g.offsetWidth || 1; k.x -= (k.base + Math.abs(V3.vel) * 6) * dt; k.x = ((k.x % w) - w) % w;
      k.tr.style.transform = `translate3d(${k.x}px,0,0)`;
    });
    if (fine) {
      cx += (tx - cx) * .35; cy += (ty - cy) * .35; ang += (angT - ang) * .2;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; cur.style.setProperty('--ang', ang.toFixed(1) + 'deg');
      const hov = !overUI && V3.hoverLogo; cur.classList.toggle('grab', !!(hov || V3.dragging));
      const lbl = V3.dragging ? 'girando…' : hov ? 'arraste ou clique' : '';
      if (curLbl.textContent !== lbl) curLbl.textContent = lbl; cur.classList.toggle('lbl', !!lbl);
    }
    requestAnimationFrame(raf);
  };

  let rT; const relayout = () => { layout(); onFrame(); };
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(relayout, 120); });
  addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  layout(); requestAnimationFrame(raf);

  /* ---------- FAQ ---------- */
  $$('.qa').forEach(q => {
    const b = $('button', q);
    b.addEventListener('click', () => {
      const open = !q.classList.contains('is-open');
      $$('.qa').forEach(x => { x.classList.remove('is-open'); $('button', x).setAttribute('aria-expanded', 'false'); });
      q.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
      setTimeout(relayout, 500);
    });
  });

  /* ---------- Formulário → WhatsApp ---------- */
  $$('[data-plan]').forEach(b => b.addEventListener('click', () => { $('#plano').value = b.dataset.plan; $('#t-site').checked = true; setErr('f-tipo'); }));
  const form = $('#form');
  const setErr = (id, msg) => { const f = document.getElementById(id); if (!f) return; f.classList.toggle('is-err', !!msg); $('.field__err', f).textContent = msg || ''; };
  const read = () => ({ nome: $('#nome').value.trim(), negocio: $('#negocio').value.trim(), plano: $('#plano').value, msg: $('#msg').value.trim(), tipo: $$('input[name="tipo"]:checked').map(i => i.value) });
  form.addEventListener('input', () => { const d = read(); if (d.nome) setErr('f-nome'); if (d.tipo.length) setErr('f-tipo'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = read(); let ok = true;
    if (!d.nome) { setErr('f-nome', 'Diga como podemos te chamar.'); ok = false; }
    if (!d.tipo.length) { setErr('f-tipo', 'Escolha pelo menos uma opção. Se não souber, marque "Ainda não sei".'); ok = false; }
    if (!ok) { (d.nome ? $('#t-site') : $('#nome')).focus(); return; }
    const lines = ['Olá! Vim pelo site da Vetra.', `Sou ${d.nome}${d.negocio ? `, do ${d.negocio}` : ''}.`, `Preciso de: ${d.tipo.join(', ')}.`];
    if (d.plano) lines.push(`Plano de interesse: ${d.plano}.`);
    if (d.msg) lines.push('', d.msg);
    const a = document.createElement('a'); a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`; a.target = '_blank'; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove(); toast('Abrindo o WhatsApp com a sua mensagem…');
  });

  /* ---------- Rodapé ---------- */
  const fw = $('#fword');
  fw.addEventListener('pointermove', e => { const r = fw.getBoundingClientRect(); fw.style.setProperty('--fx', e.clientX - r.left + 'px'); fw.style.setProperty('--fy', e.clientY - r.top + 'px'); });
  fw.addEventListener('pointerleave', () => fw.style.setProperty('--fx', '-400px'));
  if (!fine && !reduce) { let a = 0; setInterval(() => { a += .025; fw.style.setProperty('--fx', (50 + Math.sin(a) * 46) + '%'); }, 30); }
  $('#ano').textContent = new Date().getFullYear();
})();
