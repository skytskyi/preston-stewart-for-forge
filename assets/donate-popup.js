/* Quick Donation popup: open/close, segment controls, validation.
   Layout only for now: "Donate now" validates the form and passes the data to
   window.onQuickDonation(data) if it is defined — hook the payment flow there. */
(function () {
  var modal = document.getElementById('dp-modal');
  if (!modal) return;
  var dialog = modal.querySelector('.dp-dialog');
  var form = modal.querySelector('form');
  var otherWrap = modal.querySelector('.dp-other');
  var otherInput = modal.querySelector('#dp-other-amount');
  var email = modal.querySelector('#dp-email');
  var terms = modal.querySelector('#dp-terms');
  var symbols = { USD: '$', EUR: '€', UAH: '₴' };
  var lastFocus = null;

  function currency() { return form.elements.currency.value; }

  function renderAmounts() {
    var sym = symbols[currency()] || '';
    modal.querySelectorAll('[data-amount-label]').forEach(function (el) {
      el.textContent = sym + el.getAttribute('data-amount-label');
    });
    modal.querySelector('.dp-other__cur').textContent = sym;
    var isOther = form.elements.amount.value === 'other';
    otherWrap.classList.toggle('is-visible', isOther);
    if (!isOther) otherInput.classList.remove('is-invalid');
  }

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('dp-lock');
    setTimeout(function () { modal.querySelector('.dp-close').focus(); }, 50);
  }

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('dp-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Open from every Donate button / link on the page
  var openRe = /^\s*(donate|quick card donation)\s*$/i;
  document.querySelectorAll('a, button').forEach(function (el) {
    if (modal.contains(el)) return;
    if (openRe.test(el.textContent) || el.hasAttribute('data-open-donation')) {
      el.addEventListener('click', open);
      el.setAttribute('aria-haspopup', 'dialog');
    }
  });

  modal.querySelector('.dp-close').addEventListener('click', close);
  modal.addEventListener('mousedown', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') { // keep focus inside the dialog
      var f = dialog.querySelectorAll('button, [href], input:not([type=hidden]), select, textarea');
      f = Array.prototype.filter.call(f, function (x) { return x.offsetParent !== null || x.type === 'radio'; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'currency' || e.target.name === 'amount') renderAmounts();
    if (e.target.name === 'amount' && e.target.value === 'other') otherInput.focus();
    if (e.target === terms) terms.closest('.dp-check').classList.remove('is-invalid');
  });
  email.addEventListener('input', function () { email.classList.remove('is-invalid'); });
  otherInput.addEventListener('input', function () { otherInput.classList.remove('is-invalid'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, amount = form.elements.amount.value;
    if (amount === 'other') {
      amount = parseFloat(otherInput.value);
      if (!(amount > 0)) { otherInput.classList.add('is-invalid'); ok = false; }
    } else amount = Number(amount);
    if (!email.checkValidity() || !email.value.trim()) { email.classList.add('is-invalid'); ok = false; }
    if (!terms.checked) { terms.closest('.dp-check').classList.add('is-invalid'); ok = false; }
    if (!ok) { var bad = form.querySelector('.is-invalid'); if (bad) (bad.querySelector('input') || bad).focus(); return; }
    var data = { currency: currency(), amount: amount, service: form.elements.service.value, email: email.value.trim() };
    if (typeof window.onQuickDonation === 'function') window.onQuickDonation(data);
  });

  renderAmounts();
})();
