/* 하마반장 홈 첫 화면: 마우스(PC)·손가락 밀기(휴대폰) 가로 위치 → 고개 방향 → 영상 컷.
 * 컷: 하마반장_고개돌림_v1__Flow-Veo31Lite.mp4(24fps)에서 3.04~7.67초 사이를 '왼쪽 끝 → 정면 → 오른쪽'
 * 한 방향 순서로 고른 47장(갈색 점이 보이는 2.4~3.0초, 눈 깜빡임 4.6~4.8초 컷은 뺌).
 * 참고: 떡국이 첫 화면 site_v2 main.js의 불러오기·교차 합성 방식을 이 사이트에 맞게 옮김.
 */
(() => {
  'use strict';
  const SEQ = [73, 76, 79, 82, 85, 88, 91, 94, 97, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    117, 118, 119, 120, 121, 122, 124, 127, 130, 133, 136, 139, 142, 145, 148, 150, 157, 160, 163, 166, 169,
    172, 175, 178, 181, 184];
  const FRONT_N = 120;
  const FRONT = SEQ.indexOf(FRONT_N);   // 정면 위치(순서 번호)
  const LAST = SEQ.length - 1;

  const hero = document.getElementById('hero');
  const stage = document.getElementById('frames');
  const img = document.getElementById('frameImg');
  const canvas = document.getElementById('frameCanvas');
  if (!hero || !stage || !img || !canvas) return;

  // 머리 메뉴: 첫 화면 위에서는 투명, 지나가면 크림 바탕
  const head = document.querySelector('.site-head');
  const onScroll = () => {
    const limit = hero.offsetHeight - (head ? head.offsetHeight : 60) - 8;
    if (head) head.classList.toggle('over-hero', window.scrollY < limit);
    if (head) head.classList.toggle('scrolled', window.scrollY > 40); // 첫 화면 안에서 내리면 짙은 초록 반투명 바탕
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return; // 움직임 줄이기: 정면 그림만, 추가 컷도 받지 않음

  const mobileMq = window.matchMedia('(max-width: 720px)');
  const ctx = canvas.getContext('2d');
  const sets = {};
  let set = mobileMq.matches ? 'm' : 'pc';
  const src = (s, n) => `assets/hero/${s}/f${String(n).padStart(3, '0')}.webp`;
  const ready = (n) => sets[set] && sets[set].get(n);

  function loadSet(s) {
    if (sets[s]) return;
    const map = (sets[s] = new Map());
    const order = SEQ.slice().sort((x, y) => Math.abs(SEQ.indexOf(x) - FRONT) - Math.abs(SEQ.indexOf(y) - FRONT));
    let i = 0;
    const next = () => {
      if (i >= order.length) return;
      const n = order[i++];
      const im = new Image();
      im.decoding = 'async';
      im.src = src(s, n);
      (im.decode ? im.decode() : Promise.resolve())
        .then(() => { map.set(n, im); if (s === set && n === FRONT_N) goLive(); })
        .catch(() => {})
        .finally(next);
    };
    for (let k = 0; k < 4; k++) next();
  }

  let live = false;
  function goLive() {
    const im = ready(FRONT_N);
    if (!im) return;
    canvas.width = im.naturalWidth; canvas.height = im.naturalHeight;
    live = true; lastKey = '';
    stage.classList.add('is-live');
    wake();
  }

  // ---------- 상태 ----------
  let target = FRONT, cur = FRONT, lastT = 0, running = false, lastKey = '';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let tau = 120;

  // 가로 위치 p(0~1) → 순서 위치. 가운데가 정면, 양 끝이 끝 컷
  const posFromP = (p) => (p < 0.5 ? FRONT * (p / 0.5) : FRONT + (LAST - FRONT) * ((p - 0.5) / 0.5));

  function draw(pos) {
    if (!live) return;
    // 불러온 컷 가운데 pos 양옆
    let lo = null, hi = null;
    for (let i = Math.floor(pos); i >= 0; i--) if (ready(SEQ[i])) { lo = i; break; }
    for (let i = Math.ceil(pos); i <= LAST; i++) if (ready(SEQ[i])) { hi = i; break; }
    if (lo == null) lo = hi; if (hi == null) hi = lo;
    if (lo == null) return;
    let a = SEQ[lo], b = null, w = 0;
    if (hi !== lo) {
      const t = (pos - lo) / (hi - lo);
      const k = clamp((t - 0.5) / 0.4 + 0.5, 0, 1);
      if (k >= 1) a = SEQ[hi]; else if (k > 0) { b = SEQ[hi]; w = Math.round(k * 8) / 8; }
    }
    const key = b ? `${a}|${b}|${w}` : String(a);
    if (key === lastKey) return;
    lastKey = key;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!b) { ctx.drawImage(ready(a), 0, 0, canvas.width, canvas.height); return; }
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - w; ctx.drawImage(ready(a), 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = w; ctx.drawImage(ready(b), 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  function tick(t) {
    const dt = lastT ? Math.min(64, t - lastT) : 16;
    lastT = t;
    cur += (target - cur) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target - cur) < 0.01) cur = target;
    draw(cur);
    if (cur === target) { running = false; return; }
    requestAnimationFrame(tick);
  }
  function wake() {
    if (running || document.hidden || !live) return;
    running = true; lastT = 0;
    requestAnimationFrame(tick);
  }
  const aim = (pos, speed) => { target = clamp(pos, 0, LAST); tau = speed; wake(); };

  // ---------- 입력 ----------
  // PC: 화면 가로 위치를 따라 봄. 마우스가 창 밖으로 나가면 정면.
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    aim(posFromP(e.clientX / (window.innerWidth || 1)), 120);
  }, { passive: true });
  document.addEventListener('mouseleave', () => aim(FRONT, 650));
  window.addEventListener('blur', () => aim(FRONT, 650));

  // 휴대폰: 하마를 좌우로 밀면 그쪽을 보고, 손을 떼면 천천히 정면
  let touchId = null, startX = 0, startPos = FRONT, touching = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touchId = e.pointerId; startX = e.clientX; startPos = cur; touching = true;
  }, { passive: true });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || e.pointerId !== touchId) return;
    const dx = (e.clientX - startX) / Math.max(1, stage.clientWidth * 0.5);
    aim(startPos + dx * (dx < 0 ? FRONT : LAST - FRONT), 90);
  }, { passive: true });
  const endTouch = (e) => { if (e.pointerId === touchId) { touchId = null; touching = false; aim(FRONT, 650); } };
  stage.addEventListener('pointerup', endTouch, { passive: true });
  stage.addEventListener('pointercancel', endTouch, { passive: true });

  // 기울기: 권한 요청이 필요 없는 휴대폰에서만(아이폰처럼 권한을 묻는 기기에서는 쓰지 않음)
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (coarse && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      if (touching || e.gamma == null) return;
      const p = clamp((e.gamma + 25) / 50, 0, 1);
      aim(posFromP(p), 300);
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  mobileMq.addEventListener('change', () => {
    set = mobileMq.matches ? 'm' : 'pc';
    live = false; stage.classList.remove('is-live');
    loadSet(set); if (ready(FRONT_N)) goLive();
  });

  // 정면 그림은 HTML로 먼저 보이고, 페이지 로드가 끝난 뒤 나머지 컷을 뒤에서 받음
  const start = () => loadSet(set);
  if (document.readyState === 'complete') setTimeout(start, 50);
  else window.addEventListener('load', () => setTimeout(start, 50), { once: true });
})();
