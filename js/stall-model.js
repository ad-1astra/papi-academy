/* Stall model: the lift equation L = ½ρv²S·CL with CL rising ~0.1 per degree until the critical angle (15°), then collapsing.
   Shared by the game and the node tuning script. Same thresholds as the Arduino code (12° caution, 15° stall). */
(function (root) {
  'use strict';
  const RHO = 1.225, S = 16, MASS = 1000, G = 9.81, W = MASS * G;
  const CAUTION = 12, STALL = 15;
  const M = {
    RHO, S, MASS, G, W, CAUTION, STALL,
    CL: (a) => (a <= STALL ? 0.1 * a : Math.max(0.25, 1.5 - 0.4 * (a - STALL))),
    lift: (v, a) => 0.5 * RHO * v * v * S * M.CL(a),
    drag: (v, a) => 0.5 * RHO * v * v * S * (0.03 + 0.05 * M.CL(a) * M.CL(a)),
    // the aoa needed for level flight at speed v (below the stall)
    aoaLevel: (v) => W / (0.5 * RHO * v * v * S) / 0.1,
    stallSpeed: () => Math.sqrt(W / (0.5 * RHO * S * 1.5)),
    level: (a) => (a >= STALL ? 'STALL' : a >= CAUTION ? 'CAUTION' : 'OK'),
    // sound: frequency, period, wavelength
    period: (f) => 1 / f, wavelength: (f, v = 343) => v / f,
    // one physics step. s = {alt, vz, v, aoa}; thrust in m/s² of forward acceleration
    step(s, dt, thrust) {
      const L = M.lift(s.v, s.aoa), D = M.drag(s.v, s.aoa);
      s.vz += ((L - W) / MASS - 0.6 * s.vz) * dt;
      s.v += (thrust - D / MASS - (G * s.vz) / Math.max(s.v, 10) * 0.5) * dt;
      s.v = Math.max(8, s.v);
      s.alt += s.vz * dt;
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.SM = M;
})(typeof window !== 'undefined' ? window : globalThis);
