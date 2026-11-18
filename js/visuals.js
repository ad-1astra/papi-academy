/* Adds pictures to the build guides: a parts row under every step, a mini wiring diagram on every wire, and parts on the hub cards. */
(function () {
  'use strict';
  const svg = (w, h, body) => '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-hidden="true">' + body + '</svg>';
  const led = (c) => svg(44, 56, '<path d="M12 30 V18 a10 10 0 0 1 20 0 V30 Z" fill="' + c + '" stroke="#0008"/><rect x="9" y="30" width="26" height="4" fill="' + c + '"/><path d="M16 34 V52 M30 34 V46" stroke="#cfd6dd" stroke-width="3"/>');
  const legs = (n) => [...Array(n).keys()].map((i) => '<path d="M' + (10 + i * 7) + ' 44 V50"/>').join('');
  const dots = [...Array(12).keys()].map((i) => '<rect x="' + (9 + i * 6) + '" y="16" width="3" height="3"/><rect x="' + (9 + i * 6) + '" y="36" width="3" height="3"/>').join('');
  // key: [label, Tinkercad search name, svg]
  const P = {
    arduino: ['Arduino Uno R3', 'Arduino Uno R3', svg(84, 56, '<rect x="2" y="4" width="80" height="48" rx="5" fill="#1f6fb5"/><rect x="2" y="16" width="14" height="14" fill="#9aa"/><rect x="26" y="8" width="50" height="5" fill="#222"/><rect x="26" y="44" width="40" height="5" fill="#222"/><circle cx="48" cy="29" r="9" fill="none" stroke="#fff" stroke-width="2"/><text x="38" y="33" font-size="10" fill="#fff">UNO</text>')],
    breadboard: ['Breadboard', 'Breadboard Small', svg(84, 56, '<rect x="2" y="6" width="80" height="44" rx="4" fill="#d8d4c4"/><rect x="6" y="9" width="72" height="3" fill="#e8302a"/><rect x="6" y="44" width="72" height="3" fill="#3b6fd8"/><rect x="6" y="26" width="72" height="4" fill="#bbb"/><g fill="#777">' + dots + '</g>')],
    pot: ['Potentiometer', 'Potentiometer', svg(64, 56, '<rect x="4" y="6" width="56" height="30" rx="4" fill="#3b5bdb"/><circle cx="32" cy="21" r="10" fill="#e8eef4"/><path d="M32 21 l6 -7" stroke="#333" stroke-width="2"/><path d="M14 36 V52 M32 36 V52 M50 36 V52" stroke="#cfd6dd" stroke-width="3"/>')],
    led_white: ['White LED', 'LED (colour: White)', led('#f4f4f4')],
    led_red: ['Red LED', 'LED (colour: Red)', led('#ff3b2f')],
    led_yellow: ['Yellow LED', 'LED (colour: Yellow)', led('#ffd23f')],
    resistor: ['Resistor 220 Ω', 'Resistor (set 220 Ω)', svg(74, 34, '<path d="M2 17 H16 M58 17 H72" stroke="#cfd6dd" stroke-width="3"/><rect x="16" y="8" width="42" height="18" rx="6" fill="#d9b27c"/><rect x="24" y="8" width="4" height="18" fill="#c0392b"/><rect x="32" y="8" width="4" height="18" fill="#c0392b"/><rect x="40" y="8" width="4" height="18" fill="#8e5a2b"/>')],
    piezo: ['Piezo', 'Piezo', svg(54, 56, '<circle cx="27" cy="26" r="22" fill="#1b1b1b"/><circle cx="27" cy="26" r="6" fill="#444"/><text x="22" y="14" font-size="10" fill="#fff">+</text><path d="M18 46 V54 M36 46 V54" stroke="#cfd6dd" stroke-width="3"/>')],
    lcd: ['LCD 16 x 2', 'LCD 16 x 2', svg(96, 52, '<rect x="2" y="4" width="92" height="40" rx="3" fill="#1d6b2a"/><rect x="8" y="9" width="80" height="22" fill="#a5e04a"/><text x="12" y="20" font-size="8" fill="#1b2a08">ALT 87 cm</text><text x="12" y="29" font-size="8" fill="#1b2a08">APPROACH</text><g stroke="#cfd6dd">' + legs(12) + '</g>')],
    ultrasonic: ['Ultrasonic sensor', 'Ultrasonic Distance Sensor (4-pin)', svg(80, 52, '<rect x="2" y="4" width="76" height="34" rx="4" fill="#2c5fa8"/><circle cx="22" cy="21" r="12" fill="#cfd6dd" stroke="#444" stroke-width="2"/><circle cx="58" cy="21" r="12" fill="#cfd6dd" stroke="#444" stroke-width="2"/><circle cx="22" cy="21" r="5" fill="#555"/><circle cx="58" cy="21" r="5" fill="#555"/><path d="M14 38 V50 M30 38 V50 M50 38 V50 M66 38 V50" stroke="#cfd6dd" stroke-width="3"/>')],
  };
  function find(text) {
    const t = text.toLowerCase(), out = [];
    if (/arduino/.test(t)) out.push('arduino');
    if (/breadboard|rail/.test(t)) out.push('breadboard');
    if (/potentiometer|\bpot\b|wiper|knob/.test(t)) out.push('pot');
    if (/white/.test(t)) out.push('led_white');
    if (/\bred\b/.test(t) && /led|anode|unit/.test(t)) out.push('led_red');
    if (/yellow/.test(t)) out.push('led_yellow');
    if (/resistor|220/.test(t)) out.push('resistor');
    if (/piezo|horn/.test(t)) out.push('piezo');
    if (/\blcd\b/.test(t)) out.push('lcd');
    if (/ultrasonic|trig|echo/.test(t)) out.push('ultrasonic');
    return [...new Set(out)];
  }
  const row = (keys) => '<div class="vrow">' + keys.map((k) => '<figure class="vpart">' + P[k][2] + '<figcaption><b>' + P[k][0] + '</b><br><span>Search: ' + P[k][1] + '</span></figcaption></figure>').join('') + '</div>';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const pill = (x, txt, col) => '<rect x="' + x + '" y="4" width="146" height="26" rx="13" fill="' + col + '" stroke="#0006"/><text x="' + (x + 73) + '" y="21" text-anchor="middle" font-size="11" font-family="monospace" fill="#fff">' + esc(txt) + '</text>';
  const colour = (s) => (/5v|\+ rail/i.test(s) ? '#c62828' : /gnd|rail|cathode|negative/i.test(s) ? '#33404f' : /anode|positive|led|piezo/i.test(s) ? '#8a5a00' : '#1f6fb5');
  const wireCol = (s) => (/5v|\+ rail/i.test(s) ? '#ff5a4f' : /gnd|− rail|cathode|negative/i.test(s) ? '#cfd6dd' : '#3fd0f0');
  function wireSvg(from, to, via) {
    const f = from.replace('Potentiometer', 'Pot').replace('Ultrasonic', 'Ultra').replace('Arduino ', ''), t = to.replace('Breadboard ', '').replace('Potentiometer', 'Pot');
    const wc = wireCol(from + ' ' + to);
    let mid = '<path d="M150 17 H330" stroke="' + wc + '" stroke-width="4" stroke-linecap="round"/>';
    if (via) mid = '<path d="M150 17 H208 l4 -9 l8 18 l8 -18 l8 18 l8 -18 l4 9 H330" fill="none" stroke="' + wc + '" stroke-width="3"/><text x="240" y="42" text-anchor="middle" font-size="9" fill="#ffb547" font-family="monospace">' + esc(via) + '</text>';
    return '<svg class="wsvg" viewBox="0 0 480 46" width="480" height="46" role="img" aria-label="' + esc(from + ' to ' + to) + '">' + pill(4, f, colour(from)) + mid + pill(330, t, colour(to)) + '</svg>';
  }
  function run() {
    document.querySelectorAll('.step .body').forEach((b) => {
      if (b.querySelector('.vrow')) return;
      const keys = find(b.textContent);
      if (keys.length) b.insertAdjacentHTML('beforeend', row(keys));
    });
    document.querySelectorAll('.wire').forEach((w) => {
      if (w.querySelector('.wsvg')) return;
      const p = w.querySelector('.path'); if (!p) return;
      const sp = p.querySelectorAll('span'), via = p.querySelector('i');
      if (sp.length < 2) return;
      w.insertAdjacentHTML('beforeend', '<div class="y" style="grid-column:2">' + wireSvg(sp[0].textContent, sp[1].textContent, via ? via.textContent.replace(/[\[\]]/g, '') : '') + '</div>');
    });
    const map = document.getElementById('map');
    if (map) {
      const sets = { 2: ['arduino', 'pot', 'led_white', 'led_red', 'resistor'], 3: ['pot', 'led_yellow', 'led_red', 'piezo'], 4: ['ultrasonic', 'lcd', 'pot', 'arduino'] };
      map.querySelectorAll('.lesson').forEach((c) => {
        const n = +((c.querySelector('.n').textContent.match(/\d+/) || [0])[0]);
        if (sets[n] && !c.querySelector('.vrow')) c.querySelector('h3').insertAdjacentHTML('afterend', row(sets[n]));
      });
    }
  }
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
