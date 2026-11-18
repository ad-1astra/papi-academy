/* PAPI model: the same maths as the Arduino sketch, in JavaScript.
   The game and the node tuning script both use this file, so the simulation can never drift from the Tinkercad code. */
(function (root) {
  'use strict';
  // Same numbers as UNIT_ANGLE[4] in the Arduino code. Unit 1 is nearest the runway.
  const UNIT_ANGLE = [3.5, 3.17, 2.83, 2.5];
  const SPEED = 60; // approach ground speed, m/s
  const M = {
    UNIT_ANGLE, SPEED,
    // glide angle (degrees) of an aircraft `alt` m up and `dist` m from the lights
    angle: (alt, dist) => (Math.atan2(alt, Math.max(dist, 1)) * 180) / Math.PI,
    // true if unit i shows WHITE for this angle (the line "above ? HIGH : LOW")
    isWhite: (angle, i) => angle > UNIT_ANGLE[i],
    whites: (angle) => UNIT_ANGLE.reduce((n, a) => n + (angle > a ? 1 : 0), 0),
    // ADC maths from the mission: analogRead 0..1023 <-> 0..6 degrees <-> 0..5 V
    rawFromAngle: (a) => Math.round((a * 1023) / 6),
    angleFromRaw: (raw) => raw * (6.0 / 1023.0),
    voltsFromRaw: (raw) => (raw * 5.0) / 1023.0,
    heightAt: (dist, deg = 3) => dist * Math.tan((deg * Math.PI) / 180),
    gust: (t, k = 1) => k * (1.2 * Math.sin(0.9 * t) + 0.8 * Math.sin(2.3 * t + 1)),
    // verdict text, same words as the Serial Monitor in the Arduino code
    verdict: (w) => ['TOO LOW', 'SLIGHTLY LOW', 'ON SLOPE', 'SLIGHTLY HIGH', 'TOO HIGH'][w],
    // one physics step of the approach. s = {x, alt, vs, cmd}; input -1..1 (+1 = nose up)
    step(s, input, dt, t, gustK) {
      s.cmd = Math.max(-10, Math.min(5, s.cmd + input * 2.5 * dt));
      // flare: in the last 12 m the autopilot eases the descent so the touchdown is soft (like a real flare)
      if (s.alt < 12) s.cmd += (-1.0 - s.cmd) * (1 - Math.exp(-dt / 0.8));
      s.vs += (s.cmd - s.vs) * (1 - Math.exp(-dt / 0.6));
      s.x += SPEED * dt;
      s.alt += (s.vs + (gustK ? M.gust(t, gustK) : 0)) * dt;
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.PAPI = M;
})(typeof window !== 'undefined' ? window : globalThis);
