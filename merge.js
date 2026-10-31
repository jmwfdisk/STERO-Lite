// STÉRO 채널 합성 (웹) — A 파일은 모노로 섞어 왼쪽, B 파일은 오른쪽 채널로 (iOS AudioMergeManager와 같은 방식)
// 파일은 브라우저 안에서만 디코딩·합성하고 어디로도 전송하지 않는다
(function () {
  'use strict';

  const MAX_SEC = 15 * 60;
  const $ = id => document.getElementById(id);
  const tool = $('tool'), agree1 = $('agree1'), agree2 = $('agree2');
  const playBtn = $('play'), exportBtn = $('export'), resetBtn = $('reset');
  const statusEl = $('status'), prog = $('prog'), timeEl = $('time');
  const slots = [...document.querySelectorAll('.slot')];
  const vols = [$('volL'), $('volR')];

  // 각 채널: { name, mono: Float32Array, rate }
  const ch = [null, null];
  let ctx = null, sources = [], gains = [], startedAt = 0, raf = 0, playing = false;

  const setStatus = (msg, kind) => { statusEl.textContent = msg; statusEl.dataset.kind = kind || ''; };
  const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const dbToGain = db => Math.pow(10, db / 20);
  const length = () => Math.max(ch[0] ? ch[0].mono.length : 0, ch[1] ? ch[1].mono.length : 0);
  const rate = () => (ch[0] || ch[1]).rate;
  const ready = () => ch[0] && ch[1];

  /* ---------- 동의해야 도구가 열린다 ---------- */
  function syncConsent() {
    const ok = agree1.checked && agree2.checked;
    tool.disabled = !ok;
    $('lockMsg').hidden = ok;
    if (!ok) stop();
  }
  agree1.addEventListener('change', syncConsent);
  agree2.addEventListener('change', syncConsent);
  syncConsent();

  function audioCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  /* ---------- 파일 읽기 ---------- */
  async function load(i, file) {
    if (!file) return;
    stop();
    const slot = slots[i];
    const nameEl = slot.querySelector('.drop-name'), meta = slot.querySelector('.slot-meta');
    slot.querySelector('.drop-empty').hidden = true;
    nameEl.hidden = false;
    nameEl.textContent = file.name;
    meta.textContent = '읽는 중…';
    try {
      const data = await file.arrayBuffer();
      const buf = await audioCtx().decodeAudioData(data);
      if (buf.duration > MAX_SEC) throw new RangeError('long');
      // 스테레오 이상은 모든 채널을 평균해 모노로 (iOS와 같은 믹스다운)
      const mono = new Float32Array(buf.length);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let n = 0; n < d.length; n++) mono[n] += d[n] / buf.numberOfChannels;
      }
      ch[i] = { name: file.name, mono, rate: buf.sampleRate };
      meta.textContent = fmt(buf.duration) + ' · ' + (buf.numberOfChannels > 1 ? '스테레오 → 모노' : '모노') + ' · ' + Math.round(buf.sampleRate / 100) / 10 + 'kHz';
      drawWave(slot.querySelector('.wave'), mono, i);
    } catch (e) {
      ch[i] = null;
      meta.textContent = '';
      setStatus(e instanceof RangeError
        ? '15분이 넘는 음원은 합성할 수 없어요. 더 짧은 파일을 골라 주세요.'
        : '“' + file.name + '”을(를) 읽지 못했어요. MP3, M4A, WAV 같은 음원 파일인지 확인해 주세요.', 'error');
      clearWave(slot.querySelector('.wave'));
    }
    update();
  }

  function update() {
    const ok = ready();
    playBtn.disabled = !ok;
    exportBtn.disabled = !ok;
    if (ok) {
      const len = length() / rate();
      timeEl.textContent = '0:00 / ' + fmt(len);
      const diff = Math.abs(ch[0].mono.length - ch[1].mono.length) / rate();
      setStatus(diff > 1
        ? '준비됐어요. 두 음원의 길이가 ' + fmt(diff) + ' 차이 나서, 짧은 쪽 뒤는 무음으로 채워요.'
        : '준비됐어요. 미리듣기로 확인한 뒤 WAV로 내보내세요.', 'ok');
    } else if (!statusEl.dataset.kind || statusEl.dataset.kind === 'ok') {
      setStatus(ch[0] || ch[1] ? '나머지 채널에 넣을 음원도 골라 주세요.' : '왼쪽과 오른쪽에 넣을 음원을 하나씩 골라 주세요. 길이가 다르면 긴 쪽에 맞추고, 짧은 쪽 뒤는 무음으로 채워요.');
    }
  }

  slots.forEach((slot, i) => {
    const input = slot.querySelector('input[type=file]'), drop = slot.querySelector('.drop');
    input.addEventListener('change', () => load(i, input.files[0]));
    drop.addEventListener('dragover', e => { if (tool.disabled) return; e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => {
      drop.classList.remove('over');
      if (tool.disabled) return;
      e.preventDefault();
      load(i, e.dataTransfer.files[0]);
    });
  });

  /* ---------- 파형 ---------- */
  function clearWave(cv) { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); }
  function drawWave(cv, data, i) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(i ? '--ch-r' : '--ch-l').trim();
    const step = Math.max(1, Math.floor(data.length / w));
    for (let x = 0; x < w; x++) {
      let peak = 0;
      for (let n = x * step, end = Math.min(data.length, n + step); n < end; n += 8) peak = Math.max(peak, Math.abs(data[n]));
      const bh = Math.max(1, peak * h * .9);
      g.fillRect(x, (h - bh) / 2, 1, bh);
    }
  }

  /* ---------- 합성 그래프: 미리듣기와 내보내기가 같은 경로 ---------- */
  function build(c) {
    const len = length(), r = rate();
    const merger = c.createChannelMerger(2);
    const nodes = ch.map((src, i) => {
      const buf = c.createBuffer(1, len, r);
      buf.copyToChannel(src.mono, 0);
      const s = c.createBufferSource(), gn = c.createGain();
      s.buffer = buf;
      gn.gain.value = dbToGain(+vols[i].value);
      s.connect(gn).connect(merger, 0, i);
      return { s, gn };
    });
    return { merger, nodes };
  }

  function play() {
    const c = audioCtx();
    c.resume();
    const { merger, nodes } = build(c);
    merger.connect(c.destination);
    sources = nodes.map(n => n.s);
    gains = nodes.map(n => n.gn);
    startedAt = c.currentTime;
    sources.forEach(s => s.start());
    sources[0].onended = () => { if (playing) stop(); };
    playing = true;
    setPlayUi(true);
    tick();
  }
  function stop() {
    sources.forEach(s => { try { s.onended = null; s.stop(); } catch (e) { /* 이미 멈춤 */ } });
    sources = []; gains = [];
    playing = false;
    cancelAnimationFrame(raf);
    setPlayUi(false);
    prog.style.width = '0%';
    if (ready()) timeEl.textContent = '0:00 / ' + fmt(length() / rate());
  }
  function setPlayUi(on) {
    playBtn.setAttribute('aria-pressed', String(on));
    playBtn.querySelector('.lbl').textContent = on ? '정지' : '미리듣기';
  }
  function tick() {
    const total = length() / rate(), t = ctx.currentTime - startedAt;
    prog.style.width = Math.min(100, t / total * 100) + '%';
    timeEl.textContent = fmt(t) + ' / ' + fmt(total);
    if (playing) raf = requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', () => (playing ? stop() : play()));

  vols.forEach((v, i) => v.addEventListener('input', () => {
    v.nextElementSibling.textContent = (+v.value > 0 ? '+' : '') + (+v.value).toFixed(1) + ' dB';
    if (gains[i]) gains[i].gain.setTargetAtTime(dbToGain(+v.value), ctx.currentTime, .03);
  }));

  /* ---------- 내보내기: OfflineAudioContext → 16bit WAV ---------- */
  exportBtn.addEventListener('click', async () => {
    if (!ready()) return;
    stop();
    exportBtn.disabled = true;
    setStatus('합성하는 중이에요…', 'ok');
    try {
      const off = new OfflineAudioContext(2, length(), rate());
      const { merger, nodes } = build(off);
      merger.connect(off.destination);
      nodes.forEach(n => n.s.start());
      const out = await off.startRendering();
      const blob = wav(out);
      const base = n => n.replace(/\.[^.]+$/, '').slice(0, 30);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'STERO_L-' + base(ch[0].name) + '_R-' + base(ch[1].name) + '.wav';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      setStatus('WAV 파일을 내보냈어요 (' + (blob.size / 1048576).toFixed(1) + 'MB). 권리가 없는 음원이 들어 있다면 공유하거나 업로드하지 마세요.', 'ok');
    } catch (e) {
      setStatus('합성하지 못했어요. 파일 길이를 줄이거나 다른 브라우저에서 다시 시도해 주세요.', 'error');
    }
    exportBtn.disabled = !ready();
  });

  function wav(buf) {
    const n = buf.length, chs = 2, bytes = n * chs * 2;
    const view = new DataView(new ArrayBuffer(44 + bytes));
    const str = (o, s) => { for (let k = 0; k < s.length; k++) view.setUint8(o + k, s.charCodeAt(k)); };
    str(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
    str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, chs, true);
    view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * chs * 2, true);
    view.setUint16(32, chs * 2, true); view.setUint16(34, 16, true);
    str(36, 'data'); view.setUint32(40, bytes, true);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let o = 44;
    for (let k = 0; k < n; k++) {
      for (const d of [L, R]) {
        const v = Math.max(-1, Math.min(1, d[k]));
        view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
        o += 2;
      }
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  /* ---------- 처음부터 ---------- */
  resetBtn.addEventListener('click', () => {
    stop();
    ch[0] = ch[1] = null;
    slots.forEach(slot => {
      slot.querySelector('input[type=file]').value = '';
      slot.querySelector('.drop-empty').hidden = false;
      const nm = slot.querySelector('.drop-name'); nm.hidden = true; nm.textContent = '';
      slot.querySelector('.slot-meta').textContent = '';
      clearWave(slot.querySelector('.wave'));
    });
    vols.forEach(v => { v.value = 0; v.nextElementSibling.textContent = '0.0 dB'; });
    statusEl.dataset.kind = '';
    timeEl.textContent = '0:00 / 0:00';
    update();
  });

  /* ---------- 오른쪽 아래 이동 버튼 ---------- */
  document.querySelectorAll('.scroll-pill button').forEach(b => b.addEventListener('click', () => {
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (b.dataset.dir === 'up') scrollTo({ top: 0, behavior });
    else scrollBy({ top: innerHeight * .85, behavior });
  }));

  const pill = document.querySelector('.scroll-pill');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    pill.classList.toggle('show', scrollY < lastY && scrollY > innerHeight);
    lastY = scrollY;
  }, { passive: true });
})();
