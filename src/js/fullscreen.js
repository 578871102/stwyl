// ===== 功能：全屏模式（v3.5.93） =====
// 安卓 Chrome PWA standalone 会保留系统状态栏（顶部时间/电量）——manifest 无法隐藏。
// 提供设置页「全屏模式」开关：开启后用 Fullscreen API 真正全屏（隐藏系统状态栏）。
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  const FS_KEY = 'fullscreen-enabled';

  function fsSupported() {
    return typeof document.documentElement.requestFullscreen === 'function';
  }
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function enterFs() {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {}
  }
  function exitFs() {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
  // 启动时若用户开过全屏且处于 PWA 环境，尝试恢复（需用户手势才能生效时静默跳过）
  function syncToggle() {
    const el = document.getElementById('sf-fullscreen');
    if (el) el.checked = isFullscreen();
  }
  const fsToggle = document.getElementById('sf-fullscreen');
  if (fsToggle) {
    fsToggle.addEventListener('change', () => {
      if (fsToggle.checked) {
        if (!fsSupported()) { fsToggle.checked = false; return; }
        enterFs();
      } else {
        exitFs();
      }
    });
  }
  // 退出全屏（Esc 键/手势）时同步开关状态
  document.addEventListener('fullscreenchange', syncToggle);
  document.addEventListener('webkitfullscreenchange', syncToggle);
  // 页面加载后：若全屏开关记忆为开且当前不在全屏，尝试进入（部分浏览器首帧可生效）
  try {
    if (store.get(FS_KEY) === '1' && fsSupported() && !isFullscreen()) {
      // Fullscreen API 通常需要用户手势；自动调用会被浏览器拦截，静默失败即可
      enterFs();
    }
  } catch (e) {}
  // 记录开关状态（供下次启动尝试恢复）
  const obs = new MutationObserver(() => {
    const el = document.getElementById('sf-fullscreen');
    if (el) store.set(FS_KEY, el.checked ? '1' : '0');
  });
  const el0 = document.getElementById('sf-fullscreen');
  if (el0) { obs.observe(el0, { attributes: true, attributeFilter: ['checked'] }); }
})();
