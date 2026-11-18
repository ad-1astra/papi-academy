/* Echo model: the same maths as the Arduino altimeter. distance = speed × time ÷ 2 (down and back). */
(function (root) {
  'use strict';
  const E = {
    CRUISE_CM: 150, FLARE_CM: 50, // same constants as the Tinkercad code
    soundSpeed: (tempC) => 331 + 0.6 * tempC,                      // m/s
    cmPerUs: (v) => (v * 100) / 1e6,                               // 343 m/s -> 0.0343 cm/µs
    echoUs: (heightCm, v) => (2 * heightCm) / E.cmPerUs(v),        // round trip time in µs
    readCm: (echoUs, cmPerUs) => Math.round((echoUs * cmPerUs) / 2), // what the Arduino shows
    phase: (alt) => (alt >= E.CRUISE_CM ? 'CRUISE' : alt > E.FLARE_CM ? 'APPROACH' : 'FLARE NOW!'),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.ECHO = E;
})(typeof window !== 'undefined' ? window : globalThis);
