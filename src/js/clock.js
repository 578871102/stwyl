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

// ===== 开屏加载动画：页面就绪后淡出 =====
(function () {
  const splash = document.getElementById('splash');
  if (!splash) return;
  // 等首屏关键内容渲染完成再隐藏（约 1.2 秒，避免内容卡顿露出）
  window.addEventListener('load', () => {
    setTimeout(() => splash.classList.add('hide'), 500);
  });
  // 兜底：无论 load 是否触发，最迟 2.5 秒隐藏
  setTimeout(() => splash.classList.add('hide'), 2500);
})();
