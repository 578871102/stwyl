// ===== 功能：后台保活 + 后台通知（仿星言简约版） =====
// 后台保活：播放静音音频（1Hz 正弦波，音量 0.0001）保持页面定时器活跃，
//           并请求屏幕常亮（wakeLock），防止浏览器后台休眠导致消息/回复停止；
//           首次交互时恢复 AudioContext（浏览器自动播放策略要求）。
// 后台通知：开启后，页面不在前台时收到 TA 的新消息会弹出浏览器通知。
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cc-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }

  // ================= 后台保活 =================
  let keepAudio = null;
  let keepInterval = null;
  let keepEnabled = false;

  function startKeepAlive(showToast) {
    if (keepAudio) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 1;      // 1Hz，人耳基本听不见
      gain.gain.value = 0.0001;     // 近零音量
      osc.start();
      keepAudio = { ctx: ctx, osc: osc, gain: gain };

      // 用户首次交互时恢复 AudioContext（浏览器自动播放策略要求）
      if (ctx.state === 'suspended') {
        const resumeOnInteraction = function () {
          if (keepAudio && keepAudio.ctx && keepAudio.ctx.state === 'suspended') {
            keepAudio.ctx.resume().catch(function () {});
          }
        };
        document.addEventListener('click', resumeOnInteraction, { once: true });
        document.addEventListener('touchstart', resumeOnInteraction, { once: true });
        document.addEventListener('keydown', resumeOnInteraction, { once: true });
      }
      // 每 5 秒尝试恢复（防止休眠导致 AudioContext 挂起）
      keepInterval = setInterval(function () {
        if (keepAudio && keepAudio.ctx && keepAudio.ctx.state === 'suspended') {
          keepAudio.ctx.resume().catch(function () {});
        }
      }, 5000);

      // 屏幕常亮（wakeLock），释放后自动重试
      let wakeSentinel = null;
      const requestWakeLock = function () {
        if (navigator.wakeLock && document.visibilityState === 'visible') {
          navigator.wakeLock.request('screen').then(function (sentinel) {
            wakeSentinel = sentinel;
            if (wakeSentinel) {
              wakeSentinel.addEventListener('release', function () {
                setTimeout(function () { if (keepEnabled) requestWakeLock(); }, 1000);
              });
            }
          }).catch(function () {});
        }
      };
      requestWakeLock();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && keepEnabled) requestWakeLock();
      });

      if (showToast) toast('后台保活已启动');
      // 浏览器通知提示
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('后台保活已启动', { body: '正在播放静音音频以保持后台活跃，请勿关闭此页面' });
        }
      } catch (e) {}
    } catch (e) {}
  }
  function stopKeepAlive(showToast) {
    try { if (keepAudio) { keepAudio.osc.stop(); keepAudio.ctx.close(); } } catch (e) {}
    clearInterval(keepInterval);
    keepAudio = null;
    keepInterval = null;
    if (showToast) toast('后台保活已关闭');
  }
  const kaBtn = document.getElementById('bg-keepalive');
  function syncKeepUI() { if (kaBtn) kaBtn.checked = keepEnabled; }
  if (kaBtn) {
    kaBtn.addEventListener('change', function () {
      keepEnabled = kaBtn.checked;
      store.set('bg-keepalive', keepEnabled ? '1' : '0');
      if (keepEnabled) startKeepAlive(true);
      else stopKeepAlive(true);
    });
  }
  (function () {
    const saved = store.get('bg-keepalive');
    keepEnabled = saved === null ? false : saved === '1';
    syncKeepUI();
    if (keepEnabled) startKeepAlive(false);
  })();

  // ================= 后台通知 =================
  let notifyEnabled = false;
  function requestNotifyPermission(cb) {
    if (!('Notification' in window)) { toast('浏览器不支持通知'); return; }
    if (Notification.permission === 'granted') { if (cb) cb(); return; }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(function (p) {
        if (p === 'granted' && cb) cb();
      });
    } else {
      toast('通知权限被拒绝，请在浏览器设置中允许');
    }
  }
  const nbBtn = document.getElementById('bg-notify');
  function syncNotifyUI() { if (nbBtn) nbBtn.checked = notifyEnabled; }
  if (nbBtn) {
    nbBtn.addEventListener('change', function () {
      if (nbBtn.checked) {
        requestNotifyPermission(function () {
          notifyEnabled = true;
          store.set('bg-notify', '1');
          syncNotifyUI();
          try { new Notification('通知已开启', { body: '后台消息提醒将正常弹窗' }); } catch (e) {}
        });
      } else {
        notifyEnabled = false;
        store.set('bg-notify', '0');
        syncNotifyUI();
      }
    });
  }
  (function () {
    const saved = store.get('bg-notify');
    notifyEnabled = saved === '1';
    syncNotifyUI();
  })();

  // 供 chat.js 调用：收到 TA 新消息且页面不在前台时弹浏览器通知
  window.bgNotifyCheck = function (text) {
    if (!notifyEnabled) return;
    if (document.visibilityState === 'visible') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const name = store.get('lbl-partner') || 'TA';
      const body = text && text.length > 40 ? text.slice(0, 40) + '…' : (text || '收到一条新消息');
      const n = new Notification(name, { body: body });
      setTimeout(function () { try { n.close(); } catch (e) {} }, 6000);
    } catch (e) {}
  };
})();
