// ===== 功能：聊天设置 =====
// 聊天壁纸、双方气泡颜色/文字颜色、字体大小、气泡框大小（localStorage 持久化）
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  const root = document.documentElement;
  const body = document.getElementById('chat-body');
  if (!body) return;
  // 壁纸铺满整个聊天页（含顶部栏/输入栏）
  const chatPage = document.getElementById('page-chat');

  const FONT_SIZES = [
    { label: '小', value: '13px' },
    { label: '标准', value: '14px' },
    { label: '大', value: '16px' },
    { label: '特大', value: '18px' }
  ];
  const BUBBLE_SIZES = [
    { label: '紧凑', value: '8px 10px' },
    { label: '标准', value: '11px 14px' },
    { label: '宽松', value: '14px 18px' }
  ];
  // 气泡风格预设：一次应用整套配色（对方气泡/文字、我的气泡/文字、时间轴、输入中、发送按钮）
  const STYLES = [
    { label: '简约白', inBg: '#ffffff', inInk: '#111111', outBg: '#111111', outInk: '#ffffff', timeInk: '#111111', typingInk: '#8a8a8a', sendBg: '#111111', sendInk: '#ffffff' },
    { label: '浅灰', inBg: '#f2f2f2', inInk: '#333333', outBg: '#333333', outInk: '#f2f2f2', timeInk: '#444444', typingInk: '#999999', sendBg: '#333333', sendInk: '#ffffff' },
    { label: '暖灰', inBg: '#f5f3ee', inInk: '#3a3a35', outBg: '#3a3a35', outInk: '#f5f3ee', timeInk: '#666660', typingInk: '#9a9488', sendBg: '#3a3a35', sendInk: '#f5f3ee' },
    { label: '深色', inBg: '#2c2c2c', inInk: '#e8e8e8', outBg: '#111111', outInk: '#ffffff', timeInk: '#a0a0a0', typingInk: '#b0b0b0', sendBg: '#000000', sendInk: '#ffffff' },
    { label: '墨黑', inBg: '#3a3a3a', inInk: '#ffffff', outBg: '#0a0a0a', outInk: '#ffffff', timeInk: '#b5b5b5', typingInk: '#c0c0c0', sendBg: '#0a0a0a', sendInk: '#ffffff' }
  ];
  // 识别当前配色属于哪个预设（全部 8 项一致才算），否则显示"自定义"
  function currentStyle() {
    const cur = {
      inBg: store.get('cs-in-bg') || '#ffffff',
      inInk: store.get('cs-in-ink') || '#111111',
      outBg: store.get('cs-out-bg') || '#111111',
      outInk: store.get('cs-out-ink') || '#ffffff',
      timeInk: store.get('cs-time-ink') || '#111111',
      typingInk: store.get('cs-typing-ink') || '#8a8a8a',
      sendBg: store.get('cs-send-bg') || '#111111',
      sendInk: store.get('cs-send-ink') || '#ffffff'
    };
    for (const s of STYLES) {
      let ok = true;
      for (const k of ['inBg', 'inInk', 'outBg', 'outInk', 'timeInk', 'typingInk', 'sendBg', 'sendInk']) {
        if (cur[k] !== s[k]) { ok = false; break; }
      }
      if (ok) return s.label;
    }
    return '自定义';
  }
  function applyStyle(label) {
    const s = STYLES.find(x => x.label === label);
    if (!s) return;
    store.set('cs-in-bg', s.inBg);
    store.set('cs-in-ink', s.inInk);
    store.set('cs-out-bg', s.outBg);
    store.set('cs-out-ink', s.outInk);
    store.set('cs-time-ink', s.timeInk);
    store.set('cs-typing-ink', s.typingInk);
    store.set('cs-send-bg', s.sendBg);
    store.set('cs-send-ink', s.sendInk);
    applySettings();
  }

  function applySettings() {
    // 设置页值写入（定义在最前，避免暂时性死区）
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const inBg = store.get('cs-in-bg') || '#ffffff';
    const inInk = store.get('cs-in-ink') || '#111111';
    const outBg = store.get('cs-out-bg') || '#111111';
    const outInk = store.get('cs-out-ink') || '#ffffff';
    const fs = store.get('cs-font-size') || '14px';
    const pad = store.get('cs-bubble-size') || '11px 14px';
    root.style.setProperty('--msg-in-bg', inBg);
    root.style.setProperty('--msg-in-ink', inInk);
    root.style.setProperty('--msg-out-bg', outBg);
    root.style.setProperty('--msg-out-ink', outInk);
    root.style.setProperty('--chat-font-size', fs);
    root.style.setProperty('--chat-bubble-pad', pad);
    // 时间轴颜色（默认黑）
    const timeInk = store.get('cs-time-ink') || '#111111';
    root.style.setProperty('--msg-time-ink', timeInk);
    // 正在输入中颜色（默认灰）
    const typingInk = store.get('cs-typing-ink') || '#8a8a8a';
    root.style.setProperty('--typing-ink', typingInk);
    // 发送按钮颜色（默认黑）
    const sendBg = store.get('cs-send-bg') || '#111111';
    root.style.setProperty('--send-bg', sendBg);
    // 发送按钮文字颜色（默认白）
    const sendInk = store.get('cs-send-ink') || '#ffffff';
    root.style.setProperty('--send-ink', sendInk);
    // 聊天头像形状（circle 圆形 / square 方形）
    const avShape = store.get('cs-av-shape') || 'circle';
    root.style.setProperty('--msg-av-radius', avShape === 'square' ? '10px' : '50%');
    set('cs-av-shape-val', avShape === 'square' ? '方形' : '圆形');
    // 当前风格预设名（全部项一致才显示预设名，否则"自定义"）
    set('cs-style-preset-val', currentStyle());
    // 聊天壁纸：铺满整个聊天页
    const bg = store.get('cs-bg');
    if (bg && chatPage) {
      chatPage.style.backgroundImage = 'url("' + bg + '")';
      chatPage.style.backgroundSize = 'cover';
      chatPage.style.backgroundPosition = 'center';
    } else if (chatPage) {
      chatPage.style.backgroundImage = '';
    }
    set('cs-font-size-val', fs);
    const pn = BUBBLE_SIZES.find(p => p.value === pad);
    set('cs-bubble-size-val', pn ? pn.label : '标准');
    set('cs-bg-val', bg ? '已设置' : '');
    const rm = document.getElementById('cs-bg-remove');
    if (rm) rm.hidden = !bg;
  }
  window.applyChatSettings = applySettings;
  applySettings();

  // 各设置行
  const row = (id) => document.getElementById(id);
  const csBg = row('cs-bg-upload');
  if (csBg) {
    csBg.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          // 压缩
          const img = new Image();
          img.onload = () => {
            try {
              const c = document.createElement('canvas');
              const scale = Math.min(1, 900 / Math.max(img.width, img.height));
              c.width = Math.max(1, Math.round(img.width * scale));
              c.height = Math.max(1, Math.round(img.height * scale));
              c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
              const data = c.toDataURL('image/jpeg', 0.85);
              store.set('cs-bg', data);
              applySettings();
            } catch (e) {}
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(f);
      };
      input.click();
    });
  }
  const csBgRm = row('cs-bg-remove');
  if (csBgRm) {
    csBgRm.addEventListener('click', () => {
      try { localStorage.removeItem(uid + ':cs-bg'); } catch (e) {}
      applySettings();
    });
  }

  // 气泡风格预设
  const csStylePreset = row('cs-style-preset');
  if (csStylePreset) {
    csStylePreset.addEventListener('click', () => {
      if (!window.openModal) return;
      window.openModal('气泡风格', '', (v) => applyStyle(v), {
        pills: STYLES.map(s => ({ label: s.label, value: s.label })),
        pill: currentStyle()
      });
    });
  }
  const csAvShape = row('cs-av-shape');
  if (csAvShape) {
    csAvShape.addEventListener('click', () => {
      if (!window.openModal) return;
      window.openModal('聊天头像形状', '', (v) => { store.set('cs-av-shape', v); applySettings(); }, {
        pills: [
          { label: '圆形', value: 'circle' },
          { label: '方形', value: 'square' }
        ],
        pill: store.get('cs-av-shape') || 'circle'
      });
    });
  }
  const csFont = row('cs-font-size');
  if (csFont) {
    csFont.addEventListener('click', () => {
      if (!window.openModal) return;
      window.openModal('聊天气泡字体大小', '', (v) => { store.set('cs-font-size', v); applySettings(); }, {
        pills: FONT_SIZES,
        pill: store.get('cs-font-size') || '14px'
      });
    });
  }
  const csPad = row('cs-bubble-size');
  if (csPad) {
    csPad.addEventListener('click', () => {
      if (!window.openModal) return;
      window.openModal('聊天气泡框大小', '', (v) => { store.set('cs-bubble-size', v); applySettings(); }, {
        pills: BUBBLE_SIZES,
        pill: store.get('cs-bubble-size') || '11px 14px'
      });
    });
  }
})();
