// ===== 功能：完整通话系统（仿星言简约版） =====
// 来电：全屏弹窗（头像/名称/对方来电 + 接听/拒绝 + 30 秒倒计时未接）
// 去电：拨打 → 忙线/拒绝/接通/未接 概率
// 接通：显示通话时长，2 秒后最小化为通话小框（底部悬浮，可挂断）
// 概率（与星言一致）：来电 8% / 接通 70% / 忙线 15% / 拒绝 15% / 对方挂断 0.01%（每 30 秒检查）
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  const CALL = { incoming: 8, pickup: 70, busy: 15, reject: 15, hangup: 0.01 };
  // 从回复设置读取（可自由调整概率，与星言通话设置一致）
  function callCfg() {
    const c = (window.replyCfg && window.replyCfg()) || {};
    return {
      incoming: c['call-incoming'] !== undefined ? c['call-incoming'] : CALL.incoming,
      pickup: c['call-pickup'] !== undefined ? c['call-pickup'] : CALL.pickup,
      busy: c['call-busy'] !== undefined ? c['call-busy'] : CALL.busy,
      reject: c['call-reject'] !== undefined ? c['call-reject'] : CALL.reject,
      hangup: c['call-hangup'] !== undefined ? c['call-hangup'] : CALL.hangup
    };
  }

  let currentCall = null; // { direction, status, startTime, connectedTime, timer }
  let durationTimer = null;

  const mask = document.getElementById('call-mask');
  const mini = document.getElementById('call-mini');
  const avEl = document.getElementById('call-av');
  const nameEl = document.getElementById('call-name');
  const statusEl = document.getElementById('call-status');
  const durEl = document.getElementById('call-duration');
  const cdEl = document.getElementById('call-countdown');
  const hangBtn = document.getElementById('call-hang-btn');
  const rejectBtn = document.getElementById('call-reject-btn');
  const answerBtn = document.getElementById('call-answer-btn');
  const miniBtn = document.getElementById('call-minimize-btn');
  const miniAv = document.getElementById('call-mini-av');
  const miniName = document.getElementById('call-mini-name');
  const miniTime = document.getElementById('call-mini-time');
  // 小框位置持久化（可拖动）
  let miniPos = null;
  try { miniPos = JSON.parse(store.get('call-mini-pos') || 'null'); } catch (e) {}
  if (miniPos && mini) {
    mini.style.left = miniPos.left;
    mini.style.left = miniPos.left;
    mini.style.top = miniPos.top;
    mini.style.bottom = 'auto';
    mini.style.transform = 'none';
  }

  function partnerName() { return store.get('lbl-partner') || 'TA'; }
  function partnerAv() { return store.get('avatar-partner') || ''; }
  function fillAv(el, data) {
    if (!el) return;
    el.innerHTML = data
      ? '<img src="' + data + '" alt="头像">'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>';
  }
  function fmtDur(sec) {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s);
  }
  function setMaskBtns(mode) {
    // mode: 'ringing' 来电(接听/拒绝) | 'calling' 去电中(挂断+缩小) | 'active' 通话中(挂断+缩小) | 'none'
    if (hangBtn) hangBtn.hidden = !(mode === 'calling' || mode === 'active');
    if (rejectBtn) rejectBtn.hidden = !(mode === 'ringing');
    if (answerBtn) answerBtn.hidden = !(mode === 'ringing');
    if (miniBtn) miniBtn.hidden = !(mode === 'calling' || mode === 'active');
  }
  // 缩小到小框（弹层 → 底部小框）
  function minimizeCall() {
    if (!currentCall) return;
    if (mask) mask.hidden = true;
    if (cdEl) cdEl.hidden = true;
    if (mini) {
      if (miniName) miniName.textContent = partnerName();
      fillAv(miniAv, partnerAv());
      mini.hidden = false;
    }
  }
  function stopTimers() {
    if (durationTimer) { clearInterval(durationTimer); durationTimer = null; }
  }
  function updateDur() {
    if (!currentCall) return;
    const sec = Math.floor((Date.now() - currentCall.startTime) / 1000);
    if (durEl) durEl.textContent = fmtDur(sec);
    if (miniTime) miniTime.textContent = fmtDur(sec);
  }
  // 进入通话中：计时 + 状态
  function startCallDuration() {
    stopTimers();
    currentCall.connectedTime = Date.now();
    let checkCount = 0;
    durationTimer = setInterval(() => {
      updateDur();
      // 对方挂断概率：接通 10 秒保护期后，每 30 秒检查一次（星言一致）
      if (currentCall && currentCall.status === 'connected') {
        if (Date.now() - currentCall.connectedTime >= 10000) {
          checkCount++;
          if (checkCount >= 30) {
            checkCount = 0;
            if (Math.random() * 100 < callCfg().hangup) {
              endCall('对方挂断了电话');
            }
          }
        }
      }
    }, 1000);
  }
  // 结束通话：清界面 + 聊天消息 + 记录
  function endCall(text) {
    stopTimers();
    if (mask) mask.hidden = true;
    if (mini) mini.hidden = true;
    if (cdEl) cdEl.hidden = true;
    if (currentCall) {
      const dur = currentCall.durationSec || 0;
      const dir = currentCall.direction;
      const name = partnerName();
      if (window.chatAddSystem) {
        window.chatAddSystem('<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>' +  (dir === 'in' ? name + ' 来电' : '我拨打 ' + name) + ' · ' + text + (dur ? '（' + fmtDur(dur) + '）' : ''));
      }
      if (window.addCallRecord) window.addCallRecord(dir, text + (dur ? '（' + fmtDur(dur) + '）' : ''));
    }
    currentCall = null;
  }
  // 来电
  function incomingCall() {
    if (currentCall) return;
    const name = partnerName();
    currentCall = { direction: 'in', status: 'ringing', startTime: Date.now(), durationSec: 0 };
    fillAv(avEl, partnerAv());
    fillAv(miniAv, partnerAv());
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = '对方来电...';
    if (durEl) durEl.textContent = '00:00';
    if (mask) mask.hidden = false;
    setMaskBtns('ringing');
    if (window.chatAddSystem) window.chatAddSystem('<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>' +  name + ' 给你打来了语音通话');
    // 30 秒倒计时未接
    let count = 30;
    if (cdEl) { cdEl.hidden = false; cdEl.textContent = count + ' 秒后未接听'; }
    const t = setInterval(() => {
      if (!currentCall || currentCall.status !== 'ringing') { clearInterval(t); return; }
      count--;
      if (count <= 0) {
        clearInterval(t);
        if (cdEl) cdEl.hidden = true;
        currentCall.status = 'ended';
        endCall('未接听');
      } else if (cdEl) {
        cdEl.textContent = count + ' 秒后未接听';
      }
    }, 1000);
  }
  // 接听
  function answerCall() {
    if (!currentCall || currentCall.status !== 'ringing') return;
    currentCall.status = 'connected';
    if (cdEl) cdEl.hidden = true;
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = '正在通话...';
    setMaskBtns('active');
    if (window.chatAddSystem) window.chatAddSystem('<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg> 通话已接通');
    startCallDuration();
    // 2 秒后最小化小框（星言一致）
    setTimeout(() => {
      if (currentCall && currentCall.status === 'connected') {
        if (mask) mask.hidden = true;
        if (mini) {
          if (miniName) miniName.textContent = partnerName();
          fillAv(miniAv, partnerAv());
          mini.hidden = false;
        }
      }
    }, 2000);
  }
  // 拒绝
  function rejectCall() {
    if (!currentCall || currentCall.status !== 'ringing') return;
    currentCall.status = 'ended';
    endCall('已拒绝');
  }
  // 用户挂断（去电中或通话中）
  function userHangup() {
    if (!currentCall) return;
    if (currentCall.status === 'ringing') { currentCall.status = 'ended'; endCall('已取消'); return; }
    currentCall.durationSec = Math.floor((Date.now() - currentCall.startTime) / 1000);
    currentCall.status = 'ended';
    endCall('已挂断');
  }
  // 去电：拨打 → 忙线/拒绝/接通/未接（星言概率）
  window.placeCall = function () {
    if (currentCall) { toast('已有通话中'); return; }
    const name = partnerName();
    currentCall = { direction: 'out', status: 'calling', startTime: Date.now(), durationSec: 0 };
    fillAv(avEl, partnerAv());
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = '正在呼叫...';
    if (durEl) durEl.textContent = '00:00';
    if (mask) mask.hidden = false;
    setMaskBtns('calling');
    if (window.chatAddSystem) window.chatAddSystem('<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>' +  name + ' 语音通话');
    const r = Math.random() * 100;
    const cc = callCfg();
    setTimeout(() => {
      if (!currentCall || currentCall.status !== 'calling') return;
      if (r < cc.busy) {
        currentCall.status = 'ended'; endCall('忙线中');
      } else if (r < cc.busy + cc.reject) {
        currentCall.status = 'ended'; endCall('对方已拒绝');
      } else if (r < cc.busy + cc.reject + cc.pickup) {
        currentCall.status = 'connected';
        if (statusEl) statusEl.textContent = '正在通话...';
        startCallDuration();
        setTimeout(() => {
          if (currentCall && currentCall.status === 'connected') {
            if (mask) mask.hidden = true;
            if (mini) { if (miniName) miniName.textContent = partnerName(); fillAv(miniAv, partnerAv()); mini.hidden = false; }
          }
        }, 2000);
      } else {
        currentCall.status = 'ended'; endCall('未接通');
      }
    }, 1800 + Math.random() * 1500);
  };
  // 按钮绑定
  if (answerBtn) answerBtn.addEventListener('click', answerCall);
  if (rejectBtn) rejectBtn.addEventListener('click', rejectCall);
  if (hangBtn) hangBtn.addEventListener('click', userHangup);
  if (miniBtn) miniBtn.addEventListener('click', minimizeCall);
  if (document.getElementById('call-mini-hang')) document.getElementById('call-mini-hang').addEventListener('click', userHangup);
  // 小框拖拽（pointer 事件，兼容鼠标/触摸）
  if (mini) {
    let dragging = false, offX = 0, offY = 0;
    mini.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#call-mini-hang')) return; // 挂断按钮不触发拖动
      dragging = true;
      const r = mini.getBoundingClientRect();
      offX = e.clientX - r.left;
      offY = e.clientY - r.top;
      // 清除 bottom：避免与 top 同时存在导致元素被拉伸变形
      mini.style.bottom = 'auto';
      mini.setPointerCapture && mini.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    mini.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      let x = e.clientX - offX, y = e.clientY - offY;
      const mw = mini.offsetWidth, mh = mini.offsetHeight;
      x = Math.max(4, Math.min(window.innerWidth - mw - 4, x));
      y = Math.max(4, Math.min(window.innerHeight - mh - 4, y));
      mini.style.left = x + 'px';
      mini.style.top = y + 'px';
      mini.style.transform = 'none';
    });
    const endDrag = () => { dragging = false; };
    mini.addEventListener('pointerup', endDrag);
    mini.addEventListener('pointercancel', endDrag);
    mini.addEventListener('pointerup', () => {
      if (miniPos) { miniPos.left = mini.style.left; miniPos.top = mini.style.top; }
      else miniPos = { left: mini.style.left, top: mini.style.top };
      store.set('call-mini-pos', JSON.stringify(miniPos));
    });
  }

  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }

  // ================= 联系人主动来电（星言机制：每 5 分钟冷却 + 8% 概率） =================
  window.triggerIncomingCall = incomingCall;
  // 上次来电时间戳：首次 2-5 分钟后，之后每 5 分钟检查一次（概率 8%，冷却至少 5 分钟）
  function callLast() { const v = parseInt(store.get('records-call-last'), 10); return isNaN(v) ? 0 : v; }
  function maybeIncoming() {
    try {
      if (currentCall) return;
      const now = Date.now();
      const last = callLast();
      if (now - last < 300000) return; // 5 分钟冷却
      if (Math.random() * 100 >= callCfg().incoming) return;
      store.set('records-call-last', String(now));
      incomingCall();
    } catch (e) {}
  }
  setTimeout(() => {
    setInterval(maybeIncoming, 60000);
    maybeIncoming();
  }, (120 + Math.random() * 180) * 1000);
})();
