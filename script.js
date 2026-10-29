// STÉRO 시리즈 사이트 — Hero 파형·L/R 오디오 데모, 사용법 단계 전환, 카드 넘기기
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------- 오디오: L 패드 + R 아르페지오 ---------- */
  const A = { ctx: null, on: false, anL: null, anR: null, panA: null, panB: null, gA: null, gB: null, sep: 1, bal: 0 };
  const CHORDS = [[174.61, 220.0, 261.63, 329.63], [220.0, 261.63, 329.63, 392.0]]; // Fmaj7, Am7
  let pad = [], arpTimer = null, step = 0, chordIx = 0, nextT = 0;

  function build() {
    const c = A.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = c.createGain(); master.gain.value = 0;
    const split = c.createChannelSplitter(2);
    A.anL = c.createAnalyser(); A.anR = c.createAnalyser();
    A.anL.fftSize = A.anR.fftSize = 1024;
    master.connect(c.destination); master.connect(split);
    split.connect(A.anL, 0); split.connect(A.anR, 1);
    A.master = master;
    A.panA = c.createStereoPanner(); A.panB = c.createStereoPanner();
    A.gA = c.createGain(); A.gB = c.createGain();
    A.gA.connect(A.panA).connect(master); A.gB.connect(A.panB).connect(master);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(A.gA);
    CHORDS[0].forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (i % 2 ? 6 : -6);
      const g = c.createGain(); g.gain.value = .045; o.connect(g).connect(lp); o.start(); pad.push(o);
    });
    applyMix();
  }
  function pluck(t, f) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f * 2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .5);
    o.connect(g).connect(A.gB); o.start(t); o.stop(t + .55);
  }
  function schedule() {
    const c = A.ctx;
    while (nextT < c.currentTime + .2) {
      if (step % 16 === 0) {
        chordIx = (step / 16) % 2;
        pad.forEach((o, i) => o.frequency.setTargetAtTime(CHORDS[chordIx][i], nextT, .3));
      }
      const ch = CHORDS[chordIx], seq = [0, 1, 2, 3, 2, 1, 2, 3];
      pluck(nextT, ch[seq[step % 8]]);
      nextT += 60 / 72 / 2; step++;
    }
  }
  function applyMix() {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    A.panA.pan.setTargetAtTime(-A.sep, t, .05);
    A.panB.pan.setTargetAtTime(A.sep, t, .05);
    A.gA.gain.setTargetAtTime(Math.min(1, 1 - A.bal), t, .05);
    A.gB.gain.setTargetAtTime(Math.min(1, 1 + A.bal), t, .05);
  }
  const toggles = [...document.querySelectorAll('#sound, #sound2, #songPlay')];
  function setSound(on) {
    if (on && !A.ctx) build();
    A.on = on;
    const t = A.ctx.currentTime;
    if (on) {
      A.ctx.resume(); nextT = A.ctx.currentTime + .05;
      arpTimer = setInterval(schedule, 50);
      A.master.gain.setTargetAtTime(.6, t, .3);
    } else {
      clearInterval(arpTimer);
      A.master.gain.setTargetAtTime(0, t, .15);
    }
    toggles.forEach(b => {
      b.setAttribute('aria-pressed', String(on));
      const l = b.querySelector('.lbl'); if (l) l.textContent = on ? '소리 끄기' : '소리 켜기';
    });
  }
  toggles.forEach(b => b.addEventListener('click', () => setSound(!A.on)));

  /* ---------- 채널 합성 슬라이더 (Hero 체험 + STÉRO MUSIC 사용법 06, 서로 연동) ---------- */
  const sep = document.getElementById('sep'), sepVal = document.getElementById('sepVal');
  const heroSep = document.getElementById('heroSep'), heroSepVal = document.getElementById('heroSepVal');
  const mixer = document.getElementById('mixer');
  const ctaPre = mixer.querySelector('.mix-cta .pre'), ctaPost = mixer.querySelector('.mix-cta .post');
  let mergeP = 0;
  function setMerge(v) {
    v = +v;
    mergeP = v / 100;
    A.sep = 1 - mergeP;
    sep.value = heroSep.value = v;
    sepVal.textContent = v == 100 ? '합성 100%' : v == 0 ? '분리 100%' : '합성 ' + v + '%';
    heroSepVal.textContent = v >= 100 ? '하나로 · 두 채널이 가운데에서 만나요' : v == 0 ? '분리 · L 패드 | R 아르페지오' : '합성 ' + v + '%';
    mixer.toggleAttribute('data-merged', v >= 95);
    ctaPre.hidden = v >= 95;
    ctaPost.hidden = v < 95;
    applyMix();
    if (reduce) draw();
  }
  sep.addEventListener('input', () => setMerge(sep.value));
  // 슬라이더를 처음 움직이는 순간 소리를 켠다 (사용자 조작이라 자동재생 제한에 걸리지 않음)
  heroSep.addEventListener('input', () => {
    if (!A.on) setSound(true);
    setMerge(heroSep.value);
  });

  /* ---------- Hero 배경: 오로라 + 파형 리본 + 빛 입자 ---------- */
  const hero = document.querySelector('.hero');
  const cv = document.getElementById('wave'), g = cv.getContext('2d');
  const scope = document.getElementById('scope'), sg = scope.getContext('2d');
  const bufL = new Float32Array(1024), bufR = new Float32Array(1024);
  let W = 0, H = 0, dpr = 1, p = 0, time = 0, colors = {}, energy = 0;
  // CSS가 늦게 적용되면 토큰이 빈 문자열 → 기본값으로 그린다 (빈 색을 그라디언트에 넣으면 예외가 나서 루프가 멈춤)
  const FALLBACK = { l: '#ff6b35', r: '#a259f0', m: '#f3eef8' };
  function readColors() {
    colors = { l: css('--ch-l') || FALLBACK.l, r: css('--ch-r') || FALLBACK.r, m: css('--merge') || FALLBACK.m };
    colors.dark = !/light/.test(getComputedStyle(document.documentElement).colorScheme || '');
  }
  function rgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return 'rgba(255,255,255,' + a + ')';
    const n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function size() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const sd = Math.min(2, devicePixelRatio || 1);
    scope.width = scope.clientWidth * sd; scope.height = scope.clientHeight * sd;
  }
  function sample(buf, x, live) {
    if (live) return buf[Math.floor(x * (buf.length - 1))] * 2.2;
    return Math.sin(x * 9 + time * 1.3) * .55 + Math.sin(x * 23 - time * 2.1) * .25 + Math.sin(x * 51 + time * .7) * .12;
  }
  function env(from, x) { return from === 'l' ? 1 - x * .7 : from === 'r' ? .3 + x * .7 : 1; }
  function line(ctx, w, cy, amp, buf, live, color, from, phase) {
    ctx.beginPath();
    for (let px = 0; px <= w; px += 3) {
      const x = px / w;
      const y = cy + sample(buf, (x + phase) % 1, live) * amp * env(from, x);
      px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
    }
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  function blob(x, y, r, color, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(color, a));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const parts = Array.from({ length: 90 }, (_, i) => ({ ch: i % 2, x: Math.random(), v: .0006 + Math.random() * .0016, ph: Math.random(), r: .7 + Math.random() * 1.9, tw: Math.random() * 6.28 }));
  function rms(buf) { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }
  const mL = document.getElementById('mL'), mR = document.getElementById('mR');
  function draw() {
    const live = A.on && A.anL;
    if (live) { A.anL.getFloatTimeDomainData(bufL); A.anR.getFloatTimeDomainData(bufR); }
    time += .016;
    const toW = v => Math.max(0, Math.min(1, (20 * Math.log10(v + 1e-6) + 60) / 60));
    const lv = live ? rms(bufL) : .12 + Math.abs(Math.sin(time * 2.3)) * .08;
    const rv = live ? rms(bufR) : .12 + Math.abs(Math.sin(time * 1.9 + 1)) * .08;
    energy += ((live ? Math.min(1, (lv + rv) * 2.2) : .15) - energy) * .08;
    mL.style.width = (toW(lv) * 100) + '%'; mR.style.width = (toW(rv) * 100) + '%';

    const m = Math.max(p, mergeP), dark = colors.dark;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 모션 블러: 이전 프레임을 조금만 지워 꼬리가 남게 한다 (정지 프레임 모드에서는 완전히 지움)
    if (reduce) { g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); }
    else { g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, W, H); }
    // 1) 오로라: L은 왼쪽, R은 오른쪽에서 흐르다 합칠수록 가운데로
    g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    // 꼬리를 남기는 동안 빛이 쌓이므로(약 4.5배) 한 프레임의 세기는 낮게
    const big = Math.max(W, H) * (.42 + energy * .25), base = (reduce ? 4.5 : 1) * (dark ? .06 : .04);
    const lx = W * (.12 + .38 * m) + Math.sin(time * .35) * W * .06, rx = W * (.88 - .38 * m) + Math.sin(time * .3 + 2) * W * .06;
    blob(lx, H * (.42 + Math.sin(time * .27) * .12), big, colors.l, base);
    blob(rx, H * (.58 + Math.sin(time * .31 + 1) * .12), big, colors.r, base);
    blob(W * (.3 + Math.sin(time * .18) * .2), H * (.8 + Math.sin(time * .22) * .1), big * .7, colors.r, base * .5);
    if (m > .02) blob(W * .5, H * .55, big * .8 * m, colors.m, (reduce ? 4.5 : 1) * (dark ? .02 : .015) * m);
    // 2) 파형 리본 (채널마다 4겹, 맨 앞 줄에 빛 번짐)
    const cy = H * .55, gap = H * .2 * (1 - m), amp = Math.min(80, H * .1) * (1 + energy * .8);
    const balL = Math.min(1, 1 - A.bal), balR = Math.min(1, 1 + A.bal);
    g.globalCompositeOperation = 'source-over';
    for (const [y0, a, buf, col, from, ph] of [[cy - gap, amp * balL, bufL, colors.l, 'l', 0], [cy + gap, amp * balR, bufR, colors.r, 'r', .37]]) {
      for (let k = 3; k >= 0; k--) {
        g.globalAlpha = (k ? .22 - k * .04 : .95) * (1 - m * .55);
        g.lineWidth = k ? 1 : 2.4;
        g.shadowBlur = k ? 0 : 16 + energy * 24; g.shadowColor = col;
        line(g, W, y0 + k * 7, a * (1 - k * .14), buf, live, col, from, ph + k * .045);
      }
    }
    if (m > .05) {
      g.globalAlpha = m; g.lineWidth = 3; g.shadowBlur = 22 + energy * 20; g.shadowColor = colors.m;
      line(g, W, cy, amp * 1.1, bufL, live, colors.m, 'm', .18);
    }
    g.shadowBlur = 0;
    // 3) 빛 입자: 파형을 따라 흐르다 합치면 가운데 선으로
    g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (const q of parts) {
      q.x += q.v * (1 + energy * 3) * (q.ch ? -1 : 1);
      if (q.x > 1) q.x -= 1; if (q.x < 0) q.x += 1;
      const lane = q.ch ? cy + gap : cy - gap;
      const buf = q.ch ? bufR : bufL;
      const y = lane + sample(buf, (q.x + (q.ch ? .37 : 0)) % 1, live) * amp * env(q.ch ? 'r' : 'l', q.x) + Math.sin(time * 2 + q.ph * 6.28) * 10 * (1 - m);
      g.globalAlpha = (.35 + .65 * Math.abs(Math.sin(time * 1.7 + q.tw))) * (dark ? .9 : .7);
      g.fillStyle = q.ch ? colors.r : colors.l;
      g.beginPath(); g.arc(q.x * W, y, q.r * (1 + energy * 1.8), 0, 6.283); g.fill();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // 채널 합성 스코프 (STÉRO MUSIC 사용법 06)
    const sdp = scope.width / (scope.clientWidth || 1);
    const sw = scope.clientWidth, sh = scope.clientHeight;
    sg.setTransform(sdp, 0, 0, sdp, 0, 0); sg.clearRect(0, 0, sw, sh);
    sg.lineWidth = 1.6;
    const s = A.sep;
    line(sg, sw, sh * .5 - sh * .2 * s, sh * .22, bufL, live, colors.l, 'm', 0);
    line(sg, sw, sh * .5 + sh * .2 * s, sh * .22, bufR, live, colors.r, 'm', .37);
  }
  // 한 프레임에서 예외가 나도 다음 프레임은 계속 그린다
  function frame() {
    try { draw(); } catch (e) { readColors(); }
    if (!reduce) requestAnimationFrame(frame);
  }
  function onScroll() {
    const r = hero.getBoundingClientRect();
    p = Math.max(0, Math.min(1, -r.top / (r.height * .7)));
    if (reduce) draw();
  }
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    A.bal = ((e.clientX - r.left) / r.width - .5) * 1.6;
    applyMix();
  });
  hero.addEventListener('pointerleave', () => { A.bal = 0; applyMix(); });
  addEventListener('resize', () => { size(); if (reduce) draw(); });
  addEventListener('scroll', onScroll, { passive: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  readColors(); size(); onScroll(); frame();
  // 스타일시트·글꼴이 늦게 끝나도 색과 크기를 다시 읽는다
  addEventListener('load', () => { readColors(); size(); });

  /* ---------- 사용법 단계: 고정 폰 화면 전환 (스토리마다) ---------- */
  document.querySelectorAll('.story').forEach(story => {
    const shots = story.querySelectorAll('.screen img');
    const steps = [...story.querySelectorAll('.step')];
    const dots = story.querySelectorAll('.dots i');
    if (dots[0]) dots[0].classList.add('on');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      steps.forEach(s => s.classList.toggle('on', s === e.target));
      shots.forEach(i => i.classList.toggle('on', i.dataset.k === e.target.dataset.k));
      const ix = steps.indexOf(e.target);
      dots.forEach((d, n) => d.classList.toggle('on', n === ix));
    }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
  });
  const cards = document.getElementById('cards');
  const by = d => cards.scrollBy({ left: d * (cards.querySelector('figure').offsetWidth + 16), behavior: reduce ? 'auto' : 'smooth' });
  document.getElementById('cPrev').addEventListener('click', () => by(-1));
  document.getElementById('cNext').addEventListener('click', () => by(1));
})();
