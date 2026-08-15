// ===== 功能：音效设置（v3.5.60） =====
// 本地上传音频，设置三类音效：
//  - 联系人来电铃声（sfx-ring）
//  - 联系人发送/回复消息音效（sfx-in）
//  - 我发送消息音效（sfx-out）
// 未设置的音效不播放；设置后对应事件自动播放
(function () {
  const uid = 'xy-home-v2';
  const store = window.xyStore(uid);
  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2200);
  }
  const KEYS = { ring: 'sfx-ring', in: 'sfx-in', out: 'sfx-out' };
  const NAMES = { ring: '联系人来电铃声', in: '联系人发送和回复消息', out: '我发送消息' };

  // 播放音效（每次新建 Audio，避免并发冲突；无设置不播）
  window.playSfx = function (type) {
    try {
      const data = store.get(KEYS[type]);
      if (!data) return;
      const a = new Audio(data);
      a.volume = 0.9;
      a.play().catch(() => {});
    } catch (e) {}
  };

  // 上传音频：FileReader → dataURL（超 3MB 提示可能过大）
  function bindUpload(key, id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        if (f.size > 3 * 1024 * 1024) { toast('音频较大（>3MB），可能占用较多存储空间'); }
        toast('正在读取音频…');
        const reader = new FileReader();
        reader.onload = () => {
          store.set(KEYS[key], reader.result);
          updateVals();
          toast(NAMES[key] + '音效已设置');
        };
        reader.onerror = () => { toast('音频读取失败'); };
        reader.readAsDataURL(f);
      };
      input.click();
    });
  }
  // 试听
  function bindPlay(key, id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!store.get(KEYS[key])) { toast('请先上传' + NAMES[key] + '音效'); return; }
      window.playSfx(key);
    });
  }
  // 清除
  function bindClear(key, id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      store.remove(KEYS[key]);
      updateVals();
      toast(NAMES[key] + '音效已清除');
    });
  }
  // 状态显示
  function updateVals() {
    [['ring', 'sfx-ring-val'], ['in', 'sfx-in-val'], ['out', 'sfx-out-val']].forEach(([key, valId]) => {
      const el = document.getElementById(valId);
      if (el) el.textContent = store.get(KEYS[key]) ? '已设置' : '未设置';
    });
  }

  bindUpload('ring', 'sfx-ring-upload');
  bindPlay('ring', 'sfx-ring-play');
  bindClear('ring', 'sfx-ring-clear');
  bindUpload('in', 'sfx-in-upload');
  bindPlay('in', 'sfx-in-play');
  bindClear('in', 'sfx-in-clear');
  bindUpload('out', 'sfx-out-upload');
  bindPlay('out', 'sfx-out-play');
  bindClear('out', 'sfx-out-clear');
  updateVals();

  // 设置页入口：点行 → 独立音效设置页；返回回设置页
  // 事件委托绑定（document 级）：确保点击一定生效，不受其他脚本/异常影响
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('#row-sfx-settings')) {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const sp = document.getElementById('page-sfx-settings');
      if (sp) sp.hidden = false;
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('#sfx-back')) {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const sp = document.getElementById('page-setting');
      if (sp) sp.hidden = false;
    }
  });
})();
