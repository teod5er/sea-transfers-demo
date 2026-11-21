/* Sea Transfers – Hvar Charter
   Home: pick a starting point, browse destinations. Click a card → booking view. */
(() => {
  'use strict';

  // ---------- Data ----------
  const D = [
    { name: 'Split Airport', pier: 'Pier next to the airport terminal', desc: 'Land and step straight onto the boat. No taxi into town, no ferry queue.', img: 'img/split-airport.jpg', alt: 'Inside the Split Airport terminal' },
    { name: 'Split', pier: 'Riva waterfront, city centre', desc: 'Board on the Riva, a few steps from Diocletian’s Palace.', img: 'img/split.jpg', alt: 'Diocletian’s Palace and the Riva from above' },
    { name: 'Hvar town', pier: 'Main harbour, by the square', desc: 'Arrive in the heart of town, right by the main square.', img: 'img/hvar.jpg', alt: 'Hvar harbour and the Pakleni Islands from the fortress' },
    { name: 'Vis', pier: 'Vis town harbour', desc: 'The far island: quiet bays, local wine and an old fishing town.', img: 'img/vis.jpg', alt: 'Vis town harbour from the hill' },
    { name: 'Bol', pier: 'Bol harbour, near the Golden Horn', desc: 'Brač’s sunny south side, a short walk from the Golden Horn beach.', img: 'img/bol.jpg', alt: 'The Golden Horn beach from above' },
    { name: 'Korčula', pier: 'Below the old town walls', desc: 'Step off right below the walls of the medieval old town.', img: 'img/korcula.jpg', alt: 'Korčula old town on its peninsula' },
    { name: 'Vela Luka', pier: 'Vela Luka harbour', desc: 'Korčula’s west end, tucked in a deep and sheltered bay.', img: 'img/vela-luka.jpg', alt: 'Vela Luka bay from the hills' },
    { name: 'Komiža', pier: 'Komiža harbour, near the Blue Cave', desc: 'Fishing town under Mount Hum, the gateway to the Blue Cave.', img: 'img/komiza.jpg', alt: 'Komiža harbour from above' }
  ];
  const LL = { 'Split Airport': [43.535, 16.300], 'Split': [43.503, 16.440], 'Hvar town': [43.172, 16.441], 'Vis': [43.061, 16.183], 'Bol': [43.261, 16.655], 'Korčula': [42.961, 17.136], 'Vela Luka': [42.963, 16.718], 'Komiža': [43.043, 16.090] };
  // Real Hvar Charter prices from Hvar town: [minutes, €]. Other routes are a distance-based estimate.
  const REAL = { 'Split Airport': [64, 450], 'Split': [55, 400], 'Vis': [29, 280], 'Bol': [44, 350], 'Korčula': [74, 480], 'Vela Luka': [43, 350], 'Komiža': [50, 450] };
  // Placeholder upgrade prices
  const COMFORT_ADD = 100, LUXURY_ADD = 300, SWIM_PRICE = 120;
  const BOATS = [
    { name: 'Standard', model: 'Flyer 828 RIB', perk: 'fast, open-air', add: 0, img: 'img/boat-flyer.jpg' },
    { name: 'Comfort', model: 'Barracuda 730', perk: 'shade, room for bags', add: COMFORT_ADD, img: 'img/boat-barracuda.jpg' },
    { name: 'Luxury', model: 'XP 38', perk: 'lounge and cabin', add: LUXURY_ADD, img: 'img/boat-xp38.jpg' }
  ];
  const HC = [
    { title: 'Private boat tours', text: 'Blue Cave, Pakleni Islands, Red Rocks or your own route, with a skipper.', tag: 'From Hvar', cta: 'See more', img: 'img/blue-cave.jpg', alt: 'Blue light inside the Blue Cave' },
    { title: 'Group excursions', text: 'Join a small group for the Blue & Green Cave day trip.', tag: 'Shared boat', cta: 'See more', img: 'img/red-rocks.jpg', alt: 'Red cliffs above green water' },
    { title: 'Boat rental', text: 'Explore the islands at your own pace, with or without a skipper.', tag: 'By the day', cta: 'See more', img: 'img/boat-xp38.jpg', alt: 'XP 38 speedboat at sea' }
  ];

  const route = (a, b) => {
    if (a.name === 'Hvar town' && REAL[b.name]) return REAL[b.name];
    if (b.name === 'Hvar town' && REAL[a.name]) return REAL[a.name];
    const A = LL[a.name], Z = LL[b.name];
    const dy = (A[0] - Z[0]) * 60, dx = (A[1] - Z[1]) * 60 * Math.cos(43 * Math.PI / 180);
    let nm = Math.sqrt(dx * dx + dy * dy) * 1.2;
    if (a.name === 'Split Airport' || b.name === 'Split Airport') nm += 6;
    return [Math.round(nm / 26 * 60), Math.round((170 + 10 * nm) / 10) * 10];
  };

  // ---------- Sea-route map: shortest path through waypoints on the base map ----------
  const MAP = { W: 2200, H: 1399, LON0: 15.55, LON1: 17.45, LAT0: 42.80, LAT1: 43.68, IMG: 'img/map.jpg' };
  const NODES = { AIR: [43.535, 16.3], K1: [43.505, 16.355], K2: [43.497, 16.41], SPL: [43.503, 16.44], C1: [43.45, 16.4], C2: [43.36, 16.397], C2b: [43.325, 16.396], C3: [43.27, 16.36], P1: [43.2, 16.33], PW: [43.165, 16.313], PS: [43.144, 16.372], PE: [43.153, 16.433], HVR: [43.172, 16.441], H1: [43.235, 16.47], H2: [43.245, 16.6], BOL: [43.261, 16.655], S1: [43.12, 16.52], S2: [43.05, 16.8], S3: [42.98, 17.06], KOR: [42.961, 17.136], VL1: [42.978, 16.617], VLK: [42.963, 16.718], V1: [43.1, 16.28], VIS: [43.061, 16.183], V2: [43.095, 16.12], V3: [43.06, 16.06], KOM: [43.043, 16.09] };
  const EDGES = [['AIR','K1'],['K1','K2'],['K2','SPL'],['K2','C1'],['SPL','C1'],['C1','C2'],['C2','C2b'],['C2b','C3'],['C3','P1'],['C3','H1'],['P1','PW'],['PW','PS'],['PS','PE'],['PE','HVR'],['PS','V1'],['PW','V1'],['PE','S1'],['HVR','S1'],['H1','H2'],['H2','BOL'],['S1','S2'],['S2','S3'],['S3','KOR'],['S1','VL1'],['S2','VL1'],['VL1','VLK'],['V1','VIS'],['V1','V2'],['V2','V3'],['V3','KOM']];
  const PORT = { 'Split Airport': 'AIR', 'Split': 'SPL', 'Hvar town': 'HVR', 'Vis': 'VIS', 'Bol': 'BOL', 'Korčula': 'KOR', 'Vela Luka': 'VLK', 'Komiža': 'KOM' };
  const px = (k) => [(NODES[k][1] - MAP.LON0) / (MAP.LON1 - MAP.LON0) * MAP.W, (MAP.LAT1 - NODES[k][0]) / (MAP.LAT1 - MAP.LAT0) * MAP.H];
  const ADJ = {};
  EDGES.forEach(([u, v]) => {
    const pu = px(u), pv = px(v), w = Math.hypot(pu[0] - pv[0], pu[1] - pv[1]);
    (ADJ[u] = ADJ[u] || []).push([v, w]); (ADJ[v] = ADJ[v] || []).push([u, w]);
  });
  const seaPath = (a, b) => {
    const dist = {}, prev = {}, todo = new Set(Object.keys(NODES));
    Object.keys(NODES).forEach((k) => { dist[k] = Infinity; }); dist[a] = 0;
    while (todo.size) {
      let u = null; todo.forEach((k) => { if (u === null || dist[k] < dist[u]) u = k; });
      todo.delete(u); if (u === b) break;
      (ADJ[u] || []).forEach(([v, w]) => { if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } });
    }
    const out = []; let c = b; while (c) { out.unshift(px(c)); c = prev[c]; }
    return out;
  };
  const smooth = (pts) => {
    let p = pts;
    for (let it = 0; it < 2; it++) {
      const q = [p[0]];
      for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      q.push(p[p.length - 1]); p = q;
    }
    return p;
  };
  const routeMap = (a, b, AR = 1.75, base = 760) => {
    const raw = seaPath(PORT[a.name], PORT[b.name]), pts = smooth(raw);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    let w = Math.max((Math.max(...xs) - Math.min(...xs)) * 1.35, 300), h = Math.max((Math.max(...ys) - Math.min(...ys)) * 1.35 + 60, 180);
    if (w / h < AR) w = h * AR; else h = w / AR;
    // Keep the view inside the map image so it always fills the frame
    if (w > MAP.W) { w = MAP.W; h = w / AR; }
    if (h > MAP.H) { h = MAP.H; w = h * AR; }
    const x0 = Math.min(Math.max(cx - w / 2, 0), MAP.W - w), y0 = Math.min(Math.max(cy - h / 2, 0), MAP.H - h);
    const k = w / base, A = raw[0], Z = raw[raw.length - 1], sq = 12 * k;
    return {
      vb: `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`,
      d: 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L'),
      sw: (4 * k).toFixed(2), ring: (2.5 * k).toFixed(2), boatR: (6 * k).toFixed(2), pinR: (7 * k).toFixed(2),
      ax: A[0].toFixed(1), ay: A[1].toFixed(1), bx0: (Z[0] - sq / 2).toFixed(1), by0: (Z[1] - sq / 2).toFixed(1), sq: sq.toFixed(1),
      aria: `Map of the sea route from ${a.name} to ${b.name}`
    };
  };
  const mapSvg = (m, cls, { boat = false, lineCls = 'mroute', preserve = 'xMidYMid slice', label = '', plain = false } = {}) => `
    <svg class="${cls}" viewBox="${m.vb}" preserveAspectRatio="${preserve}" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>
      ${plain ? '' : `<image href="${MAP.IMG}" x="0" y="0" width="${MAP.W}" height="${MAP.H}"></image>`}
      <path class="${lineCls}" d="${m.d}" pathLength="1" fill="none" stroke="#fff" stroke-width="${m.sw}" stroke-linecap="round" stroke-linejoin="round"></path>
      ${boat ? `<circle r="${m.boatR}" fill="#0B0B0F" stroke="#fff" stroke-width="${m.ring}"><animateMotion dur="6s" repeatCount="indefinite" path="${m.d}"></animateMotion></circle>` : ''}
      <circle cx="${m.ax}" cy="${m.ay}" r="${m.pinR}" fill="#fff" stroke="#0B0B0F" stroke-width="${m.ring}"></circle>
      <rect x="${m.bx0}" y="${m.by0}" width="${m.sq}" height="${m.sq}" fill="#0B0B0F" stroke="#fff" stroke-width="${m.ring}"></rect>
    </svg>`;

  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const fmt = (m) => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = (top) => window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  const toTop = () => setTimeout(() => scrollTo(0), 20);
  const toGrid = () => setTimeout(() => { const g = $('#grid'); if (g) scrollTo(g.getBoundingClientRect().top + window.scrollY - 12); }, 40);
  const ARROW = (s = 16) => `<svg class="go" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
  const BOAT_AVS = `<span class="boatpick" role="img" aria-label="3 boats to choose from"><span class="avs" aria-hidden="true">${BOATS.map((b) => `<img class="av" src="${b.img}" alt="">`).join('')}</span></span>`;

  // ---------- State ----------
  const S = { o: 0, m: null, tier: 0, ret: false, swim: false, dd: false, stuck: false, guests: 2, date: '2027-06-14', time: '14:00' };
  const isBooking = () => S.m !== null && S.m !== S.o;

  // ---------- Home ----------
  const renderFrom = () => {
    const from = D[S.o];
    $('#fromName').textContent = from.name;
    $('#fromImg').src = from.img;
    $('#fromBtn').setAttribute('aria-label', `Going from ${from.name}. Change starting point`);
  };

  const renderOrigins = () => {
    $('#origin-panel').innerHTML = D.map((x, k) => `
      <button type="button" class="ocard" data-origin="${k}" aria-pressed="${k === S.o}" style="animation-delay:${60 + k * 35}ms">
        <span class="osq"><img src="${x.img}" alt="" draggable="false"></span>
        <span class="t-14 oname">${esc(x.name)}</span>
      </button>`).join('');
  };

  const renderCards = () => {
    const from = D[S.o];
    const list = D.map((x, k) => ({ x, k })).filter((e) => e.k !== S.o);
    $('#destCount').textContent = list.length;
    $('#cards').innerHTML = list.map(({ x, k }, i) => {
      const r = route(from, x), map = routeMap(from, x, 1.6, 300);
      return `
      <button type="button" class="box dest" data-dest="${k}" style="animation-delay:${i * 50}ms" aria-label="${esc(`${from.name} to ${x.name}, ${fmt(r[0])}, from ${r[1]} euros`)}">
        <span class="cmedia">
          <img class="cimg" src="${x.img}" alt="${esc(x.alt)}" loading="lazy">
          ${mapSvg(map, 'minimap')}
        </span>
        <span class="cbody">
          <span class="ctitle"><span class="t-h3">${esc(x.name)}</span><span class="ctime">${hm(r[0])}</span></span>
          <span class="cmore"><span><span class="muted t-14">${esc(x.desc)}</span></span></span>
        </span>
        <span class="cfoot">${BOAT_AVS}<span class="btn btn-sm">From ${r[1]} €${ARROW()}</span></span>
      </button>`;
    }).join('');
  };

  const xCard = (s, withTag) => `
    <a href="#" class="box dest xcard reveal">
      <img src="${s.img}" alt="${esc(s.alt)}" loading="lazy">
      <span class="xbody">
        <span class="${withTag ? 't-h3' : 'xt'}">${esc(s.title)}</span>
        <span class="muted t-14">${esc(s.text)}</span>
        ${withTag
          ? `<span class="xfoot"><span class="tag">${esc(s.tag)}</span><span class="btn btn-sm">${esc(s.cta)}${ARROW()}</span></span>`
          : `<span class="btn btn-sm">${esc(s.cta)}${ARROW(15)}</span>`}
      </span>
    </a>`;

  const renderHC = () => { $('#hcCards').innerHTML = HC.map((s) => xCard(s, true)).join(''); };

  // Starting point: the bar swaps in place for a gallery of ports
  const setDd = (open) => {
    if (S.dd === open) return;
    S.dd = open;
    if (open) renderOrigins();
    $('#frombar').classList.toggle('open', open);
    $('#origins').classList.toggle('ddopen', open);
    $('#fromBtn').setAttribute('aria-expanded', String(open));
    $('#ddBtn').setAttribute('aria-expanded', String(open));
    $('#fbGallery').setAttribute('aria-hidden', String(!open));
    if (open) {
      const cur = $(`[data-origin="${S.o}"]`, $('#origin-panel'));
      setTimeout(() => { if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }, 60);
    }
  };

  const onScroll = () => {
    const el = $('#origins');
    if (!el || isBooking()) { if (S.stuck) { S.stuck = false; el && el.classList.remove('stuck'); } return; }
    // Compare against the hero's bottom edge (fixed), not the bar's own box, which changes size when stuck
    const h = $('.hero'), stuck = window.scrollY >= h.offsetTop + h.offsetHeight - 0.5;
    if (stuck !== S.stuck) {
      S.stuck = stuck;
      el.classList.toggle('stuck', stuck);
    }
  };

  // Mouse drag-to-scroll on the origin rail (touch uses native swipe)
  let drag = null, justDragged = false;
  const rail = () => $('#origin-panel');
  const dragStart = (e) => { if (e.pointerType !== 'mouse') return; const r = rail(); drag = { x: e.clientX, sl: r.scrollLeft, moved: false }; r.style.scrollSnapType = 'none'; };
  const dragMove = (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) drag.moved = true; rail().scrollLeft = drag.sl - dx; };
  const dragEnd = () => { if (!drag) return; justDragged = drag.moved; drag = null; rail().style.scrollSnapType = ''; setTimeout(() => { justDragged = false; }, 50); };

  // ---------- Booking ----------
  // Booking: a map hero, a plain list of choices, and a sticky bar with the price and Book
  const prices = (r) => {
    const base = r[1] + BOATS[S.tier].add;
    const retPrice = Math.round(base * 0.9 / 10) * 10;
    return { retPrice, total: base + (S.ret ? retPrice : 0) + (S.swim ? SWIM_PRICE : 0) };
  };

  const optsHTML = (r, from, to) => {
    const { retPrice } = prices(r);
    const mark = (on) => on ? 'M5 12l5 5L19 7' : 'M12 5v14M5 12h14';
    const extras = [
      { key: 'ret', title: 'Return trip', note: `${to.name} → ${from.name}, any date · 10% off`, price: `+${retPrice} €`, on: S.ret },
      { key: 'swim', title: 'Swim stop on the way', note: 'About 45 minutes in a quiet bay', price: `+${SWIM_PRICE} €`, on: S.swim }
    ];
    return `
      <div class="bk-opts" id="bkOpts">
        <div class="bk-row">
          <h2 class="bk-label">When</h2>
          <div class="dt-grid">
            <label class="field muted">Date<input type="date" value="${S.date}" data-field="date"></label>
            <label class="field muted">Time<input type="time" value="${S.time}" data-field="time"></label>
          </div>
        </div>
        <div class="bk-row">
          <h2 class="bk-label" id="guestsLabel">Guests</h2>
          <span class="stepper" role="group" aria-labelledby="guestsLabel">
            <button type="button" data-guests="-1" aria-label="Fewer guests">−</button>
            <output aria-live="polite">${S.guests}</output>
            <button type="button" data-guests="1" aria-label="More guests">+</button>
          </span>
        </div>
        <div class="bk-row">
          <h2 class="bk-label">Boat</h2>
          <div class="optlist">
            ${BOATS.map((b, j) => `
            <button type="button" class="opt boatopt" data-tier="${j}" aria-pressed="${j === S.tier}">
              <img src="${b.img}" alt="${esc(b.model)}">
              <span style="flex:1;min-width:0"><span class="opt-t">${b.name}</span><span class="muted t-14">${esc(b.model)} · ${esc(b.perk)}</span></span>
              <span class="opt-p">${r[1] + b.add} €</span>
            </button>`).join('')}
          </div>
        </div>
        <div class="bk-row">
          <h2 class="bk-label">Add</h2>
          <div class="optlist">
            ${extras.map((x) => `
            <button type="button" class="opt extraopt" data-extra="${x.key}" aria-pressed="${x.on}">
              <span style="flex:1"><span class="opt-t">${x.title}</span><span class="muted t-14">${esc(x.note)}</span></span>
              <span class="opt-p">${x.price}</span>
              <span class="mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${mark(x.on)}"/></svg></span>
            </button>`).join('')}
          </div>
        </div>
      </div>`;
  };

  const barHTML = (r) => {
    const T = BOATS[S.tier];
    return `
      <div class="bk-bar" id="bkBar">
        <div class="wrap bk-bar-in">
          <div class="bk-sum">
            <span class="t-16 muted fw500">${T.name} boat · ${S.guests} ${S.guests === 1 ? 'guest' : 'guests'}</span>
            <span class="bk-total" aria-live="polite">${prices(r).total} €</span>
          </div>
          <a href="#" class="gobtn bk-book">Book<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
        </div>
      </div>`;
  };

  const renderBooking = () => {
    const from = D[S.o], to = D[S.m], r = route(from, to);
    const mw = window.innerWidth, mh = Math.max(window.innerHeight * 0.5, 280);
    const map = routeMap(from, to, mw / mh, mw);

    $('#booking').innerHTML = `
      <section class="bk-hero">
        ${mapSvg(map, 'bk-map', { boat: true, lineCls: 'routeline', label: map.aria })}
      </section>
      <section class="wrap bk-main">
        <h1 class="h-display bk-title">${esc(from.name)} → ${esc(to.name)}</h1>
        <p class="muted bk-sub">${fmt(r[0])} by private boat · ${esc(from.pier)} to ${esc(to.pier.charAt(0).toLowerCase() + to.pier.slice(1))}</p>
        ${optsHTML(r, from, to)}
      </section>
      ${barHTML(r)}`;
  };

  // Re-render only the choices and the bar, so the route animation doesn't replay and focus stays put
  const updateBooking = (focusSel) => {
    const from = D[S.o], to = D[S.m], r = route(from, to);
    const swap = (sel, html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); $(sel).replaceWith(t.firstElementChild); };
    swap('#bkOpts', optsHTML(r, from, to));
    swap('#bkBar', barHTML(r));
    if (focusSel) { const f = $(focusSel, $('#booking')); if (f) f.focus(); }
  };

  // ---------- View switching ----------
  const showView = () => {
    const bk = isBooking();
    $('#home').hidden = bk;
    $('#booking').hidden = !bk;
    $('#topbar').classList.toggle('over', !bk);
    if (bk) renderBooking(); else { renderFrom(); renderCards(); }
  };

  const goHome = () => { S.m = null; showView(); toTop(); };
  const openDest = (k) => { S.m = k; S.tier = 0; S.ret = false; S.swim = false; setDd(false); showView(); toTop(); };

  // ---------- Events ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-home]')) { e.preventDefault(); goHome(); return; }
    if (t.closest('#fromBtn') || t.closest('#ddBtn')) {
      setDd(true);
      return;
    }
    if (t.closest('#goBtn')) { toGrid(); return;
    }
    const o = t.closest('[data-origin]');
    if (o) { if (justDragged) { justDragged = false; return; } const k = +o.dataset.origin; setDd(false); if (k !== S.o) { S.o = k; renderFrom(); renderCards(); } $('#fromBtn').focus({ preventScroll: true }); return; }
    const d = t.closest('[data-dest]');
    if (d) { openDest(+d.dataset.dest); return; }
    const tier = t.closest('[data-tier]');
    if (tier) { S.tier = +tier.dataset.tier; updateBooking(`[data-tier="${S.tier}"]`); return; }
    const ex = t.closest('[data-extra]');
    if (ex) { const k = ex.dataset.extra; S[k] = !S[k]; updateBooking(`[data-extra="${k}"]`); return; }
    const g = t.closest('[data-guests]');
    if (g) { S.guests = Math.min(16, Math.max(1, S.guests + +g.dataset.guests)); updateBooking(`[data-guests="${g.dataset.guests}"]`); return; }
    // Close the origin picker when clicking elsewhere
    if (S.dd && !t.closest('#origins')) setDd(false);
  });
  document.addEventListener('change', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    if (f) S[f] = e.target.value;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (S.dd) { setDd(false); $('#fromBtn').focus(); }
  });
  const r = rail();
  r.addEventListener('pointerdown', dragStart);
  r.addEventListener('pointermove', dragMove);
  r.addEventListener('pointerup', dragEnd);
  r.addEventListener('pointerleave', dragEnd);
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Why carousel: static frame, content changes every 5 s ----------
  // The active dot's progress bar is a 5 s CSS animation; when it ends we advance. Hover/focus pauses it.
  const why = $('#why');
  if (why) {
    const slides = [...why.querySelectorAll('.why-slide')], dots = [...why.querySelectorAll('.why-dot')];
    let cur = 0;
    const show = (i) => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, j) => { s.classList.toggle('is-active', j === cur); s.setAttribute('aria-hidden', String(j !== cur)); });
      dots.forEach((d, j) => { if (j === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    };
    why.addEventListener('animationend', (e) => { if (e.target.classList.contains('why-bar')) show(cur + 1); });
    why.addEventListener('click', (e) => { const d = e.target.closest('[data-why]'); if (d) show(+d.dataset.why); });
    const pause = (on) => why.classList.toggle('paused', on);
    why.addEventListener('mouseenter', () => pause(true));
    why.addEventListener('mouseleave', () => pause(false));
    why.addEventListener('focusin', () => pause(true));
    why.addEventListener('focusout', () => pause(false));
    // Only run while on screen
    new IntersectionObserver(([en]) => why.classList.toggle('offscreen', !en.isIntersecting)).observe(why);
  }

  // ---------- Init ----------
  renderHC();
  showView();
})();
