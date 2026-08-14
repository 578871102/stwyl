// ===== 功能：桌面左右滑动翻页（scroll-snap 原生滚动） =====
// 支持触摸/鼠标横向拖动（原生滚动），指示器圆点点击切换
(function () {
  const pages = document.getElementById('desktop-pages');
  if (!pages) return;
  const slides = pages.querySelectorAll('.page-slide');
  const dots = Array.prototype.slice.call(document.querySelectorAll('#desktop-dots .dot'));
  if (slides.length < 2) return;

  let idx = 0;

  function go(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    // 直接赋值 scrollLeft 立即切换（scroll-snap 会自动吸附），避免 smooth 滚动被 snap 打断
    pages.scrollLeft = idx * pages.clientWidth;
    dots.forEach((d, k) => d.classList.toggle('active', k === idx));
  }

  function sync() {
    const pos = pages.scrollLeft / pages.clientWidth;
    const cur = Math.round(pos);
    if (cur !== idx) {
      idx = cur;
      dots.forEach((d, k) => d.classList.toggle('active', k === idx));
    }
  }

  // 原生滚动结束（含触摸松手、滚轮）后同步圆点
  let scrollTimer = null;
  pages.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(sync, 120);
  }, { passive: true });

  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

  sync();
})();
