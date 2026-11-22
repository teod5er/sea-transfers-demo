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
    // Full "Liberty" map (land cover, parks, roads, buildings, relief, water) with every text/icon layer removed
    st.layers = st.layers.filter((l) => l.type !== 'symbol' && l.type !== 'fill-extrusion' && !/^boundary/.test(l.id));
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
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 8 } });
      map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': DARK, 'line-width': 4 } });
      map.addSource('pins', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ ...ptData(coords[0]), properties: { k: 'a' } }, { ...ptData(coords[coords.length - 1]), properties: { k: 'z' } }] } });
      map.addLayer({ id: 'pins', type: 'circle', source: 'pins', paint: {
        'circle-radius': ['match', ['get', 'k'], 'z', 9, 7], 'circle-color': ['match', ['get', 'k'], 'z', DARK, '#fff'],
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
  const S = { o: 2, m: null, tier: 0, ret: false, swim: false, dd: false, stuck: false, date: '2027-06-14', time: '14:00', note: '', noteOpen: false, flight: null, pick: null, drop: null, pinEdit: null, tried: false, sent: false, details: { first: '', last: '', email: '', phone: '', cc: 'HR' } };
  const isBooking = () => S.m !== null && S.m !== S.o;

  // ---------- Home ----------
  const renderFrom = () => {
    const from = D[S.o];
    $('#fromName').textContent = from.name;
    $('#fromImg').src = from.img;
    $('#fromBtn').setAttribute('aria-label', `Going from ${from.name}. Change starting point`);
    // flight segment shows the flight once it's added
    const fv = $('#fbFlightV'), fb = $('.fb-fl');
    if (fv) { fv.textContent = S.flight ? `${S.flight.code} · lands ${S.flight.time}` : 'Start with your flight number'; fb.classList.toggle('on', !!S.flight); fb.setAttribute('aria-label', S.flight ? `Flight ${S.flight.code}, lands ${S.flight.time}. Change flight` : 'Start with your flight number'); }
  };

  const renderOrigins = () => {
    $('#origin-panel').innerHTML = D.map((x, k) => `
      <button type="button" class="ocard" data-origin="${k}" aria-pressed="${k === S.o}" style="animation-delay:${80 + k * 55}ms">
        <span class="osq"><img src="${x.img}" alt="" draggable="false"></span>
        <span class="t-14 oname">${esc(x.name)}</span>
      </button>`).join('');
  };

  const renderCards = () => {
    const from = D[S.o];
    const list = D.map((x, k) => ({ x, k })).filter((e) => e.k !== S.o);
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
    const fbar = $('#frombar');
    fbar.classList.toggle('open', open);
    $('#origins').classList.toggle('ddopen', open);
    $('#fromBtn').setAttribute('aria-expanded', String(open));
    $('#fbGallery').setAttribute('aria-hidden', String(!open));
    $('#fbClose').tabIndex = open ? 0 : -1;
    if (open) {
      const cur = $(`[data-origin="${S.o}"]`, $('#origin-panel'));
      setTimeout(() => { if (cur) cur.focus({ preventScroll: true }); }, 60);
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
  let lastY = window.scrollY;
  const onScroll = () => {
    const fab = $('.fab'), y = window.scrollY;
    if (fab && Math.abs(y - lastY) > 6) { fab.classList.toggle('hide', y > lastY && y > 120); lastY = y; }
    if (isBooking()) { const bh = $('#bkHead'); if (bh) bh.classList.toggle('scrolled', window.scrollY > $('#topbar').offsetHeight); return; } // same size; only the dropdown buttons hide once pinned
    const el = $('#origins'), h = $('.hero');
    // the bar scrolls away with the page; a compact copy pins to the top only once the bar is fully off screen
    if (el && h && !S.dd) stickAt(el, true, el.offsetTop + el.offsetHeight);
    S.stuck = el && el.classList.contains('stuck');
    // past the destination cards: tuck the "Going from" bar away and bring back the main nav, fixed on top
    const g = $('#grid'), nav = $('#topbar');
    if (g && nav && !S.dd) {
      const end = g.offsetTop + g.offsetHeight - 120, on = el.classList.contains('away');
      const want = on ? window.scrollY > end - 48 : window.scrollY > end;
      if (want !== on) {
        el.classList.toggle('away', want);
        nav.classList.toggle('nav-fixed', want);
        nav.classList.toggle('over', !want);
      }
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

  // Booking: plain sections, all open; the price + Book bar stays at the bottom
  const detailsOk = () => {
    const d = S.details;
    return { first: !!d.first.trim(), last: !!d.last.trim(), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()), phone: d.phone.replace(/\D/g, '').length >= 6 };
  };
  // The trip page is one simple, numbered flow:
  // 1 When  2 Boat  3 Where we meet you  4 Extras (optional)  5 Your details  → Send request
  const step = (n, key, title, hint, body) => `
        <section class="step" data-sec="${key}">
          <div class="step-h"><span class="step-n" aria-hidden="true">${n}</span><div><h2 class="step-t">${title}</h2>${hint ? `<p class="step-hint">${hint}</p>` : ''}</div></div>
          ${body}
        </section>`;
  const optsHTML = (r, from, to, part) => {
    const { retPrice } = prices(r);
    const ok = detailsOk(), d = S.details;
    const input = (k, label, type, auto, extra = '') => `
            <label class="field">${label}<input type="${type}" autocomplete="${auto}" data-detail="${k}" value="${esc(d[k])}"${S.tried && !ok[k] ? ' aria-invalid="true"' : ''}${extra}></label>`;
    const check = (on) => `<span class="ck${on ? ' on' : ''}" aria-hidden="true">${on ? CHECK : ''}</span>`;
    if (part === 'a') return `
      <div id="bkOptsA">
        ${step(1, 'when', 'When do you want to go?', '', `
          <div class="dt-grid">
            <div class="field"><span>Date</span><button type="button" class="pick-btn" data-pick="date">${fmtDate(S.date)}</button></div>
            <div class="field"><span>Time</span><button type="button" class="pick-btn" data-pick="time">${S.time}</button></div>
          </div>`)}
        ${step(2, 'boat', 'Which boat?', 'Every boat comes with a skipper. The price is for the whole boat.', `
          <div class="choice-list" role="radiogroup" aria-label="Boat">
            ${BOATS.map((b, j) => { const on = j === S.tier; return `
            <button type="button" class="opt choice" role="radio" data-tier="${j}" aria-checked="${on}" aria-pressed="${on}">
              <img src="${b.img}" alt="">
              <span class="choice-t"><b>${b.name}</b><span class="choice-tags">${b.why.map((w) => `<span class="tag">${esc(w)}</span>`).join('')}</span></span>
              <span class="choice-p">${r[1] + b.add} €</span>
              <span class="radio${on ? ' on' : ''}" aria-hidden="true"></span>
            </button>`; }).join('')}
          </div>`)}
      </div>`;
    return `
      <div id="bkOptsB">
        ${step(4, 'extras', 'Anything extra?', 'Optional. Tick what you’d like.', `
          <div class="choice-list">
            <button type="button" class="opt choice extra" data-extra="ret" aria-pressed="${S.ret}">${check(S.ret)}<span class="choice-t"><b>Return trip</b><span class="muted">${esc(to.name)} → ${esc(from.name)}, any date · 10% off</span></span><span class="choice-p">+${retPrice} €</span></button>
            <button type="button" class="opt choice extra" data-extra="swim" aria-pressed="${S.swim}">${check(S.swim)}<span class="choice-t"><b>Swim stop on the way</b><span class="muted">About 45 minutes in a quiet bay</span></span><span class="choice-p">+${SWIM_PRICE} €</span></button>
          </div>`)}
        ${step(5, 'details', 'Your details', 'So we can confirm your trip by email and WhatsApp.', `
          <div class="det-grid">${input('first', 'First name', 'text', 'given-name')}${input('last', 'Last name', 'text', 'family-name')}${input('email', 'Email', 'email', 'email')}
            <div class="field"><label for="bkPhone">Phone (WhatsApp)</label>
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
          ${S.tried && !Object.values(ok).every(Boolean) ? '<p class="det-err" role="alert">Please fill in the fields marked in red.</p>' : ''}
          ${(S.noteOpen || S.note.trim()) ? `
          <label class="field" for="bkNote">Message for the skipper (optional)
            <textarea class="note" id="bkNote" data-note rows="3" placeholder="Flight number, luggage, kids…">${esc(S.note)}</textarea></label>`
          : '<button type="button" class="linkbtn" data-note-open>+ Add a message for the skipper</button>'}`)}
      </div>`;
  };


  const barHTML = (r) => {
    const T = BOATS[S.tier];
    const when = new Date(`${S.date}T${S.time || '00:00'}`);
    const whenTxt = isNaN(when) ? '' : ` · ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${S.time}`;
    return `
      <div class="bk-bar" id="bkBar">
        <div class="wrap bk-bar-in">
          <img class="bk-boat" src="${T.img}" alt="${esc(T.name)} boat, ${esc(T.model)}">
          <span class="bk-sum"><span class="t-16 fw500">${T.name} boat${whenTxt}</span><span class="t-14 muted">Nothing is booked yet. We check availability and confirm by email and WhatsApp.</span></span>
          <div class="bk-act">
            <span class="bk-total" aria-live="polite">${prices(r).total} €</span>
            ${`<button type="button" class="gobtn bk-book" data-book>Send request<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`}
          </div>
        </div>
      </div>`;
  };



  // Last screen: confirmation of the request
  const renderConfirm = () => {
    const from = D[S.o], to = D[S.m], r = route(from, to), T = BOATS[S.tier], { total } = prices(r), d = S.details;
    const row = (k, v) => `<div class="cf-row"><dt>${k}</dt><dd>${v}</dd></div>`;
    $('#booking').innerHTML = `
      <section class="cf-band fade" aria-labelledby="cfTitle"><div class="wrap cf">
        <span class="cf-ok" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg></span>
        <h1 class="cf-title" id="cfTitle" tabindex="-1">Request sent</h1>
        <p class="cf-sub">Thanks, ${esc(d.first)}. We’ll confirm by email and WhatsApp.</p>
        <div class="box cf-card">
          <p class="cf-route-t">${esc(from.name)} → ${esc(to.name)}</p>
          <dl class="cf-list">
            ${row('When', `${fmtDate(S.date)} · ${S.time}`)}
            ${row('Boat', T.name)}
            ${S.flight ? row('Flight', `${esc(S.flight.code)} · ${S.flight.dir === 'arr' ? 'lands' : 'leaves'} ${S.flight.time}`) : ''}
            ${S.pick || S.drop ? row('Pins', [S.pick && 'pickup', S.drop && 'drop-off'].filter(Boolean).join(' and ') + ' set on the map') : ''}
            ${row('Total', `${total} € per boat`)}
          </dl>
          <p class="cf-pay-now"><b>Nothing to pay now.</b> You pay once we’ve confirmed your transfer.</p>
        </div>
        <button type="button" class="gobtn cf-home" data-home>Back to Sea Transfers</button>
      </div></section>`;
    dropBkMaps();
    $('#topbar').classList.add('on-blue');
    setTimeout(() => { const t = $('#cfTitle'); if (t) t.focus({ preventScroll: true }); }, 50);
  };

  // ---------- Pickup & drop-off: two separate maps, one per end of the trip ----------
  // Default is the pier. Drag the pin or tap the map to choose the exact spot (a beach, a hotel jetty, a yacht).
  const PIN_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const PINS = { pick: { label: 'Pickup', verb: 'pick you up' }, drop: { label: 'Drop-off', verb: 'drop you off' } };
  const pinPort = (k) => (k === 'pick' ? D[S.o] : D[S.m]);
  const pierLL = (k) => { const p = seaRoute(S.o, S.m); const e = k === 'pick' ? p[0] : p[p.length - 1]; return [e[1], e[0]]; };
  // Meeting points: two maps in containers (pickup, drop-off), each with a pin on the pier that can be dragged
  const meetItem = (k) => `
      <div class="meet-box" data-pinbox="${k}">
        <div class="pinbox-map" id="pinMap-${k}" role="application" aria-label="${PINS[k].label} in ${esc(pinPort(k).name)}: drag the pin or tap the map to choose the spot"></div>
        <span class="meet-tag">${PINS[k].label} · ${esc(pinPort(k).name)}</span>
      </div>`;
  let bkMaps = [];
  const pinMarkers = {};
  const dropBkMaps = () => { bkMaps.forEach((m) => m.remove()); bkMaps = []; Object.keys(pinMarkers).forEach((k) => delete pinMarkers[k]); };
  const pinEl = (k) => { const e = document.createElement('div'); e.className = `pinm pinm-${k}`; e.innerHTML = `${PIN_SVG}<span>${PINS[k].label}</span>`; return e; };
  const buildPinMap = (k, st) => {
    const el = $(`#pinMap-${k}`); if (!el) return;
    const mobile = window.matchMedia('(max-width: 640px)').matches, at = S[k] || pierLL(k);
    const map = new maplibregl.Map({ container: el, style: structuredClone(st), center: at, zoom: 14.5, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, touchPitch: false });
    map.scrollZoom.disable(); map.touchZoomRotate.disableRotation(); if (mobile) map.dragPan.disable();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const mk = new maplibregl.Marker({ element: pinEl(k), anchor: 'bottom', draggable: true }).setLngLat(at).addTo(map);
    mk.on('dragend', () => { const p = mk.getLngLat(); S[k] = [p.lng, p.lat]; });
    map.on('click', (e) => { mk.setLngLat(e.lngLat); S[k] = [e.lngLat.lng, e.lngLat.lat]; });
    pinMarkers[k] = { map, mk };
    bkMaps.push(map);
  };
  const initHero = () => {
    dropBkMaps();
    if (!window.maplibregl || !$('#pinMap-pick')) return;
    const key = `${S.o}-${S.m}`;
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    mapStyle().then((st) => {
      if (`${S.o}-${S.m}` !== key || !isBooking()) return;
      const hero = $('#bkMap');
      if (hero) bkMaps.push(makeMap(hero, seaRoute(S.o, S.m), st, { interactive: true, padding: mobile ? 32 : 64, boat: true, attribution: true }));
      buildPinMap('pick', st); buildPinMap('drop', st);
    });
  };

  // ---------- Flight number: fills date, time and the airport end of the trip ----------
  // DEMO ONLY: lookupFlight() makes up a plausible schedule from the flight number. Replace it with a real
  // flight-status API (e.g. AeroDataBox, FlightAware) before going live.
  const AIRLINES = { EZY: 'easyJet', U2: 'easyJet', RYR: 'Ryanair', FR: 'Ryanair', CTN: 'Croatia Airlines', OU: 'Croatia Airlines', BAW: 'British Airways', BA: 'British Airways', DLH: 'Lufthansa', LH: 'Lufthansa', EWG: 'Eurowings', EW: 'Eurowings', AUA: 'Austrian', OS: 'Austrian', SWR: 'Swiss', LX: 'Swiss', KLM: 'KLM', KL: 'KLM', AFR: 'Air France', AF: 'Air France', WZZ: 'Wizz Air', W6: 'Wizz Air', VLG: 'Vueling', VY: 'Vueling', TRA: 'Transavia', HV: 'Transavia', EXS: 'Jet2', LS: 'Jet2', SAS: 'SAS', SK: 'SAS', NAX: 'Norwegian', DY: 'Norwegian' };
  const CITIES = ['London', 'Manchester', 'Frankfurt', 'Munich', 'Vienna', 'Zurich', 'Amsterdam', 'Paris', 'Oslo', 'Stockholm', 'Warsaw', 'Zagreb', 'Rome', 'Dublin', 'Brussels', 'Copenhagen'];
  const lookupFlight = (raw) => {
    const code = raw.toUpperCase().replace(/\s+/g, '');
    const m = /^([A-Z]{3}|[A-Z0-9]{2})(\d{1,4}[A-Z]?)$/.exec(code);
    if (!m) return null;
    let hsh = 0; for (const ch of code) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const mins = 7 * 60 + (hsh % (14 * 12)) * 5; // somewhere between 07:00 and 20:55
    return { code: `${m[1]} ${m[2]}`, airline: AIRLINES[m[1]] || 'Airline', city: CITIES[hsh % CITIES.length], time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, mins };
  };
  // round to the 30-minute slots of the time picker, keep within 06:00–21:00
  const toSlot = (m) => { const s = Math.min(Math.max(Math.ceil(m / 30) * 30, 6 * 60), 21 * 60); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  let flFound = null;
  const openFlight = (pop) => {
    // pop = small popup bottom-right (home); otherwise fullscreen (trip page)
    $('#flight').classList.toggle('pop', !!pop);
    flFound = null; $('#flRes').innerHTML = ''; $('#flErr').hidden = true; $('#flGo').textContent = 'Find flight';
    $('#flInput').value = S.flight ? S.flight.code : '';
    $('#flight').hidden = false; if (!pop) document.body.style.overflow = 'hidden';
    setTimeout(() => $('#flInput').focus(), 30);
  };
  const closeFlight = () => {
    $('#flight').hidden = true; document.body.style.overflow = '';
    const b = $('.fb-fl'); if (b && !isBooking()) b.focus({ preventScroll: true });
  };
  const findFlight = () => {
    const f = lookupFlight($('#flInput').value);
    $('#flErr').hidden = !!f;
    if (!f) { flFound = null; $('#flRes').innerHTML = ''; $('#flGo').textContent = 'Find flight'; return; }
    // Going to the airport = departing flight; otherwise the flight lands at Split Airport
    const dir = isBooking() && S.m === 0 ? 'dep' : 'arr';
    const pickup = dir === 'arr' ? toSlot(f.mins + 45) : toSlot(f.mins - 120 - route(D[S.o], D[0])[0]);
    flFound = { ...f, dir, pickup };
    $('#flRes').innerHTML = `
      <div class="box fl-card">
        <span class="fl-code">${esc(f.code)} <span class="muted">${esc(f.airline)}</span></span>
        <span class="fl-route">${dir === 'arr' ? `${esc(f.city)} → Split Airport` : `Split Airport → ${esc(f.city)}`}</span>
        <dl class="cf-list">
          <div class="cf-row"><dt>${dir === 'arr' ? 'Lands' : 'Takes off'}</dt><dd>${fmtDate(S.date)} · ${f.time}</dd></div>
          <div class="cf-row"><dt>Your boat</dt><dd>${dir === 'arr' ? `${pickup} from the airport pier, 45 min after landing` : `${pickup}, in time for check-in`}</dd></div>
        </dl>
        <p class="fl-demo">Demo: flight times are simulated.</p>
      </div>`;
    $('#flGo').textContent = 'Use this flight';
  };
  const useFlight = () => {
    const f = flFound;
    S.flight = { code: f.code, city: f.city, time: f.time, dir: f.dir };
    S.time = f.pickup;
    $('#flight').hidden = true; document.body.style.overflow = '';
    if (!isBooking()) { // home: start from Split Airport, then pick a destination
      S.o = 0; renderFrom(); renderCards(); toGrid();
      return;
    }
    if (f.dir === 'arr' && S.o !== 0) { S.o = 0; if (S.m === 0) S.m = 2; history.replaceState({ m: S.m, o: S.o }, ''); }
    const y = window.scrollY; renderBooking(); window.scrollTo(0, y);
    const b = $('[data-fl-open]'); if (b) b.focus({ preventScroll: true });
  };
  $('#flight').addEventListener('click', (e) => {
    if (e.target.closest('[data-fl-close]')) return closeFlight();
    if (e.target.closest('[data-fl-go]')) return flFound ? useFlight() : findFlight();
  });
  $('#flForm').addEventListener('submit', (e) => { e.preventDefault(); flFound ? useFlight() : findFlight(); });
  $('#flInput').addEventListener('input', () => { if (flFound) { flFound = null; $('#flRes').innerHTML = ''; $('#flGo').textContent = 'Find flight'; } });

  const renderBooking = () => {
    const from = D[S.o], to = D[S.m], r = route(from, to);
    $('#booking').innerHTML = `
      <!-- Sticky trip header, built like the home page's "Going from" bar -->
      <header class="bk-head" id="bkHead">
        <div class="wrap bk-head-in">
          <!-- Same search-style field as the home page: From | To, each with photo, label, port and Change -->
          <div class="bk-pickwrap">
            <h1 class="sr-only">${esc(from.name)} to ${esc(to.name)}</h1>
            <div class="fb-search bk-search">
              <button type="button" class="fb-seg" data-pm="from" aria-haspopup="listbox" aria-expanded="false" aria-label="From ${esc(from.name)}. Change starting point">
                <span class="fthumb"><img src="${from.img}" alt=""></span>
                <span class="fb-seg-t"><span class="fb-seg-l">From</span><span class="fromname">${esc(from.name)}</span></span>
                <span class="fb-seg-cta" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
              </button>
              <button type="button" class="fb-seg" data-pm="to" aria-haspopup="listbox" aria-expanded="false" aria-label="To ${esc(to.name)}. Change destination">
                <span class="fthumb"><img src="${to.img}" alt=""></span>
                <span class="fb-seg-t"><span class="fb-seg-l">To <span class="fb-opt">${hm(r[0])} by boat</span></span><span class="fromname">${esc(to.name)}</span></span>
                <span class="fb-seg-cta" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
              </button>
              <button type="button" class="bk-swap" data-swap aria-label="Swap start and destination"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/></svg></button>
            </div>
            <ul class="pm" id="pm" role="listbox" hidden></ul>
          </div>
        </div>
      </header>
      <!-- Hero: animated route map (the line draws in, then a boat sails it) -->
      <section class="wrap bk-mapsec">
        <div class="bk-hero"><div class="bk-map" id="bkMap" role="img" aria-label="${esc(`Map of the sea route from ${from.name} to ${to.name}`)}"></div></div>
      </section>
      <section class="wrap bk-main">
        ${optsHTML(r, from, to, 'a')}
        ${step(3, 'meet', 'Where do we meet you?', 'At the pier. To be picked up or dropped off somewhere else, drag the pin.', `
          <div class="meet">${meetItem('pick')}${meetItem('drop')}</div>`)}
        ${optsHTML(r, from, to, 'b')}
      </section>
      ${barHTML(r)}`;
    initHero();
  };

  // Re-render only the choices and the bar, so the route animation doesn't replay and focus stays put
  const updateBooking = (focusSel) => {
    const from = D[S.o], to = D[S.m], r = route(from, to);
    const swap = (sel, html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); $(sel).replaceWith(t.firstElementChild); };
    swap('#bkOptsA', optsHTML(r, from, to, 'a'));
    swap('#bkOptsB', optsHTML(r, from, to, 'b'));
    swap('#bkBar', barHTML(r));
    if (focusSel) { const f = $(focusSel, $('#booking')); if (f) f.focus({ preventScroll: true }); }
  };

  // ---------- View switching ----------
  const showView = () => {
    const bk = isBooking();
    $('#home').hidden = bk;
    $('#booking').hidden = !bk;
    $('#topbar').classList.remove('nav-fixed'); const og = $('#origins'); if (og) og.classList.remove('away');
    $('#topbar').classList.toggle('over', !bk); // white nav bar with the logo on the trip page
    $('#topbar').classList.remove('on-blue');
    if (!bk) dropBkMaps();
    if (bk) renderBooking(); else { renderFrom(); renderCards(); }
  };

  const goHome = () => { S.m = null; showView(); jumpTop(); };
  const openDest = (k) => { S.m = k; S.tier = 0; S.ret = false; S.swim = false; S.pick = null; S.drop = null; S.pinEdit = null; S.tried = false; S.sent = false; setDd(false); history.pushState({ m: k, o: S.o }, ''); showView(); jumpTop(); };
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

  // ---------- Trip page: change start or destination from the header ----------
  let pmMode = null;
  const closePM = (focus) => {
    const pm = $('#pm'); if (!pm || pm.hidden) return;
    pm.hidden = true; document.querySelectorAll('[data-pm]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (focus) { const b = $(`[data-pm="${pmMode}"]`); if (b) b.focus(); }
    pmMode = null;
  };
  const openPM = (mode) => {
    const pm = $('#pm'); if (!pm) return;
    if (pmMode === mode) return closePM(true);
    pmMode = mode;
    const cur = mode === 'from' ? S.o : S.m, other = mode === 'from' ? S.m : S.o;
    pm.className = `pm pm-${mode}`;
    pm.setAttribute('aria-label', mode === 'from' ? 'Starting point' : 'Destination');
    pm.innerHTML = D.map((x, k) => k === other ? '' : `
      <li role="option" aria-selected="${k === cur}"><button type="button" class="pm-row" data-pm-pick="${k}">
        <img src="${x.img}" alt=""><span class="pm-txt"><b>${esc(x.name)}</b><span class="muted">${esc(x.pier)}</span></span>${k === cur ? CHECK : ''}
      </button></li>`).join('');
    pm.hidden = false;
    document.querySelectorAll('[data-pm]').forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.pm === mode)));
    const sel = pm.querySelector('[aria-selected="true"] button') || pm.querySelector('button'); if (sel) sel.focus();
  };
  const pickPM = (k, row) => {
    const mode = pmMode; closePM(false);
    if (mode === 'from') S.o = k; else S.m = k;
    history.replaceState({ m: S.m, o: S.o }, '');
    const y = window.scrollY; renderBooking(); window.scrollTo(0, y);
    const b = $(`[data-pm="${mode}"]`); if (b) b.focus({ preventScroll: true });
  };

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
    const o = t.closest('[data-origin]');
    if (o) {
      if (justDragged) { justDragged = false; return; }
      const k = +o.dataset.origin;
      // pick: close and show the new port straight away (no animation)
      setTimeout(() => {
        setDd(false);
        if (k !== S.o) { S.o = k; renderFrom(); renderCards(); }
        $('#fromBtn').focus({ preventScroll: true });
      }, 0);
      return;
    }
    const d = t.closest('[data-dest]');
    if (d) { openDest(+d.dataset.dest); return; }
    const pmb = t.closest('[data-pm]');
    if (pmb) { openPM(pmb.dataset.pm); return; }
    const pmp = t.closest('[data-pm-pick]');
    if (pmp) { pickPM(+pmp.dataset.pmPick, pmp); return; }
    if (pmMode && !t.closest('#pm')) closePM(false);
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
    const flo = t.closest('[data-fl-open]');
    if (flo) { openFlight(flo.hasAttribute('data-fl-pop')); return; }
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
    if (!$('#flight').hidden) { closeFlight(); return; }
    if (pmMode) { closePM(true); return; }
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
    new IntersectionObserver(([en]) => why.classList.toggle('offscreen', !en.isIntersecting)).observe(why); // (no longer on the page)
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

  // ---------- Office map: built when it scrolls into view ----------
  const OFFICE = [16.4416, 43.1721]; // Riva 13, Hvar (approx.)
  const officeEl = $('#officeMap');
  if (officeEl && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || !window.maplibregl) return;
      io.disconnect();
      mapStyle().then((st) => {
        const m = new maplibregl.Map({ container: officeEl, style: structuredClone(st), center: OFFICE, zoom: 15.5, interactive: false, attributionControl: { compact: true } });
        const pin = document.createElement('div'); pin.className = 'office-pin'; pin.setAttribute('aria-hidden', 'true');
        new maplibregl.Marker({ element: pin }).setLngLat(OFFICE).addTo(m);
      });
    }, { rootMargin: '200px' });
    io.observe(officeEl);
  }

  // ---------- Init ----------
  renderHC();
  showView();
})();
