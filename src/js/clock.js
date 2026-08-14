// ===== 功能：状态栏显示真实时间 =====
(function () {
  const el = document.getElementById('clock');
  if (!el) return;
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  function update() {
    const d = new Date();
    el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  update();
  setInterval(update, 15000); // 每 15 秒校准一次
})();

// ===== 开屏加载动画：页面就绪后淡出并移除 =====
(function () {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const hide = () => {
    if (splash.classList.contains('hide')) return;
    splash.classList.add('hide');
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 400);
  };
  window.addEventListener('load', () => setTimeout(hide, 500));
  setTimeout(hide, 2500);
})();
