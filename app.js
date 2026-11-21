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

  // ---------- Maps: Leaflet + Esri Light Gray; sea routes precomputed by scripts/build-routes.py (routes.js) ----------
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  const BASE = ESRI + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', LABELS = ESRI + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
  const ATTR = 'Esri, HERE, Garmin, © OpenStreetMap contributors';
  const BLUE = '#2D5BE3', DARK = '#1C3FB0';
  const seaRoute = (i, j) => { const r = window.SEA_ROUTES[i < j ? `${i}-${j}` : `${j}-${i}`]; return i < j ? r.path : [...r.path].reverse(); };
  const STILL = { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25 };

  const drawRoute = (map, path, lineCls) => {
    const line = L.polyline(path, { color: BLUE, weight: 4, lineCap: 'round', lineJoin: 'round', className: lineCls, interactive: false }).addTo(map);
    line.getElement().setAttribute('pathLength', '1'); // lets CSS draw the line in
    L.circleMarker(path[0], { radius: 7, weight: 3, color: DARK, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(map);
    L.circleMarker(path[path.length - 1], { radius: 9, weight: 3, color: '#fff', fillColor: DARK, fillOpacity: 1, interactive: false }).addTo(map);
  };

  // A white dot that sails along the route, looping every 6 s
  const sail = (map, path) => {
    if (reduced) return;
    const pts = path.map((p) => L.latLng(p)), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i - 1].distanceTo(pts[i]));
    const total = cum[cum.length - 1];
    const boat = L.circleMarker(pts[0], { radius: 6, weight: 0, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(map);
    const t0 = performance.now();
    const step = (now) => {
      if (!map._container || !map._container.isConnected) return;
      const d = ((now - t0) / 6000 % 1) * total;
      let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const f = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
      boat.setLatLng([pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * f, pts[i - 1].lng + (pts[i].lng - pts[i - 1].lng) * f]);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Small route maps on the destination cards, created on first hover
  const minis = new Map();
  const initMini = (card) => {
    const el = card.querySelector('.minimap');
    if (!el || minis.has(el) || !window.L) return;
    const path = seaRoute(S.o, +card.dataset.dest);
    const map = L.map(el, STILL);
    L.tileLayer(BASE, { maxZoom: 16 }).addTo(map);
    map.fitBounds(L.latLngBounds(path), { padding: [22, 22], maxZoom: 12 });
    drawRoute(map, path, 'mroute');
    minis.set(el, map);
  };
  const dropMinis = () => { minis.forEach((m) => m.remove()); minis.clear(); };

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
  const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';
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
    dropMinis();
    $('#cards').innerHTML = list.map(({ x, k }, i) => {
      const r = route(from, x);
      return `
      <button type="button" class="box dest" data-dest="${k}" style="animation-delay:${i * 50}ms" aria-label="${esc(`${from.name} to ${x.name}, ${fmt(r[0])}, from ${r[1]} euros`)}">
        <span class="cmedia">
          <img class="cimg" src="${x.img}" alt="${esc(x.alt)}" loading="lazy">
          <span class="minimap" aria-hidden="true"></span>
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
          <div class="boatgrid">
            ${BOATS.map((b, j) => { const on = j === S.tier; return `
            <button type="button" class="box dest boatcard" data-tier="${j}" aria-pressed="${on}">
              <span class="cmedia"><img class="cimg" src="${b.img}" alt="${esc(b.model)}"></span>
              <span class="cbody">
                <span class="ctitle"><span class="t-h3">${b.name}</span><span class="ctime">${esc(b.model)}</span></span>
                <span class="cmore"><span><span class="muted t-14">${esc(b.perk.charAt(0).toUpperCase() + b.perk.slice(1))}</span></span></span>
              </span>
              <span class="cfoot"><span class="muted t-14">${on ? 'Selected' : ''}</span><span class="btn btn-sm">${r[1] + b.add} €${on ? CHECK : ARROW()}</span></span>
            </button>`; }).join('')}
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
    const when = new Date(`${S.date}T${S.time || '00:00'}`);
    const whenTxt = isNaN(when) ? '' : ` · ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${S.time}`;
    return `
      <div class="bk-bar" id="bkBar">
        <div class="wrap bk-bar-in">
          <span class="bk-sum t-16 muted fw500">${T.name} boat · ${S.guests} ${S.guests === 1 ? 'guest' : 'guests'}${whenTxt}</span>
          <div class="bk-act">
            <span class="bk-total" aria-live="polite">${prices(r).total} €</span>
            <a href="#" class="gobtn bk-book">Book<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          </div>
        </div>
      </div>`;
  };

  // Hero: a real map fills the screen width; start and destination float next to their pins as photo cards
  let bkMap = null;
  const initHero = () => {
    if (bkMap) { bkMap.remove(); bkMap = null; }
    const el = $('#bkMap'); if (!el || !window.L) return;
    const from = D[S.o], to = D[S.m], path = seaRoute(S.o, S.m);
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    const mw = el.clientWidth, mh = el.clientHeight;
    const cw = mobile ? 136 : 208, ch = mobile ? 132 : 192, gap = mobile ? 16 : 24, m = 12;
    const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomSnap: 0.25, attributionControl: true });
    map.attributionControl.setPrefix(false);
    L.tileLayer(BASE, { maxZoom: 16, attribution: ATTR }).addTo(map);
    L.tileLayer(LABELS, { maxZoom: 16 }).addTo(map);
    // leave room beside (desktop) or above/below (mobile) the route for the two cards
    const pad = mobile ? [24, ch + gap + m] : [cw + gap + m, 56];
    map.fitBounds(L.latLngBounds(path), { padding: pad, maxZoom: 13 });
    drawRoute(map, path, 'routeline');
    sail(map, path);

    const pt = (ll) => { const p = map.latLngToContainerPoint(ll); return [p.x, p.y]; };
    const A = pt(path[0]), Z = pt(path[path.length - 1]);
    const rect = ([x, y], dir) => ({ up: [x - cw / 2, y - gap - ch], down: [x - cw / 2, y + gap], left: [x - gap - cw, y - ch / 2], right: [x + gap, y - ch / 2] }[dir]);
    const clampR = ([x, y], dir) => (dir === 'up' || dir === 'down') ? [Math.min(Math.max(x, m), mw - m - cw), y] : [x, Math.min(Math.max(y, m), mh - m - ch)];
    const overflow = ([x, y]) => Math.max(0, m - x) + Math.max(0, x + cw - (mw - m)) + Math.max(0, m - y) + Math.max(0, y + ch - (mh - m));
    const hits = (p, q) => q && p[0] < q[0] + cw + 8 && q[0] < p[0] + cw + 8 && p[1] < q[1] + ch + 8 && q[1] < p[1] + ch + 8;
    // point away from the other pin along the main axis, then the sides, then towards it
    const order = (P, O) => {
      const dx = P[0] - O[0], dy = P[1] - O[1];
      const h1 = dx < 0 ? 'left' : 'right', v1 = dy < 0 ? 'up' : 'down', h2 = h1 === 'left' ? 'right' : 'left', v2 = v1 === 'up' ? 'down' : 'up';
      return Math.abs(dx) > Math.abs(dy) ? [h1, v1, v2, h2] : [v1, h1, h2, v2];
    };
    const place = (P, O, other) => {
      let best = null;
      for (const dir of order(P, O)) {
        const r = clampR(rect(P, dir), dir), cost = overflow(r) * 10 + (hits(r, other) ? 1000 : 0);
        if (!best || cost < best.cost) best = { dir, r, cost };
        if (cost === 0) break;
      }
      return best;
    };
    const pa = place(A, Z, null), pz = place(Z, A, pa.r);
    // The card is a marker anchored at its pin, so it follows the map if it's dragged
    const card = (p, P, pl, label, cls) => {
      const [x, y] = [pl.r[0] - P[0], pl.r[1] - P[1]], pr = 10;
      let ln;
      if (pl.dir === 'up') ln = [-1, y + ch, 2, -pr - (y + ch)];
      else if (pl.dir === 'down') ln = [-1, pr, 2, y - pr];
      else if (pl.dir === 'left') ln = [x + cw, -1, -pr - (x + cw), 2];
      else ln = [pr, -1, x - pr, 2];
      return L.divIcon({ className: 'bk-pin-ico', iconSize: [0, 0], iconAnchor: [0, 0], html: `
        <span class="bk-line" style="left:${ln[0]}px;top:${ln[1]}px;width:${Math.max(ln[2], 0)}px;height:${Math.max(ln[3], 0)}px"></span>
        <figure class="bk-pin ${cls}" style="left:${x}px;top:${y}px">
          <img src="${p.img}" alt="${esc(p.alt)}">
          <figcaption><span class="t-12 muted">${label}</span><span class="bk-pin-n">${esc(p.name)}</span></figcaption>
        </figure>` });
    };
    L.marker(path[0], { icon: card(from, A, pa, 'From', 'is-from'), interactive: false, keyboard: false }).addTo(map);
    L.marker(path[path.length - 1], { icon: card(to, Z, pz, 'To', 'is-to'), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(map);
    bkMap = map;
  };

  const renderBooking = () => {
    const from = D[S.o], to = D[S.m], r = route(from, to);
    $('#booking').innerHTML = `
      <section class="bk-hero" id="bkHero"><div class="bk-map" id="bkMap" role="img" aria-label="${esc(`Map of the sea route from ${from.name} to ${to.name}`)}"></div></section>
      <section class="wrap bk-main">
        <h1 class="bk-title"><span class="bk-t-from">${esc(from.name)} →</span><span class="bk-t-to">${esc(to.name)}</span></h1>
        <p class="muted bk-sub">${fmt(r[0])} by private boat · ${esc(from.pier)} to ${esc(to.pier.charAt(0).toLowerCase() + to.pier.slice(1))}</p>
        ${optsHTML(r, from, to)}
      </section>
      ${barHTML(r)}`;
    initHero();
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
    $('#topbar').hidden = bk; // no nav bar on the booking page; browser Back returns home
    if (!bk && bkMap) { bkMap.remove(); bkMap = null; }
    if (bk) renderBooking(); else { renderFrom(); renderCards(); }
  };

  const goHome = () => { S.m = null; showView(); toTop(); };
  const openDest = (k) => { S.m = k; S.tier = 0; S.ret = false; S.swim = false; setDd(false); history.pushState({ m: k, o: S.o }, ''); showView(); toTop(); };
  window.addEventListener('popstate', (e) => { S.m = e.state && e.state.m != null ? e.state.m : null; showView(); toTop(); });

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
  // Re-fit the booking map to a new window shape
  let rw = window.innerWidth, rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (isBooking() && Math.abs(window.innerWidth - rw) >= 40) { rw = window.innerWidth; initHero(); } }, 200);
  });
  // Destination cards: build the route map the first time a card is hovered or focused
  const warm = (e) => { const c = e.target.closest && e.target.closest('.dest[data-dest]'); if (c) initMini(c); };
  document.addEventListener('pointerover', warm);
  document.addEventListener('focusin', warm);

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
