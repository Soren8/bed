// Prices are the Sept 14, 2026 snapshot from the research brief.
var CORES = {
  lux4: { label: 'Lux-Regular 4"', price: 129.99, coverIncluded: false },
  lux5: { label: 'Lux-Regular 5"', price: 161.99, coverIncluded: false },
  lux6: { label: 'Lux-Regular 6"', price: 193.99, coverIncluded: false },
  hq4:  { label: 'Lux-HQ 4"', price: 167.99, coverIncluded: false },
  hq5:  { label: 'Lux-HQ 5"', price: 208.99, coverIncluded: false },
  hq6:  { label: 'Lux-HQ 6"', price: 250.99, coverIncluded: false },
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

function updateCalc() {
  var coreKey = val('core') || 'lux6';
  var topKey = val('topper') || 'sweet';
  var baseKey = val('base') || 'low';
  var core = CORES[coreKey];
  var top = TOPPERS[topKey];
  var base = BASES[baseKey];
  if (baseKey === 'custom') {
    var c = parseFloat(document.getElementById('custom-base').value);
    base = (isFinite(c) && c >= 0) ? c : 0;
  }
  var ownCover = document.getElementById('own-cover').checked;
  var cover = (core.coverIncluded || ownCover) ? 0 : COVER_PRICE;
  var total = core.price + top.price + cover + base;

  document.getElementById('out-core').textContent = money(core.price) + ' · ' + core.label;
  document.getElementById('out-topper').textContent = money(top.price) + ' · ' + top.label;
  document.getElementById('out-cover').textContent = money(cover) + (core.coverIncluded ? ' · built-in' : (ownCover ? ' · already own' : ' · knit cover'));
  document.getElementById('out-base').textContent = money(base);
  document.getElementById('out-total').textContent = money(total);
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

document.addEventListener('DOMContentLoaded', function () {
  initFallbacks();
  initFilters();
  document.getElementById('calc-form').addEventListener('change', updateCalc);
  document.getElementById('calc-form').addEventListener('input', updateCalc);
  updateCalc(); // default: 193.99 + 74.93 + 64.99 + 96.00 = 429.91
});
