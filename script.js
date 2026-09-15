// Prices are the Sept 14, 2026 snapshot from the research brief.
var CORES = {
  lux4: { label: 'Lux-Regular 4"', price: 129.99, coverIncluded: false },
  lux5: { label: 'Lux-Regular 5"', price: 161.99, coverIncluded: false },
  lux6: { label: 'Lux-Regular 6"', price: 193.99, coverIncluded: false },
  valevag: { label: 'IKEA VALEVAG extra-firm', price: 499.00, coverIncluded: true },
  latex: { label: 'Latex Essential 6"', price: 1249.00, coverIncluded: true },
  ikea: { label: 'IKEA ASBYGDA firm', price: 349.00, coverIncluded: true }
};
var TOPPERS = {
  sweet:  { label: 'Sweetcrispy 4"', price: 74.93 },
  ego:    { label: 'EGOHOME 4"', price: 99.99 },
  bpm:    { label: 'Best Price Mattress 4"', price: 104.74 },
  masvis: { label: 'MASVIS "4""', price: 82.79 },
  sleep:  { label: 'Sleep Innovations 4"', price: 147.57 },
  lucid:  { label: 'Lucid Gel 4"', price: 149.99 },
  supersoft1: { label: 'Super Soft 1"', price: 32.99 },
  supersoft2: { label: 'Super Soft 2"', price: 64.99 },
  ego2:   { label: 'EGO 2"', price: 49.49 },
  lucid2: { label: 'Lucid 5-zone 2"', price: 74.99 },
  linenspa2: { label: 'Linenspa 2"', price: 79.99 }
};
var BASES = {
  reuse: 0,
  retrofit: 72.50,  // midpoint of $60-$85
  low: 96.00,       // midpoint of $72-$120
  raised: 125.00    // midpoint of $100-$150
};
var COVER_PRICE = 64.99;

function money(n) { return '$' + n.toFixed(2); }
function val(name) {
  var el = document.querySelector('input[name="' + name + '"]:checked');
  return el ? el.value : null;
}

function customBaseState() {
  var input = document.getElementById('custom-base');
  var raw = input ? input.value.trim() : '';
  if (raw === '') return { valid: false, error: 'Enter a custom base amount in dollars.' };
  var c = Number(raw);
  if (!isFinite(c)) return { valid: false, error: 'Enter a finite number for the custom base amount.' };
  if (c < 0) return { valid: false, error: 'Custom base amount must be $0 or more.' };
  return { valid: true, value: c, error: '' };
}

function updateCalc() {
  var coreKey = val('core') || 'lux6';
  var topKey = val('topper') || 'sweet';
  var baseKey = val('base') || 'low';
  var core = CORES[coreKey];
  var top = TOPPERS[topKey];
  var base = BASES[baseKey];
  var baseInvalid = false;
  var errEl = document.getElementById('custom-base-error');
  var customInput = document.getElementById('custom-base');
  if (baseKey === 'custom') {
    var st = customBaseState();
    if (!st.valid) {
      baseInvalid = true;
      base = NaN;
      if (errEl) { errEl.textContent = st.error; errEl.hidden = false; }
      if (customInput) customInput.setAttribute('aria-invalid', 'true');
    } else {
      base = st.value;
      if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
      if (customInput) customInput.removeAttribute('aria-invalid');
    }
  } else {
    if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
    if (customInput) customInput.removeAttribute('aria-invalid');
  }
  var ownCover = document.getElementById('own-cover').checked;
  var cover = (core.coverIncluded || ownCover) ? 0 : COVER_PRICE;

  document.getElementById('out-core').textContent = money(core.price) + ' · ' + core.label;
  document.getElementById('out-topper').textContent = money(top.price) + ' · ' + top.label;
  document.getElementById('out-cover').textContent = money(cover) + (core.coverIncluded ? ' · built-in' : (ownCover ? ' · sheets only' : ' · knit cover'));
  if (baseInvalid) {
    document.getElementById('out-base').textContent = '—';
    document.getElementById('out-total').textContent = '—';
  } else {
    var total = core.price + top.price + cover + base;
    document.getElementById('out-base').textContent = money(base);
    document.getElementById('out-total').textContent = money(total);
  }
}

function initFallbacks() {
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function h() {
      img.removeEventListener('error', h);
      img.src = img.getAttribute('data-fallback');
    });
  });
}

function initFilters() {
  var btns = document.querySelectorAll('.filters button');
  var rows = document.querySelectorAll('#stack-table tbody tr');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      var f = btn.getAttribute('data-filter');
      rows.forEach(function (r) {
        var tags = (r.getAttribute('data-tags') || '').split(' ');
        r.classList.toggle('hidden', f !== 'all' && tags.indexOf(f) === -1);
      });
    });
  });
}

function initThicknessFilters() {
  var btns = document.querySelectorAll('button[data-thickness]');
  var cards = document.querySelectorAll('#topper-grid .product[data-thickness]');
  if (!btns.length || !cards.length) return;
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      var f = btn.getAttribute('data-thickness');
      cards.forEach(function (c) {
        var t = c.getAttribute('data-thickness');
        c.classList.toggle('hidden', f !== 'all' && t !== f);
      });
    });
  });
}

function initBuildButtons() {
  document.querySelectorAll('[data-build]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var core = btn.getAttribute('data-core');
      var topper = btn.getAttribute('data-topper');
      var base = btn.getAttribute('data-base');
      function check(name, value) {
        if (!value) return;
        var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (el && !el.disabled) el.checked = true;
      }
      check('core', core);
      check('topper', topper);
      check('base', base);
      updateCalc();
      var calc = document.getElementById('calculator');
      if (calc) calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var note = document.getElementById('calc-note');
      if (note) {
        var c = CORES[core], t = TOPPERS[topper];
        if (c && t) note.textContent = 'Applied: ' + c.label + ' + ' + t.label + ' + cover + base. ' + document.getElementById('out-total').textContent + ' estimated; excludes tax, transport, tools, shipping.';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initFallbacks();
  initFilters();
  initThicknessFilters();
  initBuildButtons();
  var form = document.getElementById('calc-form');
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('change', updateCalc);
  form.addEventListener('input', updateCalc);
  var customInput = document.getElementById('custom-base');
  if (customInput) {
    customInput.addEventListener('input', function () {
      var radio = document.querySelector('input[name="base"][value="custom"]');
      if (radio && !radio.checked) { radio.checked = true; }
      updateCalc();
    });
  }
  updateCalc(); // default: 193.99 + 74.93 + 64.99 + 96.00 = 429.91
});
