/* Vetra v2 — logo 3D em tempo real (three.js).
   Lê o estado alvo em window.V3.t (definido pela rolagem em script.js). */
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

(function init() {
  const V3 = window.V3 || (window.V3 = { t: { x: 0, y: .2, s: 1, rx: 0, ry: 0, split: 0, wire: 0, op: 1, dust: 0 }, mx: 0, my: 0, vel: 0, start: true });
  const canvas = document.getElementById('gl');
  const mobile = Math.min(innerWidth, innerHeight) < 700;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { document.documentElement.classList.add('no-gl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  /* estúdio fotográfico virtual: fundo escuro + faixas de luz que viram reflexos no metal */
  const studio = (() => {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b0e14, side: THREE.BackSide }));
    env.add(room);
    const panel = (w, h, color, k, pos, look) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(...look); env.add(m);
    };
    panel(14, 5, 0xffffff, 2.2, [0, 9, 3], [0, 0, 0]);        // softbox de cima
    panel(1.6, 12, 0xffffff, 3.2, [-8, 1, 4], [0, 0, 0]);     // faixa vertical à esquerda
    panel(1.2, 10, 0x4db5ff, 4, [8, 0, 3], [0, 0, 0]);        // faixa azul à direita
    panel(10, 1.2, 0xdfe8f2, 1.6, [0, -6, 6], [0, 0, 0]);     // rebatedor de baixo
    panel(6, 6, 0x9bdaff, .8, [0, 2, -9], [0, 0, 0]);         // contra-luz azulada
    // softbox frontal (atrás da câmera) com degradê: é ele que aparece refletido na face da logo
    const gc = document.createElement('canvas'); gc.width = 8; gc.height = 256; const gx = gc.getContext('2d');
    const gg = gx.createLinearGradient(0, 0, 0, 256);
    gg.addColorStop(0, '#ffffff'); gg.addColorStop(.38, '#c9d3de'); gg.addColorStop(.5, '#4d5866'); gg.addColorStop(.62, '#9aa6b4'); gg.addColorStop(1, '#2a323c');
    gx.fillStyle = gg; gx.fillRect(0, 0, 8, 256);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), new THREE.MeshBasicMaterial({ map: gt, color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide }));
    front.position.set(-1, 2, 12); front.lookAt(0, 0, 0); env.add(front);
    return pmrem.fromScene(env, .02).texture;
  })();
  scene.environment = studio;

  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x4db5ff, 1.4); rim.position.set(5, -1, -3); scene.add(rim);

  /* ---------- Geometria do símbolo <▷ (mesmas coordenadas do SVG) ---------- */
  const U = 3 / 100; // 100 unidades do SVG = 3 unidades 3D
  const P = (x, y) => new THREE.Vector2((x - 50) * U, (50 - y) * U);
  const shapeL = new THREE.Shape([P(36, 20), P(6, 50), P(47, 91), P(47, 75.44), P(21.56, 50), P(43.78, 27.78)]);
  const shapeR = new THREE.Shape([P(53, 9), P(94, 50), P(53, 91)]);
  shapeR.holes.push(new THREE.Path([P(64, 35.56), P(78.44, 50), P(64, 64.44)]));
  const ext = { depth: .42, bevelEnabled: true, bevelThickness: .07, bevelSize: .05, bevelSegments: 10, curveSegments: 1 };
  const mkGeo = (sh) => {
    const g = new THREE.ExtrudeGeometry(sh, ext);
    g.translate(0, 0, -ext.depth / 2);
    g.computeBoundingBox(); const c = new THREE.Vector3(); g.boundingBox.getCenter(c); c.z = 0;
    g.translate(-c.x, -c.y, 0); g.computeVertexNormals();
    return { g, c };
  };
  const L = mkGeo(shapeL), R = mkGeo(shapeR);

  const silver = new THREE.MeshPhysicalMaterial({ color: 0xeef1f5, metalness: 1, roughness: .16, clearcoat: .6, clearcoatRoughness: .12, envMapIntensity: 1.35 });
  const sky = new THREE.MeshPhysicalMaterial({ color: 0x4db5ff, metalness: .35, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x1f8fe6, emissiveIntensity: .35, envMapIntensity: 1.1 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x1f8fe6, wireframe: true, transparent: true, opacity: 0, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x1f8fe6, transparent: true, opacity: 0, depthWrite: false });

  const logo = new THREE.Group(); scene.add(logo);
  const mkPiece = ({ g, c }, mat) => {
    const pivot = new THREE.Group(); pivot.position.copy(c); pivot.userData.home = c.clone();
    pivot.add(new THREE.Mesh(g, mat));
    pivot.add(new THREE.Mesh(g, wireMat));
    pivot.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), edgeMat));
    logo.add(pivot); return pivot;
  };
  const pL = mkPiece(L, silver), pR = mkPiece(R, sky);
  const solids = [pL.children[0], pR.children[0]];

  /* ---------- Explosão em partículas (clique na logo) ---------- */
  const NB = mobile ? 900 : 1800;
  const bHome = new Float32Array(NB * 6), bVel = new Float32Array(NB * 6), bPos = new Float32Array(NB * 6), bCol = new Float32Array(NB * 6);
  {
    const tmp = new THREE.Vector3(), cS = new THREE.Color(0x9aa3ae), cB = new THREE.Color(0x1f8fe6), cB2 = new THREE.Color(0x4db5ff);
    [[pL, cS, cS], [pR, cB, cB2]].forEach(([piece, c1, c2], pi) => {
      const sampler = new MeshSurfaceSampler(piece.children[0]).build();
      for (let i = 0; i < NB; i++) {
        sampler.sample(tmp); tmp.add(piece.userData.home);
        const j = (pi * NB + i) * 3;
        bHome[j] = tmp.x; bHome[j + 1] = tmp.y; bHome[j + 2] = tmp.z;
        const c = Math.random() < .7 ? c1 : c2; bCol[j] = c.r; bCol[j + 1] = c.g; bCol[j + 2] = c.b;
      }
    });
  }
  /* nuvem de partículas que se junta para formar a logo (estilo Igloo) */
  const bScat = new Float32Array(NB * 6), bDel = new Float32Array(NB * 2);
  for (let i = 0; i < NB * 2; i++) {
    const j = i * 3, u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 2.2 + Math.pow(Math.random(), .8) * 3.2, q = Math.sqrt(1 - u * u);
    bScat[j] = q * Math.cos(th) * r * 1.5; bScat[j + 1] = u * r * .8; bScat[j + 2] = q * Math.sin(th) * r * .7;
    bDel[i] = Math.random();
  }
  let dustNow = 0;
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bg.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  const burstMat = new THREE.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const burst = new THREE.Points(bg, burstMat); burst.visible = false; burst.frustumCulled = false; logo.add(burst);
  let burstT = -1;
  const explode = () => {
    if (burstT >= 0 || !logo.visible || dustNow > 0) return;
    burstT = 0;
    for (let i = 0; i < NB * 2; i++) {
      const j = i * 3, x = bHome[j], y = bHome[j + 1], z = bHome[j + 2];
      const len = Math.hypot(x, y) || 1, sp = 1.4 + Math.random() * 2.6;
      bVel[j] = x / len * sp + (Math.random() - .5) * 1.4;
      bVel[j + 1] = y / len * sp + (Math.random() - .5) * 1.4;
      bVel[j + 2] = (Math.random() - .3) * 4.5;
    }
  };
  V3.explode = explode;

  /* ---------- Arrastar para girar ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let dragRy = 0, dragRx = 0, dragVel = 0, drag = null, hover = false, needPick = false;
  const isUI = (t) => t && t.closest && t.closest('a, button, input, textarea, select, label, .term, .sheet, .nav, .receipt, .svc, .plan, .qa, .case, .stage');
  addEventListener('pointermove', (e) => {
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); needPick = true;
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    dragRy += dx * .011; dragRx = Math.max(-.9, Math.min(.9, dragRx + dy * .006)); dragVel = dx * .011;
    drag.x = e.clientX; drag.y = e.clientY;
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (isUI(e.target) || e.button > 0) return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (!pick()) return;
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
    V3.dragging = true; dragVel = 0;
    if (e.pointerType === 'mouse') e.preventDefault();
  });
  const endDrag = (e, cancel) => {
    if (!drag) return;
    if (!cancel && drag.moved < 7 && performance.now() - drag.t < 450) explode();
    drag = null; V3.dragging = false;
  };
  addEventListener('pointerup', (e) => endDrag(e, false));
  addEventListener('pointercancel', (e) => endDrag(e, true));
  function pick() {
    if (!logo.visible || C.op < .5 || C.wire > .5 || burstT >= 0) return false;
    logo.updateMatrixWorld(); ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(solids, false).length > 0;
  }

  /* brilho atrás da logo */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(77,181,255,.5)'); gr.addColorStop(.25, 'rgba(77,181,255,.22)'); gr.addColorStop(.55, 'rgba(77,181,255,.06)'); gr.addColorStop(1, 'rgba(77,181,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: .5, toneMapped: false }));
  glow.renderOrder = -1; glow.scale.set(5.5, 5.5, 1); glow.position.z = -1.2; logo.add(glow);

  /* ---------- Partículas (campo de vetores) ---------- */
  const N = mobile ? 700 : 1500;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 26; pos[i * 3 + 1] = (Math.random() - .5) * 16; pos[i * 3 + 2] = -14 + Math.random() * 15; seed[i] = Math.random();
  }
  const base = pos.slice(), offX = new Float32Array(N), offY = new Float32Array(N);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(155,218,255,.6)'); gr.addColorStop(1, 'rgba(155,218,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .07, map: dotTex, transparent: true, opacity: .5, depthWrite: false, color: 0x1f8fe6, sizeAttenuation: true }));
  scene.add(pts);

  /* ---------- Tamanho ---------- */
  let halfH = 1, halfW = 1, fit = 1;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; halfW = halfH * camera.aspect;
    // logo ocupa ~42% da altura, limitado pela largura
    fit = Math.min(halfH * .3, halfW * .27);
  };
  resize(); addEventListener('resize', resize);

  /* ---------- Estado atual (suavizado) ---------- */
  const C = Object.assign({}, V3.t);
  let introT0 = 0, intro = V3.reduce ? 1 : 0, mx = 0, my = 0, time = 0, scrollSpin = 0;
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

  let last = performance.now(), fpsAcc = 0, fpsN = 0, visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); });

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    fpsAcc += dt; fpsN++; if (fpsAcc > .5) { V3.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }

    const T = V3.t;
    for (const k in T) C[k] = damp(C[k], T[k], 5.5, dt);
    if (V3.start && intro < 1) { if (!introT0) introT0 = now; intro = Math.min(1, (now - introT0) / 2600); }
    const ie = 1 - Math.pow(1 - intro, 4);
    mx = damp(mx, V3.mx || 0, 3, dt); my = damp(my, V3.my || 0, 3, dt);
    scrollSpin = damp(scrollSpin, (V3.vel || 0) * .004, 4, dt);

    // posição e escala responsivas
    const s = fit * C.s * (.75 + .25 * C.op) * (.6 + .4 * ie);
    logo.scale.setScalar(s);
    logo.position.set(C.x * halfW, C.y * halfH + Math.sin(time * .9) * .06 * C.op, 0);
    if (!drag) { dragRy += dragVel; dragVel *= Math.pow(.05, dt); dragRy = damp(dragRy, 0, Math.abs(dragVel) < .002 ? .9 : 0, dt); dragRx = damp(dragRx, 0, 2.5, dt); }
    logo.rotation.y = C.ry + mx * .35 + Math.sin(time * .5) * .08 + (1 - ie) * -2.4 + scrollSpin + dragRy;
    logo.rotation.x = C.rx + my * .22 + Math.cos(time * .6) * .05 + dragRx;
    logo.rotation.z = (1 - ie) * .3;

    // separação: < vai para a esquerda, ▷ para a direita (e montagem inicial)
    const sp = C.split + (1 - ie) * 2.2;
    const spread = Math.max(.5, halfW * (camera.aspect < 1 ? .5 : .3) / Math.max(.1, s) - .75);
    pL.position.set(pL.userData.home.x - sp * spread, pL.userData.home.y + (1 - ie) * .8, (1 - ie) * -4);
    pR.position.set(pR.userData.home.x + sp * spread, pR.userData.home.y - (1 - ie) * .8, (1 - ie) * -4);
    pL.rotation.set(0, -sp * .18 + Math.sin(time * 1.3) * .05 * C.split, sp * .12);
    pR.rotation.set(0, sp * .18 - Math.sin(time * 1.3) * .05 * C.split, -sp * .12);

    // opacidade, nuvem de partículas e raio-x
    const w = C.wire;
    const dust = burstT >= 0 ? 0 : Math.max(C.dust || 0, V3.start ? 1 - intro : 1);
    dustNow = dust;
    const op = C.op * (V3.start ? 1 : 0);
    let meshK = 1;
    if (burstT >= 0) {
      burstT += dt; const t = burstT;
      const g = t < .55 ? 1 - Math.pow(1 - t / .55, 3) : t < 1.75 ? 1 - (u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)((t - .55) / 1.2) : 0;
      const sw = g * 1.2;
      const cs = Math.cos(sw), sn = Math.sin(sw);
      for (let i = 0; i < NB * 2; i++) {
        const j = i * 3; const x = bHome[j] + bVel[j] * g, y = bHome[j + 1] + bVel[j + 1] * g;
        bPos[j] = x * cs - y * sn * .3; bPos[j + 1] = y + x * sn * .15; bPos[j + 2] = bHome[j + 2] + bVel[j + 2] * g;
      }
      bg.attributes.position.needsUpdate = true;
      meshK = t < .1 ? 1 - t / .1 : t > 1.6 ? Math.min(1, (t - 1.6) / .3) : 0;
      burst.visible = true; burstMat.opacity = (1 - meshK) * op;
      if (t > 1.95) { burstT = -1; burst.visible = false; meshK = 1; }
    } else if (dust > .001) {
      for (let i = 0; i < NB * 2; i++) {
        const j = i * 3;
        let d = (dust - .45 * bDel[i]) / .55; d = d < 0 ? 0 : d > 1 ? 1 : d; d = d * d * (3 - 2 * d);
        const hx = bHome[j], hy = bHome[j + 1], hz = bHome[j + 2];
        const x = hx + (bScat[j] - hx) * d, y = hy + (bScat[j + 1] - hy) * d + Math.sin(time * 1.4 + bDel[i] * 9) * .12 * d, z = hz + (bScat[j + 2] - hz) * d;
        const ang = d * 2.4 + time * .25 * d, cs = Math.cos(ang), sn = Math.sin(ang);
        bPos[j] = x * cs - z * sn; bPos[j + 1] = y; bPos[j + 2] = x * sn + z * cs;
      }
      bg.attributes.position.needsUpdate = true;
      meshK = Math.max(0, Math.min(1, (.14 - dust) / .14));
      burst.visible = true; burstMat.opacity = op * (1 - meshK * meshK) * .95; burstMat.size = .05 + dust * .03;
    } else { burst.visible = false; burstMat.size = .05; }
    silver.opacity = sky.opacity = op * (1 - .93 * w) * meshK;
    const solid = silver.opacity > .985;
    if (silver.transparent === solid) { silver.transparent = sky.transparent = !solid; silver.depthWrite = sky.depthWrite = solid; silver.needsUpdate = sky.needsUpdate = true; }
    wireMat.opacity = op * w * .22; edgeMat.opacity = op * w;
    glow.material.opacity = op * .28 * (1 - .5 * w) * (burstT >= 0 ? 1.5 : 1) * meshK;
    logo.visible = op > .005;

    // partículas: deriva lenta + "warp" com a rolagem + se afastam do mouse
    const a = pg.attributes.position.array, v = (V3.vel || 0) * .02, fine = !mobile;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      base[j + 1] += (.06 + seed[i] * .1) * dt - v * (.4 + seed[i]);
      base[j + 2] += Math.abs(v) * (.6 + seed[i]) * 2;
      if (base[j + 1] > 8) base[j + 1] = -8; if (base[j + 1] < -8) base[j + 1] = 8;
      if (base[j + 2] > 1.5) base[j + 2] = -14;
      let tx = 0, ty = 0;
      if (fine) {
        const k = (10 - base[j + 2]) / 10, px = mx * halfW * k, py = -my * halfH * k;
        const dx = base[j] - px, dy = base[j + 1] - py, dd = Math.hypot(dx, dy), R = 1.6 * k;
        if (dd < R && dd > .001) { const f = (R - dd) / R; tx = dx / dd * f * R * .9; ty = dy / dd * f * R * .9; }
      }
      offX[i] += (tx - offX[i]) * Math.min(1, dt * 6); offY[i] += (ty - offY[i]) * Math.min(1, dt * 6);
      a[j] = base[j] + offX[i]; a[j + 1] = base[j + 1] + offY[i]; a[j + 2] = base[j + 2];
    }
    pg.attributes.position.needsUpdate = true;
    pts.rotation.y = 0; pts.rotation.x = 0;

    if (needPick && !drag) { needPick = false; hover = pick(); V3.hoverLogo = hover; }
    if (hover && C.op < .5) { hover = false; V3.hoverLogo = false; }
    renderer.render(scene, camera);
    if (!V3.tris) V3.tris = renderer.info.render.triangles ? (L.g.index ? L.g.index.count : L.g.attributes.position.count) / 3 + (R.g.index ? R.g.index.count : R.g.attributes.position.count) / 3 : 0;
  };

  // compila antes de liberar o loader
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  V3.ready = true;
  requestAnimationFrame(frame);
})();
