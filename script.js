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
    if (reduce) frame();
  }
  sep.addEventListener('input', () => setMerge(sep.value));
  // 슬라이더를 처음 움직이는 순간 소리를 켠다 (사용자 조작이라 자동재생 제한에 걸리지 않음)
  heroSep.addEventListener('input', () => {
    if (!A.on) setSound(true);
    setMerge(heroSep.value);
  });

  /* ---------- Hero 파형 ---------- */
  const hero = document.querySelector('.hero');
  const cv = document.getElementById('wave'), g = cv.getContext('2d');
  const scope = document.getElementById('scope'), sg = scope.getContext('2d');
  const bufL = new Float32Array(1024), bufR = new Float32Array(1024);
  let W = 0, H = 0, dpr = 1, p = 0, time = 0, colors = {};
  function readColors() { colors = { l: css('--ch-l'), r: css('--ch-r'), m: css('--merge'), line: css('--line') }; }
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    scope.width = scope.clientWidth * dpr; scope.height = scope.clientHeight * dpr;
  }
  function sample(buf, x, live) {
    if (live) return buf[Math.floor(x * (buf.length - 1))] * 2.2;
    return Math.sin(x * 9 + time * 1.3) * .55 + Math.sin(x * 23 - time * 2.1) * .25 + Math.sin(x * 51 + time * .7) * .12;
  }
  function line(ctx, w, h, cy, amp, buf, live, color, from, phase) {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, color); grad.addColorStop(1, color);
    ctx.beginPath();
    for (let px = 0; px <= w; px += 3) {
      const x = px / w;
      const env = from === 'l' ? 1 - x * .75 : from === 'r' ? .25 + x * .75 : 1;
      const y = cy + sample(buf, (x + phase) % 1, live) * amp * env;
      px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
    }
    ctx.strokeStyle = grad; ctx.stroke();
  }
  function rms(buf) { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }
  const mL = document.getElementById('mL'), mR = document.getElementById('mR');
  function frame() {
    const live = A.on && A.anL;
    if (live) { A.anL.getFloatTimeDomainData(bufL); A.anR.getFloatTimeDomainData(bufR); }
    time += .016;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const m = Math.max(p, mergeP);
    const cy = H * .62, gap = H * .2 * (1 - m), amp = Math.min(70, H * .09);
    const balL = Math.min(1, 1 - A.bal), balR = Math.min(1, 1 + A.bal);
    g.lineWidth = 2.2; g.globalAlpha = .9 * (1 - m * .6);
    line(g, W, H, cy - gap, amp * balL, bufL, live, colors.l, 'l', 0);
    line(g, W, H, cy + gap, amp * balR, bufR, live, colors.r, 'r', .37);
    if (m > .05) { g.globalAlpha = m; g.lineWidth = 3; line(g, W, H, cy, amp * 1.1, bufL, live, colors.m, 'm', .18); }
    g.globalAlpha = 1;
    // 미터 (dB 눈금 -60~0)
    const toW = v => Math.max(0, Math.min(1, (20 * Math.log10(v + 1e-6) + 60) / 60));
    const lv = live ? rms(bufL) : .12 + Math.abs(Math.sin(time * 2.3)) * .08;
    const rv = live ? rms(bufR) : .12 + Math.abs(Math.sin(time * 1.9 + 1)) * .08;
    mL.style.width = (toW(lv) * 100) + '%'; mR.style.width = (toW(rv) * 100) + '%';
    // 채널 합성 스코프
    const sw = scope.width / dpr, sh = scope.height / dpr;
    sg.setTransform(dpr, 0, 0, dpr, 0, 0); sg.clearRect(0, 0, sw, sh);
    sg.lineWidth = 1.6;
    const s = A.sep;
    line(sg, sw, sh, sh * .5 - sh * .2 * s, sh * .22, bufL, live, colors.l, 'm', 0);
    line(sg, sw, sh, sh * .5 + sh * .2 * s, sh * .22, bufR, live, colors.r, 'm', .37);
    if (!reduce) requestAnimationFrame(frame);
  }
  function onScroll() {
    const r = hero.getBoundingClientRect();
    p = Math.max(0, Math.min(1, -r.top / (r.height * .7)));
    if (reduce) frame();
  }
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    A.bal = ((e.clientX - r.left) / r.width - .5) * 1.6;
    applyMix();
  });
  hero.addEventListener('pointerleave', () => { A.bal = 0; applyMix(); });
  addEventListener('resize', () => { size(); if (reduce) frame(); });
  addEventListener('scroll', onScroll, { passive: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  readColors(); size(); onScroll(); frame();

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
