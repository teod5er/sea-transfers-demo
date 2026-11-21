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
    { name: 'Standard', model: 'Flyer 828 RIB', perk: 'fast, open-air', add: 0, img: 'img/boat-flyer.jpg', tier: 'std', why: ['Best price', 'Fastest ride', 'Open-air'] },
    { name: 'Comfort', model: 'Barracuda 730', perk: 'shade, room for bags', add: COMFORT_ADD, img: 'img/boat-barracuda.jpg', tier: 'cmf', why: ['Shade on board', 'Room for luggage', 'Good for families'] },
    { name: 'Luxury', model: 'XP 38', perk: 'lounge and cabin', add: LUXURY_ADD, img: 'img/boat-xp38.jpg', tier: 'lux', why: ['Cabin and lounge', 'Smoothest ride', 'Big groups'] }
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

  // ---------- Maps: MapLibre + OpenFreeMap "Liberty" (colour, illustrative, crisp at any zoom) ----------
  // Place names, roads and buildings are stripped from the style. Sea routes come from routes.js (scripts/build-routes.py).
  const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
  const BLUE = '#2D5BE3', DARK = '#1C3FB0';
  const seaRoute = (i, j) => { const r = window.SEA_ROUTES[i < j ? `${i}-${j}` : `${j}-${i}`]; return i < j ? r.path : [...r.path].reverse(); };
  let stylePromise = null;
  const mapStyle = () => stylePromise || (stylePromise = fetch(STYLE_URL).then((res) => res.json()).then((st) => {
    // Brand palette, like the rest of the page: dark-blue sea, pale land, a whisper of relief
    st.layers = st.layers.filter((l) => l.type === 'background' || l.type === 'raster' || l.id === 'water');
    st.layers.forEach((l) => {
      if (l.type === 'background') l.paint = { 'background-color': '#F4F5FC' };
      if (l.type === 'raster') l.paint = { ...(l.paint || {}), 'raster-opacity': 0.18, 'raster-saturation': -1 };
      if (l.id === 'water') l.paint = { 'fill-color': DARK, 'fill-antialias': true };
    });
    return st;
  }));
  const ll = (p) => [p[1], p[0]];
  const lineData = (coords) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
  const ptData = (c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c } });
  // first t (0..1) of a polyline, by length
  const along = (coords, cum, t) => {
    const d = t * cum[cum.length - 1]; let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), a = coords[i - 1], b = coords[i];
    return { i, p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] };
  };

  const makeMap = (el, path, st, { interactive = false, padding = 24, boat = false, attribution = false } = {}) => {
    const coords = path.map(ll), cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + Math.hypot(coords[i][0] - coords[i - 1][0], (coords[i][1] - coords[i - 1][1]) * 1.37));
    const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    const map = new maplibregl.Map({
      container: el, style: structuredClone(st), bounds, fitBoundsOptions: { padding, maxZoom: 12.5 },
      interactive, attributionControl: attribution ? { compact: true } : false, dragRotate: false, pitchWithRotate: false, touchPitch: false
    });
    if (interactive) { map.scrollZoom.disable(); map.touchZoomRotate.disableRotation(); if (window.matchMedia('(max-width: 640px)').matches) map.dragPan.disable(); }
    let alive = true; map.on('remove', () => { alive = false; });
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: lineData(reduced ? coords : [coords[0], coords[0]]) });
      map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 4 } });
      map.addSource('pins', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ ...ptData(coords[0]), properties: { k: 'a' } }, { ...ptData(coords[coords.length - 1]), properties: { k: 'z' } }] } });
      map.addLayer({ id: 'pins', type: 'circle', source: 'pins', paint: {
        'circle-radius': ['match', ['get', 'k'], 'z', 9, 7], 'circle-color': ['match', ['get', 'k'], 'z', BLUE, '#fff'],
        'circle-stroke-width': 3, 'circle-stroke-color': ['match', ['get', 'k'], 'z', '#fff', DARK] } });
      if (reduced) return;
      // draw the route in, then (hero only) sail a boat along it
      const t0 = performance.now();
      const draw = (now) => {
        if (!alive) return;
        const t = Math.min((now - t0) / 1400, 1), e = 1 - Math.pow(1 - t, 3), { i, p } = along(coords, cum, e);
        map.getSource('route').setData(lineData([...coords.slice(0, i), p]));
        if (t < 1) requestAnimationFrame(draw); else if (boat) sail();
      };
      requestAnimationFrame(draw);
      const sail = () => {
        // a boat emoji in a white circle, sailing the route
        const b = document.createElement('div'); b.className = 'map-boat'; b.setAttribute('aria-hidden', 'true'); b.textContent = '🚤';
        const marker = new maplibregl.Marker({ element: b }).setLngLat(coords[0]).addTo(map);
        const s0 = performance.now();
        const step = (now) => { if (!alive) return; marker.setLngLat(along(coords, cum, (now - s0) / 6000 % 1).p); requestAnimationFrame(step); };
        requestAnimationFrame(step);
      };
    });
    return map;
  };

  // Small route maps on the destination cards, created on first hover
  const minis = new Map();
  const initMini = (card) => {
    const el = card.querySelector('.minimap');
    if (!el || minis.has(el) || !window.maplibregl) return;
    minis.set(el, null);
    const path = seaRoute(S.o, +card.dataset.dest);
    mapStyle().then((st) => { if (el.isConnected && minis.has(el)) minis.set(el, makeMap(el, path, st, { padding: 22 })); });
  };
  const dropMinis = () => { minis.forEach((m) => m && m.remove()); minis.clear(); };

  // Phone country codes ([ISO code, name, dial code]); the default follows the browser's region, else Croatia
  const COUNTRIES = [
    ['HR', 'Croatia', '385'],
    ['GB', 'United Kingdom', '44'],
    ['DE', 'Germany', '49'],
    ['AT', 'Austria', '43'],
    ['IT', 'Italy', '39'],
    ['FR', 'France', '33'],
    ['ES', 'Spain', '34'],
    ['NL', 'Netherlands', '31'],
    ['BE', 'Belgium', '32'],
    ['CH', 'Switzerland', '41'],
    ['SI', 'Slovenia', '386'],
    ['CZ', 'Czechia', '420'],
    ['PL', 'Poland', '48'],
    ['HU', 'Hungary', '36'],
    ['SK', 'Slovakia', '421'],
    ['RS', 'Serbia', '381'],
    ['BA', 'Bosnia and Herzegovina', '387'],
    ['ME', 'Montenegro', '382'],
    ['SE', 'Sweden', '46'],
    ['NO', 'Norway', '47'],
    ['DK', 'Denmark', '45'],
    ['FI', 'Finland', '358'],
    ['IE', 'Ireland', '353'],
    ['PT', 'Portugal', '351'],
    ['GR', 'Greece', '30'],
    ['US', 'United States', '1'],
    ['CA', 'Canada', '1'],
    ['AU', 'Australia', '61'],
    ['NZ', 'New Zealand', '64'],
    ['IL', 'Israel', '972'],
    ['AE', 'United Arab Emirates', '971'],
    ['BR', 'Brazil', '55'],
    ['ZA', 'South Africa', '27']
  ];
  const flag = (cc) => String.fromCodePoint(...[...cc].map((ch) => 127397 + ch.charCodeAt(0)));
  const guessCC = () => { const m = /-([A-Z]{2})$/.exec(navigator.language || ''); return m && COUNTRIES.some((c) => c[0] === m[1]) ? m[1] : 'HR'; };
  const dial = (cc) => '+' + (COUNTRIES.find((c) => c[0] === cc) || COUNTRIES[0])[2];

  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const fmtDate = (iso, long) => new Date(`${iso}T12:00`).toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fmt = (m) => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = (top) => window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  const toTop = () => setTimeout(() => scrollTo(0), 20);
  // a new view always starts at the very top: jump there instantly (a smooth scroll from deep in the old page can stop halfway)
  const jumpTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toGrid = () => setTimeout(() => { const g = $('#grid'); if (g) scrollTo(g.getBoundingClientRect().top + window.scrollY - 12); }, 40);
  const ARROW = (s = 16) => `<svg class="go" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
  const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';

  // ---------- State ----------
  const S = { o: 2, m: null, tier: 0, ret: false, swim: false, dd: false, stuck: false, date: '2027-06-14', time: '14:00', note: '', noteOpen: false, tried: false, sent: false, details: { first: '', last: '', email: '', phone: '', cc: guessCC() } };
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
          <span class="cfrom">${esc(from.name)} →</span>
          <span class="t-h3">${esc(x.name)}</span>
          <span class="cmore"><span><span class="muted t-14">${esc(x.desc)}</span></span></span>
        </span>
        <span class="cfoot"><span class="ctime">${hm(r[0])}</span><span class="btn btn-sm">From ${r[1]} €${ARROW()}</span></span>
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

  // Hero: most booked routes ([from, to] indexes into D)
  const POPULAR = [[0, 2], [2, 0], [1, 2], [2, 3]];
  const renderPop = () => {
    $('#popList').innerHTML = POPULAR.map(([a, b]) => {
      const r = route(D[a], D[b]);
      return `
        <li><button type="button" class="chip" data-pop="${a}-${b}" aria-label="${esc(`${D[a].name} to ${D[b].name}, ${fmt(r[0])}, from ${r[1]} euros`)}">${esc(D[a].name)} → ${esc(D[b].name)}<span class="chip-p">${r[1]} €</span></button></li>`;
    }).join('');
  };

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
    $('#fbClose').tabIndex = open ? 0 : -1;
    if (open) {
      const cur = $(`[data-origin="${S.o}"]`, $('#origin-panel'));
      setTimeout(() => { if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }, 60);
    }
  };

  // Bars shrink once they stick. Hysteresis keeps it calm: they shrink a little past the point,
  // and only grow back once you've scrolled clearly above it (no flicker around the edge).
  const HYST = 48;
  const stickAt = (el, on, point) => {
    const now = el.classList.contains('stuck'), y = window.scrollY;
    const want = now ? y > point - HYST : y > point + 8;
    if (want !== now) el.classList.toggle('stuck', want);
  };
  const onScroll = () => {
    // trip header sits under the (non-sticky) nav: it sticks once the nav has scrolled away, then shrinks a little later
    if (isBooking()) { const bh = $('#bkHead'); if (bh) stickAt(bh, true, $('#topbar').offsetHeight + 40); return; }
    const el = $('#origins'), h = $('.hero');
    if (el && h) stickAt(el, true, h.offsetTop + h.offsetHeight);
    S.stuck = el && el.classList.contains('stuck');
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

  // Booking: plain sections, all open; the price + Book bar stays at the bottom
  const detailsOk = () => {
    const d = S.details;
    return { first: !!d.first.trim(), last: !!d.last.trim(), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()), phone: d.phone.replace(/\D/g, '').length >= 6 };
  };
  const optsHTML = (r, from, to) => {
    const { retPrice } = prices(r);
    const mark = (on) => on ? 'M5 12l5 5L19 7' : 'M12 5v14M5 12h14';
    const extras = [
      { key: 'ret', title: 'Return trip', note: `${to.name} → ${from.name}, any date · 10% off`, price: `+${retPrice} €`, on: S.ret },
      { key: 'swim', title: 'Swim stop on the way', note: 'About 45 minutes in a quiet bay', price: `+${SWIM_PRICE} €`, on: S.swim }
    ];
    const ok = detailsOk(), d = S.details;
    const input = (k, label, type, auto, extra = '') => `
            <label class="field muted">${label}<input type="${type}" autocomplete="${auto}" data-detail="${k}" value="${esc(d[k])}"${S.tried && !ok[k] ? ' aria-invalid="true"' : ''}${extra}></label>`;
    const body = {
      when: `
          <div class="dt-grid">
            <div class="field muted"><span>Date</span><button type="button" class="pick-btn" data-pick="date">${fmtDate(S.date)}</button></div>
            <div class="field muted"><span>Time</span><button type="button" class="pick-btn" data-pick="time">${S.time}</button></div>
          </div>`,
      boat: `
          <div class="dgrid boatlist" role="radiogroup" aria-label="Boat">
            ${BOATS.map((b, j) => { const on = j === S.tier; return `
            <button type="button" class="box dest boatcard t-${b.tier}" role="radio" data-tier="${j}" aria-checked="${on}" aria-pressed="${on}">
              <span class="cmedia"><img class="cimg" src="${b.img}" alt="${esc(b.model)}">${b.tier === 'lux' ? '<span class="lux-badge">✦ Premium</span>' : ''}</span>
              <span class="cbody">
                <span class="cfrom">${esc(b.model)}</span>
                <span class="t-h3">${b.name}</span>
                <span class="cmore"><span><span class="br-tags">${b.why.map((w) => `<span class="tag">${esc(w)}</span>`).join('')}</span></span></span>
              </span>
              <span class="cfoot"><span class="ctime">${on ? 'Selected' : esc(b.why[0])}</span><span class="btn btn-sm">${r[1] + b.add} €${on ? CHECK : ARROW()}</span></span>
            </button>`; }).join('')}
          </div>`,
      extras: `
          <div class="optlist">
            ${extras.map((x) => `
            <button type="button" class="opt extraopt" data-extra="${x.key}" aria-pressed="${x.on}">
              <span style="flex:1"><span class="opt-t">${x.title}</span><span class="muted t-14">${esc(x.note)}</span></span>
              <span class="opt-p">${x.price}</span>
              <span class="mark" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${mark(x.on)}"/></svg></span>
            </button>`).join('')}
          </div>`,
      details: `
          <div class="det-grid">${input('first', 'First name', 'text', 'given-name')}${input('last', 'Last name', 'text', 'family-name')}${input('email', 'Email', 'email', 'email')}
            <div class="field muted"><label for="bkPhone">Phone (WhatsApp)</label>
              <div class="phone${S.tried && !ok.phone ? ' bad' : ''}">
                <span class="phone-cc">
                  <span class="phone-flag" aria-hidden="true">${flag(d.cc)}</span><span>${dial(d.cc)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                  <select data-cc aria-label="Country code">${COUNTRIES.map(([c, n, dl]) => `<option value="${c}"${c === d.cc ? ' selected' : ''}>${flag(c)} ${n} (+${dl})</option>`).join('')}</select>
                </span>
                <input id="bkPhone" type="tel" autocomplete="tel-national" inputmode="tel" data-detail="phone" value="${esc(d.phone)}" placeholder="91 234 5678"${S.tried && !ok.phone ? ' aria-invalid="true"' : ''}>
              </div>
            </div>
          </div>
          <p class="muted t-14 det-help">After you send the request, we reply by email and WhatsApp with the confirmation and your skipper’s number.</p>
          ${S.tried && !Object.values(ok).every(Boolean) ? '<p class="det-err" role="alert">Add your details so we can confirm your request.</p>' : ''}`,
      note: (S.noteOpen || S.note.trim()) ? `
          <label class="note-l" for="bkNote">Anything we should know?</label>
          <textarea class="note" id="bkNote" data-note rows="4" placeholder="Flight number, luggage, kids, anything the skipper should know">${esc(S.note)}</textarea>`
        : `<button type="button" class="btn note-btn" data-note-open><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Have something to say? Add a note</button>`
    };
    const sec = (key, title) => `
        <section class="bk-row" data-sec="${key}">
          ${title ? `<h2 class="bk-label">${title}</h2>` : ''}
          ${body[key]}
        </section>`;
    return `
      <div class="bk-opts" id="bkOpts">
        ${sec('when', 'When')}${sec('boat', 'Boat')}${sec('extras', 'Extras')}${sec('details', 'Your details')}${sec('note', '')}
      </div>`;
  };

  const barHTML = (r) => {
    const T = BOATS[S.tier];
    const when = new Date(`${S.date}T${S.time || '00:00'}`);
    const whenTxt = isNaN(when) ? '' : ` · ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${S.time}`;
    return `
      <div class="bk-bar" id="bkBar">
        <div class="wrap bk-bar-in">
          <span class="bk-sum"><span class="t-16 fw500">${T.name} boat${whenTxt}</span><span class="t-14 muted">Nothing is booked yet. We check availability and confirm by email and WhatsApp.</span></span>
          <div class="bk-act">
            <span class="bk-total" aria-live="polite">${prices(r).total} €</span>
            ${`<button type="button" class="gobtn bk-book" data-book>Send request<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`}
          </div>
        </div>
      </div>`;
  };

  // Trip map: colour map with the sea route, start pin, destination pin and a boat sailing it
  let bkMap = null;
  const initHero = () => {
    if (bkMap) { bkMap.remove(); bkMap = null; }
    const el = $('#bkMap'); if (!el || !window.maplibregl) return;
    const path = seaRoute(S.o, S.m), key = `${S.o}-${S.m}`;
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    mapStyle().then((st) => {
      if (!el.isConnected || `${S.o}-${S.m}` !== key) return;
      bkMap = makeMap(el, path, st, { interactive: true, padding: mobile ? 32 : 64, boat: true, attribution: true });
    });
  };

  // Last screen: confirmation of the request
  const renderConfirm = () => {
    const from = D[S.o], to = D[S.m], r = route(from, to), T = BOATS[S.tier], { retPrice, total } = prices(r), d = S.details;
    const row = (k, v) => `<div class="cf-row"><dt>${k}</dt><dd>${v}</dd></div>`;
    const extras = [S.ret && `Return trip (+${retPrice} €)`, S.swim && `Swim stop (+${SWIM_PRICE} €)`].filter(Boolean).join(', ') || 'None';
    $('#booking').innerHTML = `
      <section class="cf-band fade" aria-labelledby="cfTitle"><div class="wrap cf">
        <span class="cf-ok" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg></span>
        <h1 class="cf-title" id="cfTitle" tabindex="-1">Request sent</h1>
        <p class="cf-sub">Thanks, ${esc(d.first)}. We’ll confirm your transfer by email and WhatsApp.</p>
        <div class="cf-grid">
          <div class="box cf-card">
            <div class="cf-route">
              <span class="bt-p"><img src="${from.img}" alt=""><span class="bt-txt"><span class="bt-l">From</span><span>${esc(from.name)}</span></span></span>
              <span class="bt-p bt-to"><img src="${to.img}" alt=""><span class="bt-txt"><span class="bt-l">To</span><span>${esc(to.name)}</span></span></span>
            </div>
            <dl class="cf-list">
              ${row('Date', `${fmtDate(S.date, true)} · ${S.time}`)}
              ${row('Trip', `${fmt(r[0])} by private boat`)}
              ${row('Boat', `${T.name} · ${esc(T.model)}`)}
              ${row('Extras', extras)}
              ${row('Name', `${esc(d.first)} ${esc(d.last)}`)}
              ${row('Contact', `${esc(d.email)} · ${dial(d.cc)} ${esc(d.phone)}`)}
              ${S.note.trim() ? row('Note', esc(S.note.trim())) : ''}
            </dl>
            <div class="cf-total"><span>Total per boat</span><span class="bk-total">${total} €</span></div>
          </div>
          <div class="cf-next">
            <div class="box cf-pay">
              <h2 class="cf-pay-h">Payment</h2>
              <p class="cf-pay-now"><b>Nothing to pay now.</b> You pay once we’ve confirmed your transfer.</p>
              <dl class="cf-list">
                ${row('Total', `${total} € per boat`)}
                ${row('How', '[Payment methods, e.g. card link or cash to the skipper]')}
                ${row('When', '[When payment is due, e.g. deposit after confirmation, rest on board]')}
                ${row('Cancel', '[Cancellation and weather policy]')}
              </dl>
            </div>
            <h2 class="bk-label">What happens next</h2>
            <ol class="cf-steps">
              <li><b>We check the boat and skipper</b><span class="muted">for your date and time.</span></li>
              <li><b>You get a confirmation</b><span class="muted">by email and WhatsApp, with the meeting point.</span></li>
              <li><b>Your skipper meets you at the pier</b><span class="muted">${esc(from.pier)}.</span></li>
            </ol>
            <button type="button" class="gobtn cf-home" data-home>Back to Sea Transfers</button>
          </div>
        </div>
      </div></section>`;
    if (bkMap) { bkMap.remove(); bkMap = null; }
    $('#topbar').classList.add('on-blue');
    setTimeout(() => { const t = $('#cfTitle'); if (t) t.focus({ preventScroll: true }); }, 50);
  };

  const renderBooking = () => {
    const from = D[S.o], to = D[S.m], r = route(from, to);
    $('#booking').innerHTML = `
      <!-- Sticky trip header, built like the home page's "Going from" bar -->
      <header class="bk-head" id="bkHead">
        <div class="wrap bk-head-in">
          <h1 class="fromname bk-title">
            <span class="bt-p"><img src="${from.img}" alt=""><span class="bt-txt"><span class="bt-l">From</span><span>${esc(from.name)}</span></span></span>
            <button type="button" class="bk-swap" data-swap aria-label="Swap start and destination"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/></svg></button>
            <span class="bt-p bt-to"><img src="${to.img}" alt=""><span class="bt-txt"><span class="bt-l">To</span><span>${esc(to.name)}</span></span><span class="ctime bk-time">${hm(r[0])}</span></span>
          </h1>
        </div>
      </header>
      <!-- Route map, edge to edge -->
      <section class="bk-mapsec">
        <div class="bk-hero" id="bkHero"><div class="bk-map" id="bkMap" role="img" aria-label="${esc(`Map of the sea route from ${from.name} to ${to.name}`)}"></div></div>
      </section>
      <section class="wrap bk-main">
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
    $('#topbar').classList.toggle('over', !bk); // white nav bar with the logo on the trip page
    $('#topbar').classList.remove('on-blue');
    if (!bk && bkMap) { bkMap.remove(); bkMap = null; }
    if (bk) renderBooking(); else { renderFrom(); renderCards(); }
  };

  const goHome = () => { S.m = null; showView(); jumpTop(); };
  const openDest = (k) => { S.m = k; S.tier = 0; S.ret = false; S.swim = false; S.tried = false; S.sent = false; setDd(false); history.pushState({ m: k, o: S.o }, ''); showView(); jumpTop(); };
  window.addEventListener('popstate', (e) => { const was = isBooking(); S.m = e.state && e.state.m != null ? e.state.m : null; showView(); if (was && !isBooking()) { jumpTop(); toGrid(); } else jumpTop(); });

  // ---------- Language dropdown ----------
  // Only the selection is kept for now; the page copy is English until translations exist.
  const lang = $('#lang'), langBtn = $('#langBtn'), langList = $('#langList');
  const langOpts = () => [...langList.querySelectorAll('[role="option"]')];
  const setLangOpen = (open) => {
    langList.hidden = !open; langBtn.setAttribute('aria-expanded', String(open)); lang.classList.toggle('open', open);
    if (open) (langList.querySelector('[aria-selected="true"]') || langOpts()[0]).focus();
  };
  const chooseLang = (li) => {
    langOpts().forEach((o) => o.setAttribute('aria-selected', String(o === li)));
    $('#langCur').textContent = li.dataset.lang.toUpperCase();
    langBtn.setAttribute('aria-label', `Language: ${li.textContent}`);
    document.documentElement.lang = li.dataset.lang;
    setLangOpen(false); langBtn.focus();
  };
  langBtn.addEventListener('click', (e) => { e.stopPropagation(); setLangOpen(langList.hidden); });
  langList.addEventListener('click', (e) => { const li = e.target.closest('[role="option"]'); if (li) chooseLang(li); });
  langList.addEventListener('keydown', (e) => {
    const o = langOpts(), i = o.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); o[(i + 1) % o.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); o[(i - 1 + o.length) % o.length].focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) chooseLang(o[i]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setLangOpen(false); langBtn.focus(); }
    else if (e.key === 'Tab') setLangOpen(false);
  });
  document.addEventListener('click', (e) => { if (!langList.hidden && !e.target.closest('#lang')) setLangOpen(false); });

  // ---------- Fullscreen date & time picker ----------
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const TIMES = []; for (let m = 6 * 60; m <= 21 * 60; m += 30) TIMES.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  const PK = { date: S.date, time: S.time, y: 0, m: 0, opener: null, step: 'date' };
  const renderPicker = () => {
    const first = new Date(PK.y, PK.m, 1), lead = (first.getDay() + 6) % 7, n = new Date(PK.y, PK.m + 1, 0).getDate();
    $('#picker').dataset.step = PK.step;
    $('#pkTitle').textContent = PK.step === 'date' ? 'Choose a date' : 'Choose a departure time';
    $('#pkMonth').textContent = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    $('#pkTimeH').textContent = fmtDate(PK.date, true);
    let html = '<span></span>'.repeat(lead);
    for (let d = 1; d <= n; d++) {
      const dt = new Date(PK.y, PK.m, d), k = iso(dt), past = dt < TODAY;
      html += `<button type="button" class="pk-cell pk-day${k === iso(TODAY) ? ' today' : ''}" data-pk-day="${k}" aria-pressed="${k === PK.date}"${past ? ' disabled' : ''} aria-label="${fmtDate(k, true)}">${d}</button>`;
    }
    $('#pkDays').innerHTML = html;
    $('[data-pk-month="-1"]').disabled = new Date(PK.y, PK.m, 1) <= new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    $('#pkTimes').innerHTML = TIMES.map((t) => `<button type="button" class="pk-cell pk-time" data-pk-time="${t}" aria-pressed="${t === PK.time}">${t}</button>`).join('');
    $('#pkSum').innerHTML = `<span class="muted">${PK.step === 'date' ? 'Date' : 'Departure time'}</span><b>${PK.step === 'date' ? fmtDate(PK.date) : PK.time}</b>`;
  };
  // Two separate screens: Date opens the calendar, Time opens the time slots
  const openPicker = (step, opener) => {
    PK.date = S.date; PK.time = S.time; PK.opener = opener; PK.step = step;
    const d = new Date(`${S.date}T12:00`); PK.y = d.getFullYear(); PK.m = d.getMonth();
    renderPicker();
    $('#picker').hidden = false; document.body.style.overflow = 'hidden';
    $('.pk-body').scrollTop = 0;
    setTimeout(() => {
      const el = step === 'time' ? $(`[data-pk-time="${PK.time}"]`) : $(`[data-pk-day="${PK.date}"]`);
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
    }, 30);
  };
  const closePicker = (apply) => {
    if (apply) { S.date = PK.date; S.time = PK.time; }
    $('#picker').hidden = true; document.body.style.overflow = '';
    if (apply) updateBooking();
    const back = PK.opener && $(`[data-pick="${PK.opener}"]`); if (back) back.focus();
  };
  $('#picker').addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-pk-close]')) return closePicker(false);
    if (t.closest('[data-pk-ok]')) return closePicker(true);
    const mo = t.closest('[data-pk-month]');
    if (mo && !mo.disabled) { PK.m += +mo.dataset.pkMonth; if (PK.m < 0) { PK.m = 11; PK.y--; } if (PK.m > 11) { PK.m = 0; PK.y++; } renderPicker(); return; }
    const dy = t.closest('[data-pk-day]');
    if (dy && !dy.disabled) { PK.date = dy.dataset.pkDay; renderPicker(); $(`[data-pk-day="${PK.date}"]`).focus(); return; }
    const tm = t.closest('[data-pk-time]');
    if (tm) { PK.time = tm.dataset.pkTime; renderPicker(); $(`[data-pk-time="${PK.time}"]`).focus(); }
  });

  // ---------- Events ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-home]')) { e.preventDefault(); goHome(); return; }
    if (t.closest('#fromBtn') || t.closest('#ddBtn')) {
      setDd(true);
      return;
    }
    if (t.closest('#fbClose')) { setDd(false); $('#fromBtn').focus(); return; }
    const pop = t.closest('[data-pop]');
    if (pop) { const [a, b] = pop.dataset.pop.split('-').map(Number); S.o = a; openDest(b); return; }
    if (t.closest('#goBtn')) { toGrid(); return;
    }
    const o = t.closest('[data-origin]');
    if (o) { if (justDragged) { justDragged = false; return; } const k = +o.dataset.origin; setDd(false); if (k !== S.o) { S.o = k; renderFrom(); renderCards(); } $('#fromBtn').focus({ preventScroll: true }); return; }
    const d = t.closest('[data-dest]');
    if (d) { openDest(+d.dataset.dest); return; }
    if (t.closest('[data-swap]')) {
      [S.o, S.m] = [S.m, S.o];
      history.replaceState({ m: S.m, o: S.o }, '');
      const y = window.scrollY; renderBooking(); window.scrollTo(0, y);
      const sw = $('[data-swap]'); if (sw) sw.focus({ preventScroll: true });
      return;
    }
    if (t.closest('[data-book]')) {
      S.tried = true;
      if (!Object.values(detailsOk()).every(Boolean)) {
        updateBooking();
        const bad = $('[aria-invalid="true"]');
        if (bad) { bad.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); bad.focus({ preventScroll: true }); }
        return;
      }
      S.sent = true; renderConfirm(); jumpTop(); return;
    }
    if (t.closest('[data-note-open]')) { S.noteOpen = true; updateBooking('#bkNote'); return; }
    const pick = t.closest('[data-pick]');
    if (pick) { openPicker(pick.dataset.pick, pick.dataset.pick); return; }
    const tier = t.closest('[data-tier]');
    if (tier) { S.tier = +tier.dataset.tier; updateBooking(`[data-tier="${S.tier}"]`); return; }
    const ex = t.closest('[data-extra]');
    if (ex) { const k = ex.dataset.extra; S[k] = !S[k]; updateBooking(`[data-extra="${k}"]`); return; }
    // Close the origin picker when clicking elsewhere
    if (S.dd && !t.closest('#origins')) setDd(false);
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-note]')) S.note = e.target.value;
    if (e.target.matches('[data-detail]')) { S.details[e.target.dataset.detail] = e.target.value; if (S.tried) e.target.toggleAttribute('aria-invalid', !detailsOk()[e.target.dataset.detail]); }
  });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-cc]')) { S.details.cc = e.target.value; updateBooking('[data-cc]'); } });
  document.addEventListener('change', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    if (f) S[f] = e.target.value;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#picker').hidden) { closePicker(); return; }
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

  // ---------- Hero: one benefit at a time ----------
  const BENEFITS = ['No road traffic', 'Leave when you want', 'One price per boat', 'Luggage on board'];
  const hrot = $('#hrot');
  if (hrot) {
    let bi = 0;
    setInterval(() => {
      if (document.hidden || $('#home').hidden) return;
      bi = (bi + 1) % BENEFITS.length;
      if (reduced) { hrot.textContent = BENEFITS[bi]; return; }
      hrot.classList.add('out');
      setTimeout(() => {
        hrot.textContent = BENEFITS[bi];
        hrot.classList.remove('out'); hrot.classList.add('pre');
        void hrot.offsetWidth; // restart the transition from below
        hrot.classList.remove('pre');
      }, 300);
    }, 2600);
  }

  // ---------- Init ----------
  renderHC();
  renderPop();
  showView();
})();
