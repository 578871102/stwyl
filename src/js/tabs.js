// ===== 功能：底部 tab 页面切换 + 独立全屏页导航隐藏 + 状态栏隐藏 =====
(function () {
  const tabs = document.querySelectorAll('.tab');
  const pages = document.querySelectorAll('.page');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      pages.forEach(p => p.hidden = true);
      document.getElementById(tab.dataset.page).hidden = false;
    });
  });

  // 独立全屏页：隐藏底部导航栏 + 状态栏（Mochi/时间），页面自身补偿内边距
  const FULL_PAGES = ['page-chat', 'page-chat-settings', 'page-custom-cards', 'page-theme', 'page-general', 'page-fav', 'page-memory', 'page-calendar', 'page-divine', 'page-music', 'page-stats', 'page-interact', 'page-checkin', 'page-ta-ask', 'page-ta-choose', 'page-ta-curious', 'page-ta-roast', 'page-checkin-cards'];
  function syncChrome() {
    const phone = document.querySelector('.phone');
    const tabbar = document.querySelector('.tabbar');
    const visible = Array.from(document.querySelectorAll('.page')).find(p => !p.hidden);
    const isFull = visible ? FULL_PAGES.indexOf(visible.id) >= 0 : false;
    if (tabbar) tabbar.hidden = isFull;
    if (phone) phone.classList.toggle('no-statusbar', isFull);
    if (visible) visible.classList.toggle('full', isFull);
  }
  // 监听所有页面 hidden 变化（任何页面切换都会触发）
  document.querySelectorAll('.page').forEach(p => {
    const mo = new MutationObserver(syncChrome);
    mo.observe(p, { attributes: true, attributeFilter: ['hidden'] });
  });
  syncChrome();

  // 外观与主题：设置页点击进入独立页面，返回回设置页
  const appearanceRow = document.getElementById('row-appearance');
  const themePage = document.getElementById('page-theme');
  const themeBack = document.getElementById('theme-back');
  if (appearanceRow && themePage) {
    appearanceRow.addEventListener('click', () => {
      pages.forEach(p => p.hidden = true);
      themePage.hidden = false;
    });
  }
  if (themeBack) {
    themeBack.addEventListener('click', () => {
      pages.forEach(p => p.hidden = true);
      const setPage = document.getElementById('page-setting');
      if (setPage) setPage.hidden = false;
    });
  }
})();
