/* PAPI Pilot — Mission 02 · PAPI Runway Approach Lights
   The win condition IS the concept: you only land by reading white/red lights that obey the same
   UNIT_ANGLE thresholds, tan(θ) = height ÷ distance, and analogRead() maths as the Tinkercad code. */
(function () {
  'use strict';
  const { h, clamp, fmt } = AC;
  const P = window.PAPI;
  AC.boot({ game: 'papi', week: 2, topic: 'PAPI Runway Approach Lights', title: 'PAPI Pilot', help: () => help() });
  const S = AC.scene({ fov: 52, near: 0.5, far: 30000, background: 0x8fc4ee, shadows: false });
  const { scene, camera } = S;
  AC.lights(scene, { sky: 0xdfeeff, ground: 0x44503c, hemi: 0.9, sun: 0.8, dir: [-300, 400, -200], shadows: false });
  scene.fog = new THREE.Fog(0x8fc4ee, 4000, 14000);

  // ---------------------------------------------------------------- world (1 unit = 1 m, x = towards the runway, PAPI at x = 0)
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), mat(0x4f7a47));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);
  const runway = new THREE.Mesh(new THREE.BoxGeometry(1800, 0.2, 45), mat(0x2b2f35, { roughness: 0.6 }));
  runway.position.set(600, 0, 0);
  scene.add(runway);
  for (let x = -250; x < 1450; x += 60) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(30, 0.22, 1), mat(0xf2f2f2));
    d.position.set(x, 0.02, 0);
    scene.add(d);
  }
  for (let i = -8; i <= 8; i++) { // threshold bars
    if (!i) continue;
    const b = new THREE.Mesh(new THREE.BoxGeometry(30, 0.23, 1.6), mat(0xf2f2f2));
    b.position.set(-285, 0.03, i * 2.4);
    scene.add(b);
  }
  const aim = new THREE.Mesh(new THREE.BoxGeometry(60, 0.23, 8), mat(0xf2f2f2)); // aiming-point marks
  aim.position.set(0, 0.03, 12);
  const aim2 = aim.clone(); aim2.position.z = -12;
  scene.add(aim, aim2);
  // orange distance cones every 500 m along the approach so you can SEE the distance
  const cone = new THREE.ConeGeometry(6, 18, 8), coneMat = mat(0xff7a1a);
  for (let d = 500; d <= 4500; d += 500) {
    const c = new THREE.Mesh(cone, coneMat);
    c.position.set(-d, 9, 90);
    scene.add(c);
    }
  // runway edge lights (night missions make these glow)
  const edge = [];
  for (let x = -280; x <= 1480; x += 80) for (const z of [-24, 24]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), new THREE.MeshBasicMaterial({ color: 0x555555 }));
    l.position.set(x, 0.8, z);
    scene.add(l);
    edge.push(l);
  }
  // some trees for speed cues
  const trunk = new THREE.ConeGeometry(14, 50, 6), tmat = mat(0x2e5a30);
  for (let i = 0; i < 90; i++) {
    const t = new THREE.Mesh(trunk, tmat);
    const z = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 1800);
    t.position.set(-4500 + Math.random() * 7000, 25, z);
    scene.add(t);
  }

  // ---------------------------------------------------------------- the four PAPI units (z negative = left of the runway)
  const glowTex = AC.canvasTex(64, 64, (g, w, hh) => {
    const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  });
  const units = [];
  for (let i = 0; i < 4; i++) {
    const z = -(30 + 9 * i);
    const box = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), mat(0x333840));
    box.position.set(0, 1.4, z);
    scene.add(box);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 1.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(-1.6, 1.5, z);
    scene.add(lamp);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false, blending: THREE.AdditiveBlending }));
    sp.position.set(-2, 1.5, z);
    sp.scale.set(0.05, 0.05, 1);
    scene.add(sp);
    units.push({ lamp, sp });
  }

  // ---------------------------------------------------------------- your aircraft (shown in chase view)
  const plane = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.3, 22, 10), mat(0xf4f6f8, { roughness: 0.5 }));
  body.rotation.z = Math.PI / 2;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 28), mat(0xdfe5ea));
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 0.4), mat(0xe8302a));
  tail.position.set(-9, 3, 0);
  const tailW = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 9), mat(0xdfe5ea));
  tailW.position.set(-9, 1, 0);
  plane.add(body, wing, tail, tailW);
  scene.add(plane);

  // ---------------------------------------------------------------- state
  const F = { x: -3000, alt: 157, vs: 0, cmd: 0, knob: 3, view: 'cockpit', gust: 0, landed: false, mode: 'knob' };
  const hud = AC.ui.hud();
  hud.section('Flight data').row('dist', 'Distance to lights', '--').row('alt', 'Height', '--').row('ang', 'Glide angle θ', '--').row('vs', 'Vertical speed', '--');
  hud.section('Inside the Arduino').row('volt', 'Pot voltage on A0', '--').row('raw', 'analogRead()', '--').row('white', 'White lights', '--').meter('slope');
  hud.formula('f', 'tan θ = height ÷ distance');

  // PAPI panel: what the pilot sees, drawn like the 4 LEDs on the breadboard
  const lampEls = [0, 1, 2, 3].map((i) => h('div', { class: 'lamp' }, h('i'), h('span', {}, 'U' + (i + 1))));
  const verdictEl = h('div', { class: 'verdict' }, '--');
  const papiPanel = h('div', { class: 'papi-panel ac-panel', 'aria-live': 'off' }, h('div', { class: 'ttl' }, 'PAPI · what the pilot sees'), h('div', { class: 'lamps' }, lampEls), verdictEl);
  AC.root().appendChild(papiPanel);

  let lastW = -1;
  function applyLights(angle) {
    const w = P.whites(angle);
    for (let i = 0; i < 4; i++) {
      const white = P.isWhite(angle, i);
      const col = white ? 0xffffff : 0xff2a1a;
      units[i].lamp.material.color.setHex(col);
      units[i].sp.material.color.setHex(col);
      lampEls[i].classList.toggle('white', white);
      lampEls[i].classList.toggle('red', !white);
    }
    verdictEl.textContent = P.verdict(w);
    verdictEl.className = 'verdict v' + w;
    return w;
  }

  // ---------------------------------------------------------------- missions
  const gz = (n) => n; // readability
  const missions = [
    {
      id: 'knob', title: 'Turn the Knob', objective: 'Make the lights show 3 white · 1 white · 2 white (hold each for a moment)',
      story: 'Tower here, pilot. You are parked in the air 3 km out and YOU control the glide angle with the potentiometer knob. Turn it and watch the PAPI lights change colour. Make them show exactly what the tower asks for.',
      learn: [
        { t: 'The knob is a sensor', p: 'The wiper sends 0 to 5 V to pin A0. analogRead() turns that into 0 to 1023.', f: 'angle = raw × 6 ÷ 1023' },
        { t: 'Each light has an angle', p: 'A unit shows WHITE only if you are above its angle: 3.50°, 3.17°, 2.83°, 2.50°.', f: 'above = angle > UNIT_ANGLE[i]' },
        { t: 'On slope', p: 'Two white and two red means about 3°.', f: 'white on white, check your height' },
      ],
      controls: ['<kbd>↑</kbd><kbd>↓</kbd> turn the knob', '<kbd>Shift</kbd> fine turn'],
      proved: 'The lights are just 4 if-checks on one number. 2 white + 2 red happens only between 2.83° and 3.17°, and the knob at half way (2.5 V, analogRead 512) is 3.0°.',
      tip: 'Turn slowly! Each band is only 0.33° wide. Hold Shift for fine control. More white = higher angle.',
      quiz: AC.QUESTIONS.find((q) => q.id === 'p-adc'),
      start(api) {
        Object.assign(F, { mode: 'knob', x: -3000, knob: 5, vs: 0, cmd: 0, landed: false, gust: 0 });
        api.state.targets = [{ w: 3, say: 'Show 3 white, 1 red (slightly high)' }, { w: 1, say: 'Show 1 white, 3 red (slightly low)' }, { w: 2, say: 'Show 2 white, 2 red (ON SLOPE)' }];
        api.state.i = 0; api.state.hold = 0;
        api.objective(api.state.targets[0].say);
        setView('cockpit');
        night(false);
      },
      update(dt, api) {
        const st = api.state, tg = st.targets[st.i];
        const w = P.whites(P.angle(F.alt, 3000));
        st.hold = w === tg.w ? st.hold + dt : 0;
        api.progress((st.i + clamp(st.hold / 1.2, 0, 1)) / 3, w === tg.w ? 'Hold it…' : 'Target ' + (st.i + 1) + ' of 3');
        if (st.hold >= 1.2) {
          AC.audio.good();
          st.i++; st.hold = 0;
          if (st.i >= 3) return api.win(api.t < 30 ? 3 : api.t < 60 ? 2 : 1, 'All three light patterns done in ' + fmt(api.t) + ' s. Final angle ' + fmt(F.knob, 2) + '°.');
          api.objective(st.targets[st.i].say);
          AC.ui.toast('Next: ' + st.targets[st.i].say, 'var(--cyan)');
        }
      },
    },
    {
      id: 'trig', title: 'Trig Check', objective: 'Work out the height for 3° at each distance, fly to it, and make 2 white · 2 red',
      story: 'The tower moves you to 3 km, then 1 km, then 500 m from touchdown. At each spot, calculate the height that puts you on the 3° slope (SOH CAH TOA) and climb or descend to it. Write your answers on paper first!',
      learn: [
        { t: 'Right-angled triangle', p: 'Ground distance is the adjacent side, height is the opposite side.', f: 'tan θ = opposite ÷ adjacent' },
        { t: 'Height on the slope', p: 'Rearrange it.', f: 'height = distance × tan 3°' },
        { t: 'Worked example', p: 'At 3 km: 3000 × 0.0524.', f: '≈ 157 m' },
      ],
      controls: ['<kbd>↑</kbd><kbd>↓</kbd> change height', '<kbd>Shift</kbd> fine'],
      proved: 'height = distance × tan 3°: 3000 m → 157 m, 1000 m → 52 m, 500 m → 26 m. The lights agree with your calculator. That is trigonometry keeping aircraft alive.',
      tip: 'tan 3° ≈ 0.0524. Multiply that by the distance. At 1000 m that is only 52 m, not 157!',
      quiz: AC.QUESTIONS.find((q) => q.id === 'p-trig'),
      start(api) {
        Object.assign(F, { mode: 'alt', x: -3000, alt: 260, vs: 0, cmd: 0, landed: false, gust: 0 });
        api.state.stops = [3000, 1000, 500]; api.state.i = 0; api.state.hold = 0;
        F.x = -3000;
        api.objective('At 3000 m: climb or descend to the 3° height (on paper first!)');
        setView('cockpit');
        night(false);
      },
      update(dt, api) {
        const st = api.state, d = st.stops[st.i];
        const w = P.whites(P.angle(F.alt, d));
        st.hold = w === 2 ? st.hold + dt : 0;
        api.progress((st.i + clamp(st.hold / 1.5, 0, 1)) / 3, w === 2 ? 'On slope: hold it…' : 'Stop ' + (st.i + 1) + ' of 3 · ' + d + ' m out');
        if (st.hold >= 1.5) {
          AC.audio.good();
          AC.fact(d + ' m out', 'height = ' + d + ' × tan 3° = ' + fmt(P.heightAt(d), 0) + ' m. You flew ' + fmt(F.alt, 0) + ' m.', { tag: 'Maths check', color: 'var(--magenta)', ms: 6000 });
          st.i++; st.hold = 0;
          if (st.i >= 3) return api.win(api.t < 45 ? 3 : api.t < 90 ? 2 : 1, 'All 3 heights proved by the lights in ' + fmt(api.t) + ' s.');
          F.x = -st.stops[st.i]; F.alt = st.i === 1 ? 140 : 70;
          api.objective('At ' + st.stops[st.i] + ' m: find the 3° height');
          AC.ui.toast('Tower: you are now ' + st.stops[st.i] + ' m out', 'var(--cyan)');
        }
      },
    },
    {
      id: 'approach', title: 'Fly the Approach', objective: 'Follow the lights down. Keep 2 white · 2 red and touch down on the runway',
      story: 'Real landing. You are 3.5 km out and a little high. Use the PAPI to find the slope, then stay on it all the way down. "White on white, check your height." The autopilot flares the last 12 m, but where you touch down is up to you.',
      learn: [
        { t: 'Too high', p: 'More white lights. Descend!', f: '4 white = above 3.5°' },
        { t: 'Too low', p: 'More red lights. Climb!', f: '0 white = below 2.5°' },
        { t: 'Ideal descent rate', p: 'At 60 m/s you sink 60 × tan 3° each second.', f: '≈ 3.1 m/s down' },
      ],
      controls: ['<kbd>↑</kbd> nose up (climb)', '<kbd>↓</kbd> nose down (descend)', '<kbd>C</kbd> change camera'],
      proved: 'You used the PAPI exactly as a pilot does: the colours told you your angle without any instrument. On slope = 3° = about 3.1 m/s down at 60 m/s.',
      tip: 'Do not chase the lights. Make small changes, wait, then check the colours. Aim for about −3 m/s descent once you see 2 white.',
      start(api) { startApproach(api, 3500, 220, 0, false); },
      update: approachUpdate(0.6, 0.4),
    },
    {
      id: 'gusty', title: 'Gusty Night Landing', objective: 'Night + turbulence. Start low, climb to the slope and land',
      story: 'Dark. Gusty. And you are too LOW, so the PAPI shows red. "Red on red, you\'re dead." Climb until the lights turn white, then keep 2 white · 2 red while the gusts shove you around.',
      learn: [
        { t: 'Below the slope', p: 'Red lights mean the glide angle is too shallow and you could land short.', f: 'red on red, you\'re dead' },
        { t: 'Gusts', p: 'Turbulence changes your height. The lights show it instantly, so react gently.', f: 'check, tiny input, wait' },
        { t: 'Why a slope?', p: 'Too steep hits hard, too shallow might touch down before the runway starts.', f: '≈ 3°' },
      ],
      controls: ['<kbd>↑</kbd> nose up', '<kbd>↓</kbd> nose down', '<kbd>C</kbd> camera'],
      proved: 'In the dark with gusts, the four lights were your only reference. That is why airports with no slope guidance are much more dangerous at night.',
      tip: 'If you see 0 or 1 white, raise the nose gently and hold it until you see 2 white, then ease back to −3 m/s.',
      start(api) { startApproach(api, 3500, 125, 1, true); },
      update: approachUpdate(0.55, 0.35),
    },
  ];

  function startApproach(api, x, alt, gust, isNight) {
    Object.assign(F, { mode: 'fly', x: -x, alt, vs: -3, cmd: -3, gust, landed: false });
    Object.assign(api.state, { on: 0, tot: 0, said: {} });
    setView('cockpit');
    night(isNight);
  }
  function approachUpdate(s3, s2) {
    return (dt, api) => {
      if (F.landed) return;
      const d = -F.x, st = api.state;
      const ang = P.angle(F.alt, d), w = P.whites(ang);
      if (d <= 3000 && d >= 300) { st.tot += dt; if (w === 2) st.on += dt; }
      if (w === 4 && !st.said.hi) { st.said.hi = 1; AC.fact('White on white, check your height', 'Four white lights = above 3.5°. Too high: descend.', { tag: 'PAPI rule', color: 'var(--cyan)', ms: 5000 }); }
      if (w === 0 && !st.said.lo) { st.said.lo = 1; AC.fact('Red on red, you\'re dead', 'Four red lights = below 2.5°. Too low: climb now!', { tag: 'PAPI rule', color: 'var(--red)', ms: 5000 }); }
      api.progress(clamp(1 - d / 3500, 0, 1), 'On slope ' + (st.tot ? Math.round((st.on / st.tot) * 100) : 0) + '% · ' + fmt(d, 0) + ' m to go');
      if (F.alt <= 0) {
        F.landed = true; F.alt = 0;
        const frac = st.tot ? st.on / st.tot : 0, pct = Math.round(frac * 100);
        if (F.x < -300) return api.fail('Landed SHORT of the runway at ' + fmt(-F.x - 300, 0) + ' m before the threshold. Too low: the lights were red.');
        if (F.x > 800) return api.fail('Landed LONG, ' + fmt(F.x, 0) + ' m past the lights. You were too high for too long.');
        api.win(frac >= s3 ? 3 : frac >= s2 ? 2 : 1, 'Touchdown ' + fmt(F.x, 0) + ' m past the lights. You were on slope ' + pct + '% of the approach (3★ needs ' + Math.round(s3 * 100) + '%).');
      }
    };
  }
  const MR = AC.missions({ game: 'papi', week: 2, list: missions });

  // ---------------------------------------------------------------- view / night
  function setView(v) { F.view = v; }
  function night(on) {
    scene.background = new THREE.Color(on ? 0x050914 : 0x8fc4ee);
    scene.fog.color.setHex(on ? 0x050914 : 0x8fc4ee);
    scene.fog.near = on ? 800 : 4000; scene.fog.far = on ? 6000 : 14000;
    scene.children.forEach((c) => { if (c.isHemisphereLight) c.intensity = on ? 0.18 : 0.9; if (c.isDirectionalLight) c.intensity = on ? 0.05 : 0.8; });
    edge.forEach((l) => l.material.color.setHex(on ? 0xffe9a8 : 0x555555));
  }

  // ---------------------------------------------------------------- controls
  const tU = AC.touch.button('▲'), tD = AC.touch.button('▼');
  AC.ui.tools([{ label: 'Camera (C)', onclick: () => setView(F.view === 'cockpit' ? 'chase' : 'cockpit') }]);
  AC.onKey('KeyC', () => setView(F.view === 'cockpit' ? 'chase' : 'cockpit'));
  function help() {
    AC.ui.card({ eyebrow: 'Mission 02', title: 'PAPI Pilot', body: ['Four lights beside the runway tell you if you are on the 3° glide slope. White = too high, red = too low. Two white + two red = perfect.', 'Use ↑ / ↓ (or the on-screen ▲ ▼). The right-hand panel shows the same numbers your Arduino will compute.'] });
  }
  AC.ui.hint('<kbd>↑</kbd><kbd>↓</kbd> control · <kbd>Shift</kbd> fine · <kbd>C</kbd> camera');

  // ---------------------------------------------------------------- loop
  const look = new THREE.Vector3();
  S.onFrame((dt, time) => {
    const dir = AC.axis(['ArrowDown', 'KeyS'], ['ArrowUp', 'KeyW']) + (tU.down ? 1 : 0) - (tD.down ? 1 : 0);
    const fine = AC.key('ShiftLeft', 'ShiftRight') ? 0.2 : 1;
    if (!AC.paused) {
      if (F.mode === 'knob') { F.knob = clamp(F.knob + dir * 0.6 * fine * dt, 0, 6); F.alt = 3000 * Math.tan((F.knob * Math.PI) / 180); }
      else if (F.mode === 'alt') { F.alt = clamp(F.alt + dir * 25 * fine * dt, 2, 400); F.knob = P.angle(F.alt, -F.x); }
      else if (!F.landed) {
        const s = { x: F.x, alt: F.alt, vs: F.vs, cmd: F.cmd };
        P.step(s, dir * fine, dt, time, F.gust);
        F.x = s.x; F.alt = s.alt; F.vs = s.vs; F.cmd = s.cmd;
        F.knob = P.angle(F.alt, -F.x);
      }
    }
    const d = Math.max(-F.x, 0), ang = P.angle(F.alt, d), w = applyLights(ang);
    // chase / cockpit camera
    const gamma = F.mode === 'fly' ? Math.atan2(F.vs, P.SPEED) : 0;
    plane.position.set(F.x, F.alt + 2, 0);
    plane.rotation.z = gamma;
    if (F.view === 'cockpit') {
      plane.visible = false;
      camera.position.set(F.x, F.alt + 2.5, 0);
      look.set(F.x + Math.cos(gamma - 0.02) * 100, F.alt + 2.5 + Math.sin(gamma - 0.02) * 100, 0);
      camera.fov = 52;
    } else {
      plane.visible = true;
      camera.position.set(F.x - 45, F.alt + 14, 26);
      look.set(F.x + 40, F.alt, 0);
    }
    camera.updateProjectionMatrix();
    camera.lookAt(look);
    // lamp sprites: bigger when close
    const size = clamp(8 / (d + 40), 0.014, 0.07); // about the spacing between units on screen
    units.forEach((u) => u.sp.scale.set(size, size, 1));
    // HUD
    const raw = P.rawFromAngle(clamp(ang, 0, 6));
    hud.set('dist', fmt(d, 0) + ' m');
    hud.set('alt', fmt(F.alt, 0) + ' m');
    hud.set('ang', fmt(ang, 2) + '°', w === 2 ? 'cyan' : 'warn');
    hud.set('vs', F.mode === 'fly' ? fmt(F.vs, 1) + ' m/s' : '--');
    hud.set('volt', fmt(P.voltsFromRaw(raw), 2) + ' V');
    hud.set('raw', String(raw));
    hud.set('white', w + ' white · ' + (4 - w) + ' red', w === 2 ? 'cyan' : w === 0 || w === 4 ? 'bad' : 'warn');
    hud.setMeter('slope', 1 - Math.min(1, Math.abs(ang - 3) / 2), w === 2 ? 'var(--green)' : 'var(--amber)');
    hud.setFormula('f', 'tan θ = ' + fmt(F.alt, 0) + ' ÷ ' + fmt(d, 0) + ' = ' + fmt(Math.tan((ang * Math.PI) / 180), 4) + '\nθ = ' + fmt(ang, 2) + '°' + (F.mode === 'alt' ? '' : '  ·  3° needs ' + fmt(P.heightAt(d), 0) + ' m'));
    MR.update(dt);
  });
  S.start();
  MR.begin();
  window.__papi = { F, MR, P }; // handy for the automated play-through tests
})();
