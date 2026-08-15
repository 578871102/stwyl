// ===== 功能：PWA（安装到桌面/主屏 + beforeinstallprompt 安装按钮 + 强制更新最新版）=====
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        // v3.5.54：强制更新——检测到新 Service Worker（新部署）时，
        // 通知 sw 清旧缓存，并自动刷新页面到最新版
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              try { newWorker.postMessage({ type: 'UPDATE_READY' }); } catch (e) {}
            }
          });
        });
      }).catch(() => {});
      // 接收 sw 的强制刷新指令（旧缓存已清）
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'FORCE_RELOAD') {
          location.reload();
        }
      });
    });
  }

  let deferredPrompt = null;
  const btn = document.getElementById('pwa-install');
  const hide = () => { if (btn) btn.hidden = true; };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.hidden = false;
  });

  if (btn) {
    btn.addEventListener('click', () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((r) => {
        if (r.outcome === 'accepted') hide();
        deferredPrompt = null;
      });
    });
  }

  window.addEventListener('appinstalled', hide);
  // iOS Safari 提示（无 beforeinstallprompt）
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    const iOSHint = document.getElementById('pwa-ios-hint');
    if (iOSHint) {
      try { if (window.navigator.standalone) { iOSHint.hidden = true; return; } } catch (e) {}
      setTimeout(() => { iOSHint.hidden = false; }, 60000);
      iOSHint.addEventListener('click', () => { iOSHint.hidden = true; });
    }
  }
})();