/* AgriGuardian — right-side navigation slide-out (drawer) controller */
(function () {
  function init() {
    var panel  = document.getElementById('nav-panel');
    var handle = document.getElementById('nav-handle');
    var scrim  = document.getElementById('nav-scrim');
    var icon   = document.getElementById('nav-handle-icon');
    if (!panel || !handle || !scrim) return;

    var W = panel.offsetWidth || 212;
    var cur = W, dragging = false, moved = false, startX = 0, base = W;

    function setPx(t) {
      cur = Math.max(0, Math.min(W, t));
      panel.style.transform = 'translateX(' + cur + 'px)';
    }
    function open() {
      panel.style.transition = '';
      panel.style.transform = '';
      panel.classList.add('open');
      cur = 0;
      scrim.classList.add('show');
      if (icon) icon.className = 'ti ti-chevron-right';
    }
    function close() {
      panel.style.transition = '';
      panel.classList.remove('open');
      panel.style.transform = '';
      cur = W;
      scrim.classList.remove('show');
      if (icon) icon.className = 'ti ti-chevron-left';
    }

    // Drag to open/close; a plain tap (no movement) toggles.
    handle.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false; startX = e.clientX; base = cur;
      W = panel.offsetWidth || W;
      panel.style.transition = 'none';
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var d = e.clientX - startX;
      if (Math.abs(d) > 4) moved = true;
      setPx(base + d);
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      if (!moved) { (cur < W / 2) ? close() : open(); return; }
      (cur < W / 2) ? open() : close();
    });

    scrim.addEventListener('click', close);

    // Choosing a tab slides the drawer away.
    var navList = panel.querySelector('.nav');
    if (navList) navList.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn')) setTimeout(close, 130);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
