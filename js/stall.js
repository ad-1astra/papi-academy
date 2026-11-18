/* Stall Watch — Mission 03 · Stall Warning System
   The win condition IS the concept: you only survive by watching angle of attack against 12° and 15°,
   by using L = ½ρv²S·CL, and by getting the if / else if order right, exactly like the Arduino code. */
(function () {
  'use strict';
  const { h, clamp, fmt } = AC;
  const SM = window.SM;
  AC.boot({ game: 'stall', week: 3, topic: 'Stall Warning System', title: 'Stall Watch', help: () => help() });

  // ---------------------------------------------------------------- canvas + sound
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

  const snd = { ctx: null, osc: null, gain: null, f: 0 };
  function sctx() {
    if (!snd.ctx) { try { snd.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (snd.ctx.state === 'suspended') snd.ctx.resume();
    return snd.ctx;
  }
  function tone(f) { // continuous tone; f = 0 stops it
    if (AC.data.muted || !f) { if (snd.gain) snd.gain.gain.setTargetAtTime(0, snd.ctx.currentTime, 0.01); snd.f = 0; return; }
    const c = sctx(); if (!c) return;
    if (!snd.osc) {
      snd.osc = c.createOscillator(); snd.gain = c.createGain(); snd.osc.type = 'square';
      snd.gain.gain.value = 0; snd.osc.connect(snd.gain); snd.gain.connect(c.destination); snd.osc.start();
    }
    snd.osc.frequency.setTargetAtTime(f, c.currentTime, 0.01);
    snd.gain.gain.setTargetAtTime(0.06, c.currentTime, 0.01);
    snd.f = f;
  }
  let beepT = 0;
  function beep(f, ms) { tone(f); setTimeout(() => tone(0), ms); }

  // ---------------------------------------------------------------- state
  const F = { aoa: 0, v: 40, alt: 500, vz: 0, thrust: 0.3, mode: 'static', freq: 1000, hornT: 0 };
  let level = 'OK', t = 0;
  const hud = AC.ui.hud();
  hud.section('Flight data').row('aoa', 'Angle of attack', '--').row('cl', 'Lift coefficient CL', '--').row('lift', 'Lift L', '--').row('wt', 'Weight W', '--').row('v', 'Airspeed', '--').row('alt', 'Altitude', '--').row('st', 'Warning', '--');
  hud.formula('f', 'L = ½ × ρ × v² × S × CL');
  const gcv = hud.canvas('clgraph');
  const graph = new AC.Graph(gcv, { xMin: -5, xMax: 25, yMin: -0.5, yMax: 1.6, xLabel: 'AoA °', yLabel: 'CL', xTicks: 6, yTicks: 4 });
  const curve = []; for (let a = -5; a <= 25; a += 0.5) curve.push([a, SM.CL(a)]);

  let panel = null;
  function clearPanel() { if (panel) { panel.remove(); panel = null; } tone(0); }

  // ---------------------------------------------------------------- missions
  const missions = [
    {
      id: 'critical', title: 'Find the Critical Angle', objective: 'Raise the nose slowly: see CAUTION at 12°, STALL at 15°, then recover below 12°',
      story: 'Every wing makes more lift as you raise the angle of attack, but only up to a limit. Fly at a steady 40 m/s and raise the angle with ↑. Watch the lift graph and the airflow over the wing. Find the cliff edge, then come back safely.',
      learn: [
        { t: 'Angle of attack', p: 'The angle between the wing and the oncoming air.', f: 'AoA (°)' },
        { t: 'Lift', p: 'CL rises about 0.1 per degree until the critical angle.', f: 'L = ½ρv²·S·CL' },
        { t: 'The stall', p: 'Past about 15° the air cannot follow the wing. Lift collapses.', f: 'CL max ≈ 1.5 at 15°' },
      ],
      controls: ['<kbd>↑</kbd> raise the angle', '<kbd>↓</kbd> lower it', '<kbd>Shift</kbd> fine'],
      proved: 'Lift grows with angle until about 15°, then the airflow separates and CL collapses. The warnings at 12° and 15° are set before the cliff so the pilot has time to react.',
      tip: 'Go slowly. Yellow starts at 12°, red + horn at 15°. After the stall, push the angle back below 12° to recover.',
      quiz: AC.QUESTIONS.find((q) => q.id === 's-aoa'),
      start(api) { clearPanel(); Object.assign(F, { aoa: 0, v: 40, alt: 500, vz: 0, mode: 'static' }); Object.assign(api.state, { c: 0, s: 0, ok: 0 }); },
      update(dt, api) {
        const st = api.state;
        if (level === 'CAUTION') st.c = 1;
        if (level === 'STALL') st.s = 1;
        if (st.s && F.aoa < SM.CAUTION) st.ok = 1;
        api.progress((st.c + st.s + st.ok) / 3, st.c ? (st.s ? 'Now recover below 12°' : 'Caution seen: keep going to 15°') : 'Raise the nose slowly');
        if (st.ok) api.win(api.t < 40 ? 3 : api.t < 80 ? 2 : 1, 'You found the stall at ' + fmt(st.peak || 15, 0) + '° and recovered in ' + fmt(api.t) + ' s.');
      },
    },
    {
      id: 'slow', title: 'Slow Flight', objective: 'Throttle is back. Hold altitude while you slow down and fly 3 s in the caution band (12° to 15°)',
      story: 'Power is reduced and the airspeed bleeds away. To keep the same altitude you must keep raising the angle of attack. Stay within 25 m of your altitude and do NOT cross 15°. Reach the yellow caution zone and hold it for 3 seconds.',
      learn: [
        { t: 'Slower means more angle', p: 'Lift depends on v², so when v falls CL must rise to hold lift equal to weight.', f: 'CL = W ÷ (½ρv²S)' },
        { t: 'Stall speed', p: 'At CL max = 1.5 the slowest speed for level flight is about 26 m/s.', f: 'v = √(W ÷ ½ρS·1.5)' },
        { t: 'Caution band', p: 'Yellow warns you before the stall.', f: '12° ≤ AoA < 15°' },
      ],
      controls: ['<kbd>↑</kbd><kbd>↓</kbd> change angle of attack', '<kbd>Shift</kbd> fine'],
      proved: 'Level flight needs L = W. As airspeed drops, v² drops, so CL (and the angle) must rise. At about 26 m/s you run out of angle. That is why the stall speed exists.',
      tip: 'Watch the altitude tape on the left of the wing. If the plane climbs, lower the angle a little. If it sinks, raise it a little. Small changes!',
      start(api) {
        clearPanel(); Object.assign(F, { aoa: SM.aoaLevel(42), v: 42, alt: 500, vz: 0, mode: 'fly', thrust: 0.3, target: 500 });
        Object.assign(api.state, { band: 0, stalled: 0, maxErr: 0 });
      },
      update(dt, api) {
        const st = api.state, err = F.alt - F.target;
        st.maxErr = Math.max(st.maxErr, Math.abs(err));
        const inBand = F.aoa >= SM.CAUTION && F.aoa < SM.STALL && Math.abs(err) < 25;
        st.band = inBand ? st.band + dt : Math.max(0, st.band - dt * 0.5);
        st.stalled = F.aoa >= SM.STALL ? st.stalled + dt : 0;
        api.progress(st.band / 3, inBand ? 'In the caution band: hold it' : F.aoa < SM.CAUTION ? 'Airspeed ' + fmt(F.v, 0) + ' m/s · keep slowing' : 'Altitude ' + fmt(err, 0) + ' m');
        if (st.stalled > 1) return api.fail('You stalled: the angle passed 15° and lift collapsed.');
        if (Math.abs(err) > 60) return api.fail('You drifted ' + fmt(Math.abs(err), 0) + ' m from your altitude. Keep it within 25 m.');
        if (st.band >= 3) api.win(st.maxErr < 10 ? 3 : st.maxErr < 20 ? 2 : 1, 'Slow flight at ' + fmt(F.v, 0) + ' m/s and ' + fmt(F.aoa, 1) + '°. Biggest altitude error: ' + fmt(st.maxErr, 0) + ' m.');
      },
    },
    {
      id: 'horn', title: 'Tune the Horn', objective: 'Set the piezo frequency so the sound wave has the wavelength asked for',
      story: 'The piezo disc vibrates at the frequency you choose with tone(). Sound travels at 343 m/s. Calculate the frequency you need for each target, then dial it in. Wear your headphones!',
      learn: [
        { t: 'Period', p: 'The time one cycle takes.', f: 'T = 1 ÷ f' },
        { t: 'Wavelength', p: 'Length of one wave in the air.', f: 'λ = v ÷ f' },
        { t: 'Worked example', p: 'At 2000 Hz.', f: 'T = 0.5 ms · λ ≈ 17 cm' },
      ],
      controls: ['<kbd>↑</kbd><kbd>↓</kbd> change the frequency', '<kbd>Shift</kbd> fine'],
      proved: 'f = 343 ÷ λ. A 17 cm wavelength is about 2000 Hz (period 0.5 ms), the stall horn. A 43 cm wavelength is about 800 Hz, the lower caution beep. Higher frequency = shorter wave = higher pitch.',
      tip: 'Use f = v ÷ λ with λ in metres: 17 cm = 0.17 m, so f = 343 ÷ 0.17 ≈ 2018 Hz.',
      quiz: AC.QUESTIONS.find((q) => q.id === 's-freq'),
      start(api) {
        clearPanel(); Object.assign(F, { mode: 'horn', freq: 500, aoa: 0 });
        api.state.targets = [{ say: 'Period T = 1 ms', f: 1000 }, { say: 'Wavelength λ = 43 cm (the caution beep)', f: 343 / 0.43 }, { say: 'Wavelength λ = 17 cm (the stall horn)', f: 343 / 0.17 }];
        api.state.i = 0; api.state.hold = 0; api.objective(api.state.targets[0].say);
      },
      update(dt, api) {
        const st = api.state, tg = st.targets[st.i];
        const ok = Math.abs(F.freq - tg.f) / tg.f < 0.03;
        st.hold = ok ? st.hold + dt : 0;
        api.progress((st.i + clamp(st.hold / 1.5, 0, 1)) / 3, ok ? 'Locked: hold it' : 'Target ' + (st.i + 1) + ' of 3');
        if (st.hold >= 1.5) {
          AC.audio.good(); st.i++; st.hold = 0;
          if (st.i >= 3) return api.win(api.t < 40 ? 3 : api.t < 90 ? 2 : 1, 'All three tones tuned in ' + fmt(api.t) + ' s.');
          api.objective(st.targets[st.i].say); AC.ui.toast('Next: ' + st.targets[st.i].say, 'var(--cyan)');
        }
      },
    },
    {
      id: 'logic', title: 'Rig the Warning Logic', objective: 'Put the three checks in the right order, then run the test flight',
      story: 'Your Arduino checks the angle with if / else if / else. The FIRST true branch wins and the rest are skipped. Arrange the three checks so the stall horn can never be hidden by the caution light. Then run a test flight from 0° to 20°.',
      learn: [
        { t: 'else if chain', p: 'Checks run top to bottom. The first true one wins.', f: 'if … else if … else' },
        { t: 'Overlapping conditions', p: '16° is ≥ 15° AND ≥ 12°. Both are true!', f: '≥15 ⊂ ≥12' },
        { t: 'Most serious first', p: 'Always test the most dangerous condition first.', f: 'stall → caution → ok' },
      ],
      controls: ['Use ▲ ▼ on each card, then press <b>Run test flight</b>'],
      proved: 'The stall check must come first. 16° satisfies both aoa ≥ 15 and aoa ≥ 12, and only the first true branch runs. Write the most serious check first and the safe "else" last.',
      tip: 'Put the 15° stall check at the top, then the 12° caution check, and "else" (everything fine) at the bottom.',
      start(api) { clearPanel(); Object.assign(F, { mode: 'logic', aoa: 0 }); buildLogic(api); },
      update() {},
    },
    {
      id: 'recover', title: 'Stall Recovery', objective: 'You are stalled and sinking. Lower the nose, regain lift and fly out before you hit the ground at 100 m',
      story: 'Gust! You are at 28 m/s, 200 m up, nose way too high (18°) and sinking at 12 m/s. The horn is screaming. Lower the angle of attack to get the wing flying again. Full power is already set. Keep the ground at 100 m below you.',
      learn: [
        { t: 'Recover', p: 'REDUCE the angle of attack first. Pulling back more makes the stall worse.', f: 'nose down → AoA < 12°' },
        { t: 'Speed returns', p: 'With the nose lower the speed builds again and lift returns.', f: 'L = ½ρv²S·CL' },
        { t: 'Do not over-correct', p: 'Too far down and lift is too small: you just dive.', f: 'aim for about 6° to 10°' },
      ],
      controls: ['<kbd>↓</kbd> lower the nose', '<kbd>↑</kbd> raise it', '<kbd>Shift</kbd> fine'],
      proved: 'Stall recovery is always "lower the angle of attack". The wing flies again, the airspeed builds, lift grows back and the sink rate goes to zero.',
      tip: 'Push the angle down below 12° quickly (about 8°), hold it until the sink rate is gone, then ease back. Going to 0° just makes you dive.',
      start(api) {
        clearPanel(); Object.assign(F, { aoa: 18, v: 28, alt: 200, vz: -12, thrust: 1.2, mode: 'fly', target: 200 });
        Object.assign(api.state, { good: 0, minAlt: 200 });
      },
      update(dt, api) {
        const st = api.state;
        st.minAlt = Math.min(st.minAlt, F.alt);
        const okNow = F.aoa < SM.CAUTION && F.vz > -2;
        st.good = okNow ? st.good + dt : 0;
        api.progress(st.good / 3, okNow ? 'Flying again: hold it' : 'Alt ' + fmt(F.alt, 0) + ' m · sink ' + fmt(-F.vz, 1) + ' m/s');
        if (F.alt < 100) return api.fail('You hit the ground. Lower the angle of attack sooner, but not all the way to zero.');
        if (st.good >= 3) api.win(st.minAlt >= 150 ? 3 : st.minAlt >= 125 ? 2 : 1, 'Recovered! You lost ' + fmt(200 - st.minAlt, 0) + ' m of height (lowest point ' + fmt(st.minAlt, 0) + ' m).');
      },
    },
  ];

  // ----- logic puzzle UI
  function buildLogic(api) {
    const cards = [
      { id: 'A', txt: 'if (aoa >= CAUTION_AOA)   →  yellow LED + slow beep', cond: (a) => a >= SM.CAUTION, res: 'CAUTION', code: 'aoa >= CAUTION_AOA', body: 'yellow LED on, slow beep' },
      { id: 'B', txt: 'if (aoa >= STALL_AOA)   →  red LED + continuous horn', cond: (a) => a >= SM.STALL, res: 'STALL', code: 'aoa >= STALL_AOA', body: 'red LED on, tone(BUZZER, 2000)' },
      { id: 'C', txt: 'else   →  lights off, silent', cond: () => true, res: 'OK', code: '', body: 'everything off' },
    ];
    let order = [0, 1, 2]; // A, B, C: the WRONG order to start
    const list = h('div', { style: { display: 'grid', gap: '8px' } });
    const out = h('div', { class: 'mono', style: { minHeight: '3.2em', fontSize: '0.85rem' } });
    const code = h('pre', { style: { margin: 0, background: '#050d18', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', fontFamily: 'var(--f-hud)', fontSize: '0.74rem', color: '#d6e6f7', whiteSpace: 'pre-wrap' } });
    const state = { running: false, a: 0 };
    function genCode() {
      return order.map((k, i) => { const c = cards[k]; return (i === 0 ? 'if (' + c.code + ')' : c.code ? '} else if (' + c.code + ')' : '} else') + (i === 0 || c.code ? ' {' : ' {') + '  // ' + c.body; }).join('\n') + '\n}';
    }
    function draw() {
      list.innerHTML = '';
      order.forEach((k, i) => {
        const c = cards[k];
        list.appendChild(h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', alignItems: 'center', background: 'var(--raised)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--line)' } },
          h('span', { class: 'mono', style: { fontSize: '0.8rem' } }, (i + 1) + '. ' + c.txt),
          h('button', { class: 'ac-btn ghost small', type: 'button', disabled: state.running || i === 0, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; AC.audio.click(); draw(); } }, '▲'),
          h('button', { class: 'ac-btn ghost small', type: 'button', disabled: state.running || i === 2, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; AC.audio.click(); draw(); } }, '▼')));
      });
      code.textContent = genCode();
    }
    const evalState = (a) => { for (const k of order) if (cards[k].cond(a)) return cards[k].res; };
    const runBtn = h('button', { class: 'ac-btn', type: 'button' }, 'Run test flight (0° → 20°)');
    runBtn.addEventListener('click', () => {
      if (state.running) return;
      state.running = true; state.a = 0; state.seen = {}; draw(); AC.audio.click();
      api.state.tries = (api.state.tries || 0) + 1;
      const timer = setInterval(() => {
        if (AC.paused) return;
        state.a += 0.25; F.aoa = state.a;
        const s = evalState(state.a); state.seen[Math.round(state.a)] = s;
        out.innerHTML = 'AoA <b>' + fmt(state.a, 1) + '°</b> → system says <b style="color:' + (s === 'STALL' ? 'var(--red)' : s === 'CAUTION' ? 'var(--amber)' : 'var(--green)') + '">' + s + '</b>';
        if (state.a >= 20) {
          clearInterval(timer); state.running = false; draw();
          const want = (a) => (a >= 15 ? 'STALL' : a >= 12 ? 'CAUTION' : 'OK');
          const bad = Object.keys(state.seen).map(Number).find((a) => state.seen[a] !== want(a));
          if (bad == null) api.win(api.state.tries === 1 ? 3 : api.state.tries === 2 ? 2 : 1, 'Correct order on try ' + api.state.tries + '. The test flight passed all the way from 0° to 20°.');
          else api.fail('At ' + bad + '° the system said ' + state.seen[bad] + ', but it should say ' + want(bad) + '. ' + (bad >= 15 ? 'The stall horn never sounded: ' + (cards[order[0]].id === 'C' ? 'the else ran first and hid everything.' : 'the caution check was true first, so the stall check was skipped.') : 'Check that the safe "else" comes last.'));
        }
      }, 120);
    });
    panel = h('div', { class: 'ac-panel', style: { position: 'absolute', zIndex: 14, left: '50%', top: '50%', transform: 'translate(-50%,-48%)', width: 'min(560px, calc(100% - 24px))', padding: '14px', display: 'grid', gap: '10px' } },
      h('b', {}, 'Order the checks (top = checked first)'), list, h('div', { class: 'dim', style: { fontSize: '0.78rem' } }, 'What the Arduino code will look like:'), code, runBtn, out);
    AC.root().appendChild(panel);
    draw();
  }

  const MR = AC.missions({ game: 'stall', week: 3, list: missions, onSelect: () => clearPanel() });

  // ---------------------------------------------------------------- controls
  const tU = AC.touch.button('▲'), tD = AC.touch.button('▼');
  function help() {
    AC.ui.card({ eyebrow: 'Mission 03', title: 'Stall Watch', body: ['The wing meets the air at an angle (angle of attack). More angle = more lift, until about 15°. Then the air breaks away and lift collapses: a stall.', 'Use ↑ / ↓ (or ▲ ▼). Yellow caution at 12°, red + horn at 15°. This is exactly what your Arduino will do.'] });
  }
  AC.ui.hint('<kbd>↑</kbd><kbd>↓</kbd> angle / frequency · <kbd>Shift</kbd> fine');

  // ---------------------------------------------------------------- drawing
  function foilPoints(c) {
    const top = [], bot = [];
    for (let i = 0; i <= 24; i++) {
      const x = i / 24, yt = 5 * 0.14 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
      top.push([(x - 0.5) * c, -yt * c]); bot.push([(x - 0.5) * c, yt * c]);
    }
    return top.concat(bot.reverse());
  }
  const FOIL = foilPoints(300);
  function draw(time) {
    g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H);
    if (F.mode === 'horn' || F.mode === 'logic') { gr.addColorStop(0, '#0a1626'); gr.addColorStop(1, '#10263d'); }
    else { gr.addColorStop(0, '#2c6fb3'); gr.addColorStop(1, '#a9d4f5'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const cx = W / 2 + (W > 900 ? 0 : 0), cy = H * 0.52;
    const stalled = F.aoa >= SM.STALL;
    const sep = clamp((F.aoa - SM.STALL) / 2.5, 0, 1);
    if (F.mode === 'horn') return drawWave(cx, cy, time);
    // streamlines
    const speed = F.v * 3.2;
    g.lineWidth = 2;
    for (let k = -7; k <= 7; k++) {
      const y0 = k * 22 + (k < 0 ? -10 : 10);
      const top = y0 < 0;
      for (const pass of [0, 1]) { // pass 0 attached part, pass 1 separated part
        g.beginPath();
        let started = false;
        for (let x = -W / 2; x <= W / 2; x += 8) {
          const dec = Math.exp(-((x / 190) ** 2)) * Math.exp(-Math.abs(y0) / 90);
          let dy = top ? -(18 + Math.max(0, F.aoa) * 2.4) * dec : (14 + Math.max(0, F.aoa) * 1.2) * dec;
          if (x < 0) dy -= Math.max(0, F.aoa) * 0.9 * Math.exp(-(((x + 40) / 160) ** 2)) * (top ? 1 : 0.6);
          let sepHere = 0;
          if (top && sep > 0 && x > -10) { sepHere = sep * clamp((x + 10) / 110, 0, 1); dy += sepHere * (30 * Math.sin(x * 0.07 + time * 9 + k) + 20) * Math.exp(-Math.abs(y0) / 140); }
          if ((pass === 1) !== (sepHere > 0.15)) { started = false; continue; }
          const X = cx + x, Y = cy + y0 + dy;
          if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y);
        }
        g.strokeStyle = pass ? 'rgba(255,110,90,0.9)' : 'rgba(255,255,255,0.75)';
        g.setLineDash([16, 12]); g.lineDashOffset = -(time * speed) % 28;
        g.stroke();
      }
    }
    g.setLineDash([]);
    // wing
    g.save(); g.translate(cx, cy); g.rotate((F.aoa * Math.PI) / 180);
    g.beginPath(); FOIL.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
    g.fillStyle = '#e8eef4'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#7c8fa3'; g.stroke();
    g.restore();
    // vectors: lift (up) vs weight (down)
    const L = SM.lift(F.v, F.aoa), Lk = clamp((L / SM.W) * 90, 0, 230);
    drawArrow(cx + 20, cy, cx + 20, cy - Lk, L >= SM.W * 0.98 ? '#4be38a' : '#ffb547', 'LIFT');
    drawArrow(cx - 20, cy, cx - 20, cy + 90, '#ff70d8', 'WEIGHT');
    // airflow label
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = '12px "B612 Mono", monospace'; g.textAlign = 'left';
    g.fillText('airflow →', cx - W / 2 + 280, cy - 150);
    // warning lamps
    lamp(cx - 90, 120 + 0, 'CAUTION', '#ffd23f', level === 'CAUTION');
    lamp(cx + 90, 120 + 0, 'STALL', '#ff2a1a', level === 'STALL');
    if (stalled) { g.fillStyle = '#ff2a1a'; g.font = 'bold 22px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.fillText('STALL: airflow separated', cx, cy + 190); }
    // altitude tape
    if (F.mode === 'fly') {
      const tx = Math.max(290, cx - 330), top = H * 0.28, hh = H * 0.5;
      g.fillStyle = 'rgba(5,13,24,0.55)'; g.fillRect(tx - 14, top, 28, hh);
      const mid = F.target != null ? F.target : F.alt, range = 120;
      const yOf = (a) => top + hh / 2 - ((a - mid) / range) * (hh / 2);
      g.strokeStyle = '#ff70d8'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(tx - 22, yOf(mid)); g.lineTo(tx + 22, yOf(mid)); g.stroke(); g.setLineDash([]);
      if (MR.current && MR.current.id === 'recover') { g.fillStyle = 'rgba(255,90,79,0.5)'; g.fillRect(tx - 14, Math.max(top, yOf(100)), 28, Math.max(0, top + hh - Math.max(top, yOf(100)))); }
      g.fillStyle = '#4be38a'; const py = clamp(yOf(F.alt), top, top + hh); g.beginPath(); g.moveTo(tx - 20, py); g.lineTo(tx - 8, py - 7); g.lineTo(tx - 8, py + 7); g.fill();
      g.fillStyle = '#e9f0f7'; g.font = '10px "B612 Mono", monospace'; g.textAlign = 'center'; g.fillText('ALT', tx, top - 6);
    }
    // aoa label
    g.fillStyle = '#fff'; g.font = 'bold 26px "Chakra Petch", sans-serif'; g.textAlign = 'center';
    g.fillText('AoA ' + fmt(F.aoa, 1) + '°', cx, cy + 150 - (stalled ? 0 : 0));
  }
  function drawArrow(x1, y1, x2, y2, col, label) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const d = Math.sign(y2 - y1) || 1;
    g.beginPath(); g.moveTo(x2, y2 + d * 2); g.lineTo(x2 - 9, y2 - d * 12); g.lineTo(x2 + 9, y2 - d * 12); g.fill();
    g.font = '11px "B612 Mono", monospace'; g.textAlign = 'left'; g.fillText(label, x2 + 12, y2 + d * (d > 0 ? 6 : 6));
  }
  function lamp(x, y, label, col, on) {
    g.beginPath(); g.arc(x, y, 16, 0, 7); g.fillStyle = on ? col : 'rgba(0,0,0,0.35)'; g.fill();
    if (on) { g.shadowColor = col; g.shadowBlur = 24; g.fill(); g.shadowBlur = 0; }
    g.strokeStyle = '#0008'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#e9f0f7'; g.font = '10px "B612 Mono", monospace'; g.textAlign = 'center'; g.fillText(label, x, y + 32);
  }
  function drawWave(cx, cy, time) {
    const f = F.freq, lamPx = clamp(343 / f * 1000 / 0.9, 12, 900); // 1 px = 0.9 mm: a 17 cm wave is about 190 px
    g.strokeStyle = '#3fd0f0'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= W; x += 3) { const y = cy + Math.sin(((x - time * 120) / lamPx) * Math.PI * 2) * 70; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // wavelength ruler
    g.strokeStyle = '#ff70d8'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - lamPx / 2, cy + 110); g.lineTo(cx + lamPx / 2, cy + 110); g.stroke();
    g.fillStyle = '#ff70d8'; g.font = '14px "B612 Mono", monospace'; g.textAlign = 'center';
    g.fillText('one wavelength (not to scale at low pitch)', cx, cy + 132);
    g.fillStyle = '#fff'; g.font = 'bold 30px "Chakra Petch", sans-serif';
    g.fillText(fmt(f, 0) + ' Hz', cx, cy - 120);
    g.font = '14px "B612 Mono", monospace'; g.fillStyle = '#93a7bf';
    g.fillText('Compare the numbers on the right with your calculation', cx, cy - 92);
  }

  // ---------------------------------------------------------------- loop
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = AC.paused ? 0 : Math.min(0.1, Math.max(0, (ts - last) / 1000)); last = ts;
    t += dt;
    const dir = AC.axis(['ArrowDown', 'KeyS'], ['ArrowUp', 'KeyW']) + (tU.down ? 1 : 0) - (tD.down ? 1 : 0);
    const fine = AC.key('ShiftLeft', 'ShiftRight') ? 0.2 : 1;
    if (!AC.paused) {
      if (F.mode === 'static') F.aoa = clamp(F.aoa + dir * 3 * fine * dt, -5, 25);
      else if (F.mode === 'fly') {
        F.aoa = clamp(F.aoa + dir * 6 * fine * dt, -5, 25);
        for (let i = 0; i < 4; i++) SM.step(F, dt / 4, F.thrust);
      } else if (F.mode === 'horn') F.freq = clamp(F.freq + dir * 500 * fine * dt, 100, 4000);
    }
    // same decision as the Arduino code (stall checked first)
    const nl = F.mode === 'horn' || F.mode === 'logic' ? 'OK' : SM.level(F.aoa);
    if (nl !== level) { level = nl; if (nl === 'STALL') { tone(2000); } else { tone(0); } if (nl === 'STALL') AC.fact('Stall warning', 'At 15° the red light and horn start. The airflow has separated from the wing.', { tag: 'Cockpit', color: 'var(--red)', ms: 4500 }); }
    if (level === 'CAUTION' && !AC.paused) { beepT -= dt; if (beepT <= 0) { beep(800, 80); beepT = 0.4; } }
    if (F.mode === 'horn') { if (!AC.paused) tone(F.freq); else tone(0); }
    if (AC.paused && snd.f) tone(0);
    const cl = SM.CL(F.aoa), L = SM.lift(F.v, F.aoa);
    hud.set('aoa', fmt(F.aoa, 1) + '°', level === 'STALL' ? 'bad' : level === 'CAUTION' ? 'warn' : 'cyan');
    hud.set('cl', fmt(cl, 2)); hud.set('lift', fmt(L, 0) + ' N', L >= SM.W ? 'cyan' : 'warn');
    hud.set('wt', fmt(SM.W, 0) + ' N'); hud.set('v', fmt(F.v, 1) + ' m/s');
    hud.set('alt', F.mode === 'fly' ? fmt(F.alt, 0) + ' m' : '--');
    hud.set('st', F.mode === 'horn' ? fmt(F.freq, 0) + ' Hz' : level, level === 'STALL' ? 'bad' : level === 'CAUTION' ? 'warn' : 'cyan');
    if (F.mode === 'horn') hud.setFormula('f', 'f = ' + fmt(F.freq, 0) + ' Hz\nT = 1 ÷ f = ' + fmt(1000 / F.freq, 2) + ' ms\nλ = 343 ÷ f = ' + fmt((343 / F.freq) * 100, 1) + ' cm');
    else hud.setFormula('f', 'L = ½ × ' + SM.RHO + ' × ' + fmt(F.v, 0) + '² × ' + SM.S + ' × ' + fmt(cl, 2) + '\n  = ' + fmt(L, 0) + ' N  (W = ' + fmt(SM.W, 0) + ' N)');
    graph.draw({ series: [{ pts: curve, color: '#3fd0f0' }], marks: [{ x: clamp(F.aoa, -5, 25), y: cl, color: level === 'STALL' ? '#ff5a4f' : '#4be38a', r: 5 }], vlines: [{ x: 12, color: '#ffb547' }, { x: 15, color: '#ff5a4f' }] });
    draw(t);
    MR.update(dt);
  }
  requestAnimationFrame((ts) => { last = ts; frame(ts); });
  MR.begin();
  window.__stall = { F, MR, SM };
})();
