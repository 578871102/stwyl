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
  // v3.5.96：开屏显示「部署版本（构建时注入）+ 实时时间」——手机端可随时验证是否最新部署
  const verEl = document.getElementById('splash-ver');
  if (verEl) {
    const base = (verEl.textContent || '').trim();
    const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
    const fill = () => {
      const d = new Date();
      const t = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
      verEl.textContent = (base ? base + ' · ' : '') + t;
    };
    fill();
    const iv = setInterval(fill, 1000);
    // 开屏结束后停止刷新
    window.addEventListener('load', () => setTimeout(() => clearInterval(iv), 2500));
    setTimeout(() => clearInterval(iv), 2800);
  }
  const hide = () => {
    if (splash.classList.contains('hide')) return;
    splash.classList.add('hide');
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 400);
  };
  window.addEventListener('load', () => setTimeout(hide, 500));
  setTimeout(hide, 2500);
})();
