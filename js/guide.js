/* Renders a Tinkercad build guide from window.GUIDE (see tinkercad3.html and tinkercad4.html).
   Same layout as tinkercad.html: parts, steps, wires with reasons, copy-paste code, practice circuit, test, Wire Doctor, boss levels. */
(function () {
  'use strict';
  const G = window.GUIDE;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let saved = {};
  const KEY = 'papi-build-' + G.id;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} };

  document.title = G.title;
  const root = $('guide');
  const sec = (small, title) => el('h2', '', '<small>' + small + '</small>' + title);
  const add = (n) => { root.appendChild(n); return n; };

  // nav + header
  add(el('div', 'nav', '<a class="ac-btn ghost small" href="index.html">← Academy hub</a><a class="ac-btn ghost small" href="' + G.game + '.html">Play ' + G.gameName + ' first</a><a class="ac-btn ghost small" href="teacher.html#' + G.teacherAnchor + '">Teacher guide</a>'));
  add(el('header', 'card', '<span class="mono dim">' + G.meta + '</span><h1>' + G.h1 + '</h1><p class="lead">' + G.lead + '</p><div class="progressbar"><i id="bar"></i></div><span class="mono dim" id="barTxt"></span>'));
  root.lastChild.style.cssText = 'background: linear-gradient(135deg, #102540, var(--bg)); padding: 22px';

  // parts
  add(sec('Before you start', 'What you need (all free in Tinkercad)'));
  add(el('div', 'card', '<p>Go to <b>tinkercad.com → Circuits → Create new Circuit</b> and name it <b>' + G.circuitName + '</b>. In the parts panel use the search box to find each part:</p><table class="parts"><tr><th>Search for…</th><th>How many</th><th>Its job</th></tr>' + G.parts.map((p) => '<tr><td><b>' + p[0] + '</b></td><td>' + p[1] + '</td><td>' + p[2] + '</td></tr>').join('') + '</table><p class="why"><b>Tip:</b> ' + G.partsTip + '</p>'));

  // steps
  add(sec('Part 1', 'Build it, one step at a time'));
  add(el('p', 'lead', 'Tick each box as you finish. It saves on this device.'));
  const steps = add(el('div', 'lines')); steps.style.gap = '10px';
  // wires
  add(sec('Part 2', 'Every wire, and why it is there'));
  add(el('p', 'lead', 'Hover over a pin in Tinkercad to see its name. Tick each wire when it is drawn. Read the “why”, because every wire has a reason.'));
  const wiresEl = add(el('div')); wiresEl.style.cssText = 'display: grid; gap: 8px';

  // code
  add(sec('Part 3', 'The code (copy and paste)'));
  const codeCard = add(el('div', 'card'));
  codeCard.innerHTML = '<ol style="padding-left: 1.2em; display: grid; gap: 4px;"><li>In Tinkercad click the <b>Code</b> button (top right).</li><li>Change the drop-down from <b>Blocks</b> to <b>Text</b>. Click <b>Continue</b> when it warns you.</li><li>Click inside the code box, press <kbd>Ctrl</kbd>+<kbd>A</kbd> to select everything, then <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste over it.</li></ol><div class="codebar"><button class="ac-btn" id="copy" type="button">Copy the code</button><span class="mono dim" id="copied" aria-live="polite"></span></div><pre id="code"></pre><p class="why"><b>Pasted but errors?</b> Select <b>all</b> the old code before pasting and make sure the editor says <b>Text</b>, not Blocks.</p>';
  const kw = /\b(const|int|long|float|bool|void|if|else|for|return|byte|unsigned|static|include)\b/g;
  $('code').innerHTML = G.code.split('\n').map((line) => {
    const m = line.match(/^(.*?)(\/\/.*|\/\*.*)?$/);
    let body = esc(m[1]).replace(/(&quot;|"[^"]*")/g, '<span class="nm">$1</span>').replace(kw, '<span class="kw">$1</span>');
    return body + (m[2] ? '<span class="cm">' + esc(m[2]) + '</span>' : '');
  }).join('\n').replace(/(\/\*[\s\S]*?\*\/)/g, '$1');
  add(el('h3', '', 'What each important line does')).style.cssText = 'font-family: var(--f-display); margin-top: 8px';
  add(el('div', 'lines', G.explain.map((e) => '<div><code>' + esc(e[0]) + '</code><span>' + e[1] + '</span></div>').join('')));

  // practice
  add(sec('Part 4', 'Practice: what your circuit should do'));
  add(el('p', 'lead', G.practiceLead));
  add(el('div', 'card sim', G.practiceHTML));
  // test
  add(sec('Part 5', 'Run it and test it'));
  add(el('div', 'card', '<ol style="padding-left: 1.2em; display: grid; gap: 6px;">' + G.test.map((t) => '<li>' + t + '</li>').join('') + '</ol>'));
  // doctor
  add(sec('Part 6', 'Wire Doctor: fix the fault'));
  add(el('p', 'lead', 'Something went wrong? Open the symptom that matches yours.'));
  const docEl = add(el('div')); docEl.style.cssText = 'display: grid; gap: 8px';
  G.doctor.forEach(([s, c, f]) => docEl.appendChild(el('details', 'doc', '<summary>🔧 ' + s + '</summary><div><p><b>Cause:</b> ' + c + '</p><p><b>Fix:</b> ' + f + '</p></div>')));
  // bosses
  add(sec('Part 7', 'Boss levels'));
  add(el('div', 'card boss', G.bosses.map((b) => '<h3>' + b[0] + '</h3><p>' + b[1] + '</p>').join('') + '<p class="why"><b>Stuck?</b> Your teacher has the solutions. Try it for 10 minutes first!</p>'));
  add(el('div', 'nav', '<a class="ac-btn" href="arena.html#w' + G.week + '">Take the Mission 0' + G.week + ' test</a><a class="ac-btn ghost" href="teacher.html#' + G.teacherAnchor + '">Teacher guide + answers</a>')).style.marginTop = '16px';

  // ticks
  function bar() {
    const keys = [...document.querySelectorAll('input[data-k]')], done = keys.filter((k) => k.checked).length;
    $('bar').style.width = (done / keys.length) * 100 + '%';
    $('barTxt').textContent = done + ' of ' + keys.length + ' ticks done';
  }
  function tick(k, wrapper) {
    const cb = el('input'); cb.type = 'checkbox'; cb.dataset.k = k; cb.checked = !!saved[k]; cb.setAttribute('aria-label', 'Done');
    wrapper.classList.toggle('done', cb.checked);
    cb.addEventListener('change', () => { saved[k] = cb.checked; wrapper.classList.toggle('done', cb.checked); store(); bar(); });
    return cb;
  }
  G.steps.forEach(([t, what, why], i) => {
    const d = el('div', 'card step'); d.appendChild(tick('s' + i, d));
    d.appendChild(el('div', 'body', '<h3>Step ' + (i + 1) + ' · ' + t + '</h3><p>' + what + '</p><p class="why"><b>Why?</b> ' + why + '</p>'));
    steps.appendChild(d);
  });
  let lastG = '';
  G.wires.forEach(([grp, from, to, via, why], i) => {
    if (grp !== lastG) { wiresEl.appendChild(el('div', 'group', grp)); lastG = grp; }
    const d = el('div', 'wire'); d.appendChild(tick('w' + i, d));
    d.appendChild(el('div', 'path', '<span>' + from + '</span> → ' + (via ? '<i>[' + via + ']</i> → ' : '') + '<span>' + to + '</span>'));
    d.appendChild(el('div', 'y', why));
    wiresEl.appendChild(d);
  });
  bar();

  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(G.code); $('copied').textContent = 'Copied! Now paste it into Tinkercad.'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('code')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('copied').textContent = 'Selected. Press Ctrl+C.'; }
  });
  G.practiceInit && G.practiceInit($);
})();
