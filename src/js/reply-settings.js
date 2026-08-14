// ===== 功能：通用设置（聊天触发概率） =====
// 存储 + 设置页 stepper/开关交互；暴露 window.replyCfg 给聊天回复逻辑使用
(function () {
  const uid = 'xy-home-v2';
  const ls = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };

  // 全部概率/参数项（与星言 speedSettings 对应）
  const DEFAULTS = {
    'rs-min': 1, 'rs-max': 40,
    'reply-min': 1, 'reply-max': 2,
    'rn-prob': 20, 'touch-prob': 5,
    'sticker-prob': 10, 'emoji-prob': 5, 'image-prob': 5, 'voice-prob': 10,
    'kaomoji-prob': 5, 'quote-prob': 5,
    'rc-prob': 25, 'rc-refix': 35, 'cf-prob': 20,
    'py-en': 1, 'py-prob': 50, 'py-min': 2, 'py-max': 5,
    'as-en': 1, 'as-prob': 10, 'as-min': 5, 'as-max': 10,
    'as-count-min': 1, 'as-count-max': 2, 'dnd-en': 0
  };

  function getCfg() {
    const out = {};
    Object.keys(DEFAULTS).forEach(k => {
      const v = ls.get('reply-' + k);
      out[k] = (v === null || v === undefined || v === '') ? DEFAULTS[k] : Number(v);
    });
    return out;
  }
  window.replyCfg = getCfg;
  window.saveReplyCfg = function (k, v) { ls.set('reply-' + k, String(v)); };

  // ---- 设置页 UI ----
  const page = document.getElementById('page-general');
  if (!page) return;

  function syncUI() {
    const cfg = getCfg();
    // stepper 数值
    document.querySelectorAll('.stepper').forEach(st => {
      const k = st.dataset.k;
      const val = st.querySelector('.stp-val');
      if (val) val.value = cfg[k] !== undefined ? cfg[k] : DEFAULTS[k];
    });
    // 开关
    ['py-en', 'as-en', 'dnd-en'].forEach(k => {
      const el = document.getElementById(k);
      if (el) el.checked = cfg[k] === 1;
    });
  }

  // stepper 交互
  document.querySelectorAll('.stepper').forEach(st => {
    const k = st.dataset.k;
    const min = parseInt(st.dataset.min, 10);
    const max = parseInt(st.dataset.max, 10);
    const step = parseInt(st.dataset.step, 10);
    const val = st.querySelector('.stp-val');
    st.querySelector('.stp-min').addEventListener('click', () => {
      const cur = parseInt(val.value, 10) || min;
      const nv = Math.max(min, cur - step);
      val.value = nv; window.saveReplyCfg(k, nv);
    });
    st.querySelector('.stp-max').addEventListener('click', () => {
      const cur = parseInt(val.value, 10) || min;
      const nv = Math.min(max, cur + step);
      val.value = nv; window.saveReplyCfg(k, nv);
    });
  });
  // 开关交互
  ['py-en', 'as-en', 'dnd-en'].forEach(k => {
    const el = document.getElementById(k);
    if (el) {
      el.addEventListener('change', () => window.saveReplyCfg(k, el.checked ? 1 : 0));
    }
  });

  syncUI();

  // 导航：设置页「通用设置」进入 / 返回
  const genBack = document.getElementById('gen-back');
  if (genBack) {
    genBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const sp = document.getElementById('page-setting');
      if (sp) sp.hidden = false;
    });
  }
  // 进入时刷新 UI
  const genRow = document.getElementById('row-general');
  if (genRow) {
    genRow.addEventListener('click', () => {
      syncUI();
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      page.hidden = false;
    });
  }
})();
