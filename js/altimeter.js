/* Radar Altimeter — Mission 04 · Radar Altimeter Display
   The win condition IS the concept: you only win by doing  distance = speed × time ÷ 2  (down and back),
   correcting for the speed of sound, and reading a cockpit display, just like the Arduino code. */
(function () {
  'use strict';
  const { h, clamp, fmt } = AC;
  const E = window.ECHO;
  AC.boot({ game: 'altimeter', week: 4, topic: 'Radar Altimeter Display', title: 'Radar Altimeter', help: () => help() });

  const stage = document.getElementById('stage');
  const cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block', touchAction: 'none' } });
  stage.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 800, H = 600;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth || innerWidth; H = stage.clientHeight || innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

  // ---------------------------------------------------------------- state
  // h = true height in cm, vs = vertical speed cm/s (negative = descending)
  const F = { h: 100, vs: 0, tempC: 20, cal: 0.0343, lcd: true, flare: false, flared: false, landed: false, mode: 'echo' };
  let t = 0, ping = 0, lastReading = 0, readA = 0, readB = 0, readClock = 0;
  const hud = AC.ui.hud();
  hud.section('Sensor').row('echo', 'Echo time', '--').row('sound', 'Speed of sound', '--').row('cal', 'cm per µs in code', '--').row('read', 'LCD reads', '--').row('true', 'True height', '--');
  hud.section('Maths').formula('f', 'height = cm/µs × time ÷ 2');
  const lcdBox = (txt) => txt;
  let panelEls = [];

  // ---------------------------------------------------------------- missions
  const missions = [
    {
      id: 'echo', title: 'Time the Echo', objective: 'Use d = v × t ÷ 2 to find each height, fly there and press Space to check',
      story: 'The sensor pings and the echo comes back after a number of microseconds. The tower gives you the echo time. Work out the height with the speed of sound (0.0343 cm per µs), move the aircraft to that height with ↑ ↓ and press Space to check.',
      learn: [
        { t: 'Speed of sound', p: '343 m/s in 20 °C air, written in the units we need.', f: '343 m/s = 0.0343 cm/µs' },
        { t: 'Round trip', p: 'The sound goes DOWN and back UP, so halve the distance.', f: 'height = 0.0343 × t ÷ 2' },
        { t: 'Worked example', p: 'An echo of 5830 µs.', f: '0.0343 × 5830 = 200 cm → 100 cm' },
      ],
      controls: ['<kbd>↑</kbd><kbd>↓</kbd> move the aircraft', '<kbd>Shift</kbd> fine', '<kbd>Space</kbd> check my answer'],
      proved: 'The echo timed the round trip, so the height is half of speed × time. 5830 µs → 200 cm there and back → 100 cm. That is the same line of code you will paste into the Arduino.',
      tip: 'Do not forget to divide by 2! The sound travels down AND back up. 5830 × 0.0343 = 200 cm is the whole trip, not the height.',
      quiz: AC.QUESTIONS.find((q) => q.id === 'a-half'),
      start(api) {
        Object.assign(F, { mode: 'echo', h: 160, vs: 0, tempC: 20, cal: 0.0343, lcd: false, landed: false });
        api.state.targets = [5830, 11660, 2915]; api.state.i = 0; api.state.miss = 0;
        api.objective('Echo time ' + api.state.targets[0] + ' µs: what height is that?');
      },
      update(dt, api) {
        const st = api.state;
        api.progress(st.i / 3, 'Target ' + (st.i + 1) + ' of 3 · wrong checks: ' + st.miss);
        F.echo = st.targets[st.i];
      },
      onCheck(api) {
        const st = api.state, truth = (st.targets[st.i] * 0.0343) / 2;
        if (Math.abs(F.h - truth) <= 2.5) {
          AC.audio.good(); AC.fact(st.targets[st.i] + ' µs', fmt(st.targets[st.i], 0) + ' × 0.0343 ÷ 2 = ' + fmt(truth, 0) + ' cm', { tag: 'Maths check', color: 'var(--magenta)', ms: 5000 });
          st.i++;
          if (st.i >= 3) return api.win(st.miss === 0 ? 3 : st.miss <= 2 ? 2 : 1, 'All three heights found with ' + st.miss + ' wrong check' + (st.miss === 1 ? '' : 's') + '.');
          api.objective('Echo time ' + st.targets[st.i] + ' µs: what height is that?');
        } else { st.miss++; AC.audio.bad(); AC.ui.toast('Not yet. Remember: sound goes down AND back up (÷ 2).', 'var(--amber)'); }
      },
    },
    {
      id: 'hot', title: 'Hot Day Calibration', objective: 'The speed of sound changes with temperature. Set the code constant so the LCD reads the true height',
      story: 'It is 35 °C in Kampala. Sound is faster than the 343 m/s your code assumes, so the LCD reads LOW. Work out the real speed of sound, convert it to cm per µs, and adjust the constant until the LCD matches the true height. Then do the same on a cold 5 °C morning.',
      learn: [
        { t: 'Sound and temperature', p: 'Warmer air: faster sound.', f: 'v ≈ 331 + 0.6 × T' },
        { t: '35 °C', p: 'The speed of sound that afternoon.', f: '331 + 0.6 × 35 = 352 m/s' },
        { t: 'The constant', p: 'Convert m/s to cm per µs: divide by 10 000.', f: '352 m/s = 0.0352 cm/µs' },
      ],
      controls: ['<kbd>↑</kbd><kbd>↓</kbd> change the constant', '<kbd>Shift</kbd> fine'],
      proved: 'A sensor calibrated for 20 °C reads about 2.6% low on a 35 °C day (343 ÷ 352 = 0.974). Real altimeters avoid the problem by using radio waves at 300 000 000 m/s, which do not care about air temperature.',
      tip: 'v = 331 + 0.6 × 35 = 352 m/s. Divide by 10 000 to get cm/µs: 0.0352. On the cold day: 331 + 0.6 × 5 = 334 m/s → 0.0334.',
      start(api) {
        Object.assign(F, { mode: 'hot', h: 200, vs: 0, tempC: 35, cal: 0.0343, lcd: true, landed: false });
        api.state.i = 0; api.state.hold = 0; api.objective('35 °C: set the constant so the LCD reads the true height');
      },
      update(dt, api) {
        const st = api.state, v = E.soundSpeed(F.tempC), read = E.readCm(E.echoUs(F.h, v), F.cal);
        const ok = Math.abs(read - F.h) <= 1;
        st.hold = ok ? st.hold + dt : 0;
        api.progress((st.i + clamp(st.hold / 1.5, 0, 1)) / 2, ok ? 'LCD matches: hold it' : 'Reads ' + read + ' cm, true ' + fmt(F.h, 0) + ' cm');
        if (st.hold >= 1.5) {
          AC.audio.good(); st.i++; st.hold = 0;
          if (st.i >= 2) return api.win(api.t < 40 ? 3 : api.t < 90 ? 2 : 1, 'Both temperatures calibrated in ' + fmt(api.t) + ' s.');
          Object.assign(F, { tempC: 5, h: 150, cal: 0.0343 }); api.objective('5 °C (cold morning): calibrate again'); AC.ui.toast('It cooled down to 5 °C!', 'var(--cyan)');
        }
      },
    },
    {
      id: 'descent', title: 'Steady Descent', objective: 'Descend at 25 to 45 cm/s for 5 seconds, working the rate out from the LCD readings',
      story: 'A smooth landing needs a steady descent rate. The radar altimeter only gives you height, so work out your descent rate from two readings: rate = (height before − height now) ÷ time between readings. Keep it between 25 and 45 cm/s.',
      learn: [
        { t: 'Rate of change', p: 'Compare two readings taken a known time apart.', f: 'rate = Δheight ÷ Δtime' },
        { t: 'Example', p: '248 cm then 233 cm, 0.5 s apart.', f: '15 ÷ 0.5 = 30 cm/s' },
        { t: 'Why steady?', p: 'Too fast and the landing is hard. Too slow and you run out of runway.', f: '25 to 45 cm/s' },
      ],
      controls: ['<kbd>↓</kbd> descend faster', '<kbd>↑</kbd> descend slower', '<kbd>R</kbd> reveal the rate (loses a star)'],
      proved: 'Descent rate = change in height ÷ time. 15 cm in 0.5 s is 30 cm/s. Pilots do this in their heads, and an autopilot does it 100 times a second.',
      tip: 'Take two readings 0.5 s apart, subtract, then multiply by 2 for cm/s. If the rate is over 45, press ↑ to slow down.',
      start(api) {
        Object.assign(F, { mode: 'descent', h: 330, vs: 0, tempC: 20, cal: 0.0343, lcd: true, landed: false });
        Object.assign(api.state, { ok: 0, revealed: false }); readA = 330; readB = 330; readClock = 0;
      },
      update(dt, api) {
        const st = api.state, rate = -F.vs;
        const inWin = rate >= 25 && rate <= 45;
        st.ok = inWin ? st.ok + dt : st.ok;
        api.progress(st.ok / 5, inWin ? 'In the window ✓' : 'Rate ' + (st.revealed ? fmt(rate, 0) + ' cm/s' : '? cm/s'));
        if (F.h <= 5) { F.landed = true; return api.fail('You reached the ground before holding the rate for 5 s. Start descending sooner, and slowly.'); }
        if (rate > 90) return api.fail('Descent rate over 90 cm/s: that would be a very hard landing.');
        if (st.ok >= 5) api.win(st.revealed ? 2 : 3, 'Steady descent held for 5 s' + (st.revealed ? ' (you used the rate display).' : ' using only the readings. Excellent.'));
      },
    },
    {
      id: 'flare', title: 'Flare Now!', objective: 'Descend, wait for FLARE NOW! on the display, press Space to flare and touch down gently',
      story: 'This is the real thing. The display says CRUISE above 150 cm, APPROACH between 50 and 150 cm, and FLARE NOW! below 50 cm. At 50, 40, 30, 20, 10 the system calls out the height. Flare too early and you run out of runway; flare too late (or not at all) and you hit hard. Touch down slower than 30 cm/s.',
      learn: [
        { t: 'The flare', p: 'A nose-up at the last moment that slows the descent.', f: 'pilots flare at about 30 ft' },
        { t: 'Callouts', p: 'The altimeter calls "50, 40, 30, 20, 10".', f: 'height < 50 cm: FLARE NOW!' },
        { t: 'Soft touchdown', p: 'A good touchdown is below 30 cm/s.', f: 'rate ≤ 30 cm/s' },
      ],
      controls: ['<kbd>↓</kbd> descend faster', '<kbd>↑</kbd> slower', '<kbd>Space</kbd> hold to flare'],
      proved: 'You read the height from an echo, compared it with the thresholds (150 and 50 cm) and flared at the right moment. That is exactly the if / else if chain in the Arduino code.',
      tip: 'Descend at about 50 cm/s, wait for FLARE NOW!, then hold Space. If you flare early the system will tell you.',
      start(api) {
        Object.assign(F, { mode: 'flare', h: 300, vs: 0, tempC: 20, cal: 0.0343, lcd: true, flare: false, flared: false, landed: false });
        Object.assign(api.state, { callouts: {} });
      },
      update(dt, api) {
        const st = api.state;
        for (const c of [50, 40, 30, 20, 10]) if (F.h <= c && !st.callouts[c]) { st.callouts[c] = 1; AC.audio.ping(); AC.ui.toast(String(c).toUpperCase() === '50' ? 'FIFTY' : c === 40 ? 'FORTY' : c === 30 ? 'THIRTY' : c === 20 ? 'TWENTY' : 'TEN', 'var(--cyan)'); }
        api.progress(1 - F.h / 300, 'Height ' + fmt(F.h, 0) + ' cm · ' + E.phase(F.h));
        if (F.flare) { F.flared = true; if (F.h > 60) st.early = true; }
        if (F.h <= 0) {
          F.landed = true; F.h = 0;
          const rate = -F.vs;
          if (st.early) return api.fail('You flared too early (at more than 60 cm). You floated past the runway end. Wait for FLARE NOW!');
          if (!F.flared) return api.fail('Hard landing at ' + fmt(rate, 0) + ' cm/s. You never flared. Press Space when the display says FLARE NOW!');
          if (rate > 30) return api.fail('Touchdown at ' + fmt(rate, 0) + ' cm/s is too hard (limit 30). Slow your descent earlier, then flare.');
          api.win(rate < 15 ? 3 : rate < 25 ? 2 : 1, 'Touchdown at ' + fmt(rate, 0) + ' cm/s. Smooth!');
        }
      },
    },
  ];
  const MR = AC.missions({ game: 'altimeter', week: 4, list: missions });

  // ---------------------------------------------------------------- controls
  const tU = AC.touch.button('▲'), tD = AC.touch.button('▼'), tS = AC.touch.button('✔');
  AC.onKey('Space', () => { const m = MR.current; if (m && m.onCheck && !AC.paused) m.onCheck(MR.api); });
  AC.onKey('KeyR', () => { if (MR.current && MR.current.id === 'descent') { MR.api.state.revealed = true; } });
  function help() {
    AC.ui.card({ eyebrow: 'Mission 04', title: 'Radar Altimeter', body: ['Your aircraft pings the ground with sound and times the echo. height = speed × time ÷ 2.', 'Use ↑ / ↓ to move, Space for the action. The LCD shows what your Arduino will show.'] });
  }
  AC.ui.hint('<kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Shift</kbd> fine · <kbd>Space</kbd> action');

  // ---------------------------------------------------------------- drawing
  function lcd(x, y, l1, l2) {
    g.fillStyle = '#1d6b2a'; g.fillRect(x - 6, y - 6, 252, 82);
    g.fillStyle = '#a5e04a'; g.fillRect(x, y, 240, 70);
    g.fillStyle = '#1b2a08'; g.font = 'bold 19px "B612 Mono", monospace'; g.textAlign = 'left';
    g.fillText(l1, x + 10, y + 28); g.fillText(l2, x + 10, y + 58);
  }
  function draw(time) {
    g.clearRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#2c6fb3'); sky.addColorStop(1, '#b5dcf7');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const gy = H - 70, top = 285, sc = (gy - top) / 330, px = W / 2 - 20;
    g.fillStyle = '#4d7f45'; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = '#2b2f35'; g.fillRect(px - 150, gy, 300, 10);
    // ruler
    g.fillStyle = 'rgba(5,13,24,0.55)'; g.fillRect(px - 210, top, 36, gy - top);
    g.font = '10px "B612 Mono", monospace'; g.textAlign = 'right'; g.fillStyle = '#e9f0f7'; g.strokeStyle = '#e9f0f7';
    for (let cm = 0; cm <= 330; cm += 30) { const y = gy - cm * sc; g.beginPath(); g.moveTo(px - 178, y); g.lineTo(px - 188, y); g.stroke(); g.fillText(cm, px - 192, y + 3); }
    const py = gy - F.h * sc - 14;
    // sound pulses (not to scale: sound is far faster than this animation)
    if (!AC.paused) ping = (ping + 0.011) % 1;
    const p = ping < 0.5 ? ping * 2 : 1 - (ping - 0.5) * 2, wy = py + 14 + (gy - py - 14) * p;
    g.strokeStyle = ping < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(255,214,94,0.9)'; g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(px, wy, 10 + k * 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = '11px "B612 Mono", monospace'; g.textAlign = 'left';
    g.fillText(ping < 0.5 ? 'ping ↓' : 'echo ↑', px + 40, wy + 4);
    // aircraft
    g.save(); g.translate(px, py);
    g.fillStyle = '#f4f6f8'; g.beginPath(); g.ellipse(0, 0, 44, 11, 0, 0, 7); g.fill();
    g.fillStyle = '#dfe5ea'; g.fillRect(-12, -3, 30, 5); g.fillRect(-4, 4, 14, 3);
    g.fillStyle = '#e8302a'; g.beginPath(); g.moveTo(-38, -4); g.lineTo(-52, -26); g.lineTo(-30, -6); g.fill();
    g.fillStyle = '#2c6fb3'; g.beginPath(); g.ellipse(24, -3, 8, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#555'; g.fillRect(-2, 10, 6, 7);
    g.restore();
    // LCD
    const read = E.readCm(E.echoUs(F.h, E.soundSpeed(F.tempC)), F.cal);
    if (F.lcd) lcd(W / 2 - 126, 168, ('ALT ' + read + ' cm').padEnd(16), E.phase(read).padEnd(16));
    else lcd(W / 2 - 126, 168, 'ALT -- cm'.padEnd(16), 'SENSOR OFFLINE'.padEnd(16));
    if (F.mode === 'echo') { g.fillStyle = '#fff'; g.font = 'bold 20px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.fillText('Echo time: ' + (F.echo || '--') + ' µs', W / 2, 268); }
    if (F.mode === 'descent') {
      g.fillStyle = 'rgba(5,13,24,0.7)'; g.fillRect(px + 70, py - 40, 200, 56); g.fillStyle = '#e9f0f7'; g.font = '12px "B612 Mono", monospace'; g.textAlign = 'left';
      g.fillText('reading A: ' + readA + ' cm', px + 80, py - 22); g.fillText('0.5 s later: ' + readB + ' cm', px + 80, py - 6);
      g.fillStyle = '#ffb547'; g.fillText('rate = ' + (MR.api.state.revealed ? fmt((readA - readB) * 2, 0) + ' cm/s' : '?'), px + 80, py + 10);
    }
    if (F.mode === 'flare' && F.flare && !F.landed) { g.fillStyle = '#4be38a'; g.font = 'bold 20px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.fillText('FLARE!', px, py - 36); }
  }

  // ---------------------------------------------------------------- loop
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = AC.paused ? 0 : Math.min(0.1, Math.max(0, (ts - last) / 1000)); last = ts; t += dt;
    const dir = AC.axis(['ArrowDown', 'KeyS'], ['ArrowUp', 'KeyW']) + (tU.down ? 1 : 0) - (tD.down ? 1 : 0);
    const fine = AC.key('ShiftLeft', 'ShiftRight') ? 0.2 : 1;
    F.flare = AC.key('Space') || tS.down;
    if (!AC.paused && !F.landed) {
      if (F.mode === 'echo') F.h = clamp(F.h + dir * 70 * fine * dt, 5, 330);
      else if (F.mode === 'hot') F.cal = clamp(F.cal + dir * 0.002 * fine * dt, 0.03, 0.04);
      else if (F.mode === 'descent' || F.mode === 'flare') {
        F.vs = clamp(F.vs + dir * 50 * fine * dt, -150, 40); if (F.vs > 0 && dir === 0) F.vs *= 0.9;
        if (F.mode === 'flare' && F.flare) F.vs += (-12 - F.vs) * (1 - Math.exp(-dt / 0.5)); else if (F.mode === 'descent' || !F.flare) { /* keep */ }
        F.h = clamp(F.h + F.vs * dt, 0, 330);
        if (F.mode === 'descent') { readClock += dt; if (readClock >= 0.5) { readClock = 0; readA = readB; readB = E.readCm(E.echoUs(F.h, E.soundSpeed(F.tempC)), F.cal); } }
      }
    }
    const v = E.soundSpeed(F.tempC), read = E.readCm(E.echoUs(F.h, v), F.cal);
    hud.set('echo', fmt(E.echoUs(F.h, v), 0) + ' µs'); hud.set('sound', fmt(v, 0) + ' m/s · ' + F.tempC + ' °C'); hud.set('cal', F.cal.toFixed(4));
    hud.set('read', F.lcd ? read + ' cm' : '--', F.lcd && Math.abs(read - F.h) <= 1 ? 'cyan' : 'warn');
    hud.set('true', F.mode === 'hot' || F.mode === 'echo' ? (F.mode === 'echo' ? '??' : fmt(F.h, 0) + ' cm') : fmt(F.h, 0) + ' cm');
    hud.setFormula('f', F.mode === 'echo' ? 'height = 0.0343 × ' + (F.echo || '--') + ' ÷ 2' : 'height = ' + F.cal.toFixed(4) + ' × ' + fmt(E.echoUs(F.h, v), 0) + ' ÷ 2\n= ' + read + ' cm');
    draw(t);
    MR.update(dt);
  }
  requestAnimationFrame((ts) => { last = ts; frame(ts); });
  MR.begin();
  window.__alt = { F, MR, E };
})();
