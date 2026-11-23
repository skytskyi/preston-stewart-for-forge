/* Donation popups: Quick Donation (#dp-modal) and SWIFT details (#dp-swift).
   Quick Donation is layout only for now: "Donate now" validates the form and passes the
   data to window.onQuickDonation(data) if it is defined — hook the payment flow there. */
(function () {
  var lastFocus = null;
  var current = null;

  function focusables(modal) {
    var f = modal.querySelectorAll('.dp-dialog button, .dp-dialog [href], .dp-dialog input:not([type=hidden])');
    return Array.prototype.filter.call(f, function (x) {
      return x.offsetParent !== null || (x.type === 'radio' && x.checked);
    });
  }

  function open(modal, e) {
    if (e) e.preventDefault();
    if (current && current !== modal) close(current, true);
    if (!current) lastFocus = document.activeElement;
    current = modal;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('dp-lock');
    setTimeout(function () { modal.querySelector('.dp-close').focus(); }, 50);
  }

  function close(modal, keepLock) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    current = null;
    if (keepLock) return;
    document.documentElement.classList.remove('dp-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  var modals = document.querySelectorAll('.dp-modal');
  modals.forEach(function (modal) {
    modal.querySelector('.dp-close').addEventListener('click', function () { close(modal); });
    modal.addEventListener('mousedown', function (e) { if (e.target === modal) close(modal); });
  });

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') { close(current); return; }
    if (e.key === 'Tab') {
      var f = focusables(current);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Wire page buttons: explicit data-dp-open="<modal id>", otherwise any "Donate" button
  var donateRe = /^\s*(donate|quick card donation)\s*$/i;
  document.querySelectorAll('a, button').forEach(function (el) {
    if (el.closest('.dp-modal')) return;
    var target = el.getAttribute('data-dp-open') || (donateRe.test(el.textContent) ? 'dp-modal' : null);
    var modal = target && document.getElementById(target);
    if (!modal) return;
    el.addEventListener('click', function (e) { open(modal, e); });
    el.setAttribute('aria-haspopup', 'dialog');
  });

  /* ---------- Quick Donation form ---------- */
  (function () {
    var modal = document.getElementById('dp-modal');
    if (!modal) return;
    var form = modal.querySelector('form');
    var otherWrap = modal.querySelector('.dp-other');
    var otherInput = modal.querySelector('#dp-other-amount');
    var email = modal.querySelector('#dp-email');
    var terms = modal.querySelector('#dp-terms');
    var symbols = { USD: '$', EUR: '€', UAH: '₴' };

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

  /* ---------- SWIFT details ---------- */
  (function () {
    var modal = document.getElementById('dp-swift');
    if (!modal) return;
    var ibans = {
      USD: 'UA623052990000026007011025810',
      EUR: 'UA023052990000026008021019990',
      UAH: 'UA793052990000026004011033366',
      GBP: 'UA793052990000026001021033489',
      CHF: 'UA973052990000026000001025203',
      PLN: 'UA573052990000026000031027732'
    };
    var ibanEl = modal.querySelector('[data-swift-iban]');
    modal.querySelector('.dp-seg').addEventListener('change', function (e) {
      if (ibans[e.target.value]) ibanEl.textContent = ibans[e.target.value];
    });

    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
        document.body.removeChild(ta);
      });
    }

    var status = modal.querySelector('.dp-sr-status');
    modal.querySelectorAll('.dp-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.closest('.dp-detail').querySelector('.dp-detail__value').textContent.trim();
        copyText(value).then(function () {
          btn.classList.add('is-copied');
          status.textContent = 'Copied: ' + value;
          clearTimeout(btn._t);
          btn._t = setTimeout(function () { btn.classList.remove('is-copied'); }, 1600);
        });
      });
    });
  })();
})();
