// ===== 功能：情侣空间个性化 =====
// 头像上传、签名、纪念日照片、手机背景、自定义图标、恋爱纪念日、每日打卡（localStorage 持久化）
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };

  // 图片压缩后再存储：大幅缩小体积，本地存储容量更宽松（头像/图标 256px，背景/照片 1000px）
  function compressImage(dataUrl, maxSide) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.85));
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // 头像（位于桌面纪念日卡片内，点击不触发卡片背景上传）
  function bindAvatar(id, key) {
    const box = document.getElementById(id);
    if (!box) return;
    const ring = box.querySelector('.ring');
    const saved = store.get(key);
    if (saved && ring) ring.innerHTML = '<img src="' + saved + '" alt="">';
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          compressImage(reader.result, 256).then(data => {
            if (ring) ring.innerHTML = '<img src="' + data + '" alt="">';
            store.set(key, data);
          });
        };
        reader.readAsDataURL(f);
      };
      input.click();
    });
  }
  bindAvatar('avatar-user', 'avatar-user');
  bindAvatar('avatar-partner', 'avatar-partner');

  // 通用弹层：IAB 不支持 prompt/confirm，用页面内模态框替代；支持输入 / 色板
  (function () {
    const mask = document.getElementById('modal-mask');
    const title = document.getElementById('modal-title');
    const staticEl = document.getElementById('modal-static');
    const input = document.getElementById('modal-input');
    const textarea = document.getElementById('modal-textarea');
    const swatches = document.getElementById('modal-swatches');
    const pillsEl = document.getElementById('modal-pills');
    const colorInput = document.getElementById('modal-color');
    const customBtn = document.getElementById('modal-custom');
    const selectEl = document.getElementById('modal-select');
    const fileBtn = document.getElementById('modal-file');
    const fileInput = document.getElementById('modal-file-input');
    const okBtn = document.getElementById('modal-ok');
    const cancelBtn = document.getElementById('modal-cancel');
    if (!mask || !input) return;
    let cb = null;
    let pillsOnOk = null;
    let noInput = false;
    let picked = -1;
    let customVal = null;
    let pillVal = null;
    let selectedGroup = null;
    window.openModal = function (t, v, fn, opts) {
      opts = opts || {};
      pillsOnOk = opts.pillsOnOk || null;
      noInput = !!(opts.noInput);
      title.textContent = t;
      if (staticEl) {
        staticEl.hidden = !opts.staticText;
        staticEl.textContent = opts.staticText || '';
      }
      input.hidden = noInput || !!opts.textarea;
      input.value = v || '';
      if (textarea) {
        textarea.hidden = !opts.textarea;
        if (opts.textarea) {
          textarea.value = v || '';
          textarea.placeholder = opts.textareaPlaceholder || '多行内容';
        }
      }
      // 目标分组下拉
      if (selectEl) {
        selectEl.hidden = !(opts.groups && opts.groups.length);
        selectEl.innerHTML = '';
        selectedGroup = null;
        if (opts.groups && opts.groups.length) {
          const none = document.createElement('option');
          none.value = '';
          none.textContent = '导入到新分组（按【组名】识别）';
          selectEl.appendChild(none);
          opts.groups.forEach(g => {
            const o = document.createElement('option');
            o.value = g;
            o.textContent = '导入到现有分组：' + g;
            selectEl.appendChild(o);
          });
        }
      }
      // txt 文件导入
      if (fileBtn) {
        fileBtn.hidden = !opts.txtImport;
        fileBtn.onclick = () => { if (fileInput) fileInput.click(); };
      }
      // 色板
      swatches.hidden = !(opts.swatches && opts.swatches.length);
      swatches.innerHTML = '';
      picked = -1;
      customVal = null;
      if (opts.swatches && opts.swatches.length) {
        opts.swatches.forEach((label, i) => {
          const s = document.createElement('span');
          s.className = 'sw' + (i === opts.pick ? ' on' : '');
          s.style.background = label.color;
          s.title = label.label;
          s.addEventListener('click', () => {
            Array.prototype.forEach.call(swatches.children, c => c.classList.remove('on'));
            s.classList.add('on');
            picked = i;
            customBtn.classList.remove('on');
          });
          swatches.appendChild(s);
        });
      }
      // 选项胶囊（pills）
      pillsEl.hidden = !(opts.pills && opts.pills.length);
      pillsEl.innerHTML = '';
      pillVal = opts.pill !== undefined ? opts.pill : null;
      if (opts.pills && opts.pills.length) {
        opts.pills.forEach(p => {
          const b = document.createElement('button');
          b.className = 'pill' + (p.value === pillVal ? ' on' : '');
          b.textContent = p.label;
          b.addEventListener('click', () => {
            Array.prototype.forEach.call(pillsEl.children, c => c.classList.remove('on'));
            b.classList.add('on');
            pillVal = p.value;
          });
          pillsEl.appendChild(b);
        });
      }
      // 自定义取色（简约按钮）
      customBtn.hidden = !opts.colorPicker;
      customBtn.classList.remove('on');
      if (opts.colorPicker && opts.pick === -2) customBtn.classList.add('on');
      if (opts.color) colorInput.value = opts.color;
      cb = fn;
      mask.hidden = false;
      setTimeout(() => { if (!noInput && input) input.focus(); }, 60);
    };
    customBtn.addEventListener('click', () => colorInput.click());
    colorInput.addEventListener('change', () => {
      customVal = colorInput.value;
      Array.prototype.forEach.call(swatches.children, c => c.classList.remove('on'));
      customBtn.classList.add('on');
      picked = -2;
    });
    function close() { mask.hidden = true; cb = null; }
    function fire() {
      if (!cb) return;
      if (pillsEl && !pillsEl.hidden) {
        if (pillsOnOk) pillsOnOk(pillVal);
        cb(pillVal);
        return;
      }
      if (textarea && !textarea.hidden) { cb(textarea.value, selectedGroup); return; }
      if (swatches.hidden) cb(noInput ? 'ok' : input.value);
      else if (picked === -2 && customVal) cb(customVal);
      else if (picked >= 0) cb(picked);
    }
    // 分组下拉变化
    if (selectEl) {
      selectEl.addEventListener('change', () => { selectedGroup = selectEl.value || null; });
    }
    // txt 文件读取
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          const txt = String(reader.result || '');
          if (textarea) textarea.value = txt; // 填入文本框，由用户确认
        };
        reader.readAsText(f);
        fileInput.value = '';
      });
    }
    okBtn.addEventListener('click', () => { fire(); close(); });
    cancelBtn.addEventListener('click', close);
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { fire(); close(); }
    });
  })();

  // 昵称（点击「我」/「TA」下方文字，弹层修改）
  function bindLabel(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const saved = store.get(key);
    if (saved) el.textContent = saved;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.openModal) {
        window.openModal('修改昵称', el.textContent, (v) => {
          const val = (v || '').trim();
          if (val) {
            el.textContent = val;
            store.set(key, val);
            // 同步聊天页顶部标题（联系人的昵称）
            if (key === 'lbl-partner') {
              const pname = document.getElementById('chat-partner-name');
              if (pname) pname.textContent = val;
            }
          }
        });
      }
    });
  }
  bindLabel('lbl-user', 'lbl-user');
  bindLabel('lbl-partner', 'lbl-partner');

  // 上传手机背景图片：设为 .phone 全屏背景铺满整个手机屏幕，仅桌面显示；localStorage 持久化
  const phoneEl = document.querySelector('.phone');
  const bgRow = document.getElementById('row-bg-upload');
  const bgVal = document.getElementById('bg-val');
  const bgRemove = document.getElementById('row-bg-remove');
  const bgHome = document.getElementById('page-phone');
  const applyPhoneBg = (data) => {
    if (!phoneEl) return;
    // 壁纸铺满整个手机屏幕（含状态栏/导航条区域），且只在桌面显示
    phoneEl.style.backgroundImage = 'url("' + data + '")';
    phoneEl.style.backgroundSize = 'cover';
    phoneEl.style.backgroundPosition = 'center';
    phoneEl.style.backgroundAttachment = 'scroll';
    if (bgHome) {
      bgHome.classList.add('has-bg');
      bgHome.style.backgroundImage = 'none';
    }
  };
  const syncBgUI = () => {
    const has = !!store.get('phone-bg');
    if (bgVal) bgVal.textContent = has ? '已设置' : '';
    if (bgRemove) bgRemove.hidden = !has;
  };
  const clearPhoneBg = () => {
    if (phoneEl) phoneEl.style.backgroundImage = '';
    if (bgHome) {
      bgHome.classList.remove('has-bg');
      bgHome.style.backgroundImage = '';
    }
    try { localStorage.removeItem(uid + ':phone-bg'); } catch (e) {}
    syncBgUI();
  };
  if (bgRow) {
    const savedBg = store.get('phone-bg');
    if (savedBg) applyPhoneBg(savedBg);
    syncBgUI();
    bgRow.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          compressImage(reader.result, 1000).then(data => {
            applyPhoneBg(data);
            store.set('phone-bg', data);
            syncBgUI();
          });
        };
        reader.readAsDataURL(f);
      };
      input.click();
    });
  }
  if (bgRemove) {
    bgRemove.addEventListener('click', () => clearPhoneBg());
  }

  // 壁纸只在桌面显示：桌面时铺满全屏，切到字卡库/设置/聊天时隐藏（数据保留）
  const bgData = () => store.get('phone-bg');
  const applyBgVisibility = () => {
    if (!phoneEl) return;
    const home = document.getElementById('page-phone');
    const show = home && !home.hidden && bgData();
    if (show) {
      phoneEl.style.backgroundImage = 'url("' + bgData() + '")';
      phoneEl.style.backgroundSize = 'cover';
      phoneEl.style.backgroundPosition = 'center';
      phoneEl.style.backgroundAttachment = 'scroll';
    } else {
      phoneEl.style.backgroundImage = '';
    }
  };
  // 页面切换时同步壁纸显示
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', applyBgVisibility));
  document.querySelectorAll('.app[data-app="chat"]').forEach(a => a.addEventListener('click', applyBgVisibility));
  document.getElementById('chat-back') && document.getElementById('chat-back').addEventListener('click', applyBgVisibility);
  // 监听桌面容器 hidden 变化（兜底）
  const homePage = document.getElementById('page-phone');
  if (homePage) {
    const mo = new MutationObserver(applyBgVisibility);
    mo.observe(homePage, { attributes: true, attributeFilter: ['hidden'] });
  }
  applyBgVisibility();

  // 自定义手机桌面图标：点击设置项切到手机页进入编辑模式，再点击目标 app 上传替换
  // 注意：桌面分页后可能存在多个 .app-grid，全部绑定
  const grids = document.querySelectorAll('.app-grid');
  const restoreAppIcons = () => {
    document.querySelectorAll('.app').forEach(app => {
      const saved = store.get('app-icon-' + app.dataset.app);
      if (saved) {
        const ico = app.querySelector('.app-ico');
        if (ico) ico.innerHTML = '<img src="' + saved + '" alt="">';
      }
    });
  };
  restoreAppIcons();

  grids.forEach(grid => {
    grid.addEventListener('click', (e) => {
      if (!grid.classList.contains('editing')) return;
      const app = e.target.closest('.app');
      if (!app) return;
      e.stopPropagation();
      const key = app.dataset.app;
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) { return; }
        const reader = new FileReader();
        reader.onload = () => {
          compressImage(reader.result, 256).then(data => {
            const ico = app.querySelector('.app-ico');
            if (ico) ico.innerHTML = '<img src="' + data + '" alt="">';
            store.set('app-icon-' + key, data);
            // 持续装修：上传后保持编辑模式，手动点击"退出装修模式"才退出
          });
        };
        reader.readAsDataURL(f);
      };
      input.click();
    });
  });

  const iconRow = document.getElementById('row-custom-icon');
  if (iconRow) {
    iconRow.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const phoneTab = document.querySelector('.tab[data-page="page-phone"]');
      if (phoneTab) phoneTab.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const phonePage = document.getElementById('page-phone');
      if (phonePage) phonePage.hidden = false;
      grids.forEach(g => g.classList.add('editing'));
      const bar = document.getElementById('decor-bar');
      if (bar) bar.hidden = false;
    });
  }

  // 退出装修模式（含桌面顶部"完成"按钮）
  function exitDecor() {
    grids.forEach(g => g.classList.remove('editing'));
    const bar = document.getElementById('decor-bar');
    if (bar) bar.hidden = true;
  }
  const decorDone = document.getElementById('decor-done');
  if (decorDone) {
    decorDone.addEventListener('click', exitDecor);
  }

  // 点击底部 tab 切换页面时退出图标编辑模式
  const tabbar = document.querySelector('.tabbar');
  if (tabbar && grids.length) {
    tabbar.addEventListener('click', () => {
      grids.forEach(g => g.classList.remove('editing'));
      const bar = document.getElementById('decor-bar');
      if (bar) bar.hidden = true;
    });
  }

  // 已摸鱼天数：按和 TA 打卡或聊天的自然日统计
  function fishToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function getFishLog() {
    try { return JSON.parse(localStorage.getItem(uid + ':fish-log') || '[]'); } catch (e) { return []; }
  }
  function logFish() {
    const list = getFishLog();
    const t = fishToday();
    if (list.indexOf(t) === -1) {
      list.push(t);
      try { localStorage.setItem(uid + ':fish-log', JSON.stringify(list)); } catch (e) {}
    }
    updateFishDays();
  }
  function updateFishDays() {
    const el = document.getElementById('fish-days');
    if (el) el.textContent = getFishLog().length || 0;
  }
  window.logFish = logFish; // 供聊天页调用
  updateFishDays();

  // 兼容旧数据：以前打过卡但未计入摸鱼天数的，自动补记（旧标记视为今天打卡）
  (function () {
    const ck = store.get('checkin');
    if (ck) {
      const d = ck === '1' ? fishToday() : ck; // 旧格式 '1' -> 今天；新格式为日期
      const list = getFishLog();
      if (list.indexOf(d) === -1) {
        list.push(d);
        try { localStorage.setItem(uid + ':fish-log', JSON.stringify(list)); } catch (e) {}
        updateFishDays();
      }
    }
  })();

  // 今日情话：每天固定随机一条（按日期种子，当天不变，隔天换新）
  // 字卡库「桌面今日情话」可自定义字卡库；未自定义时用默认库
  (function () {
    const el = document.getElementById('love-quote');
    if (!el) return;
    const text = (window.getQuoteOfDay && window.getQuoteOfDay()) || '我偏爱你。';
    el.textContent = text;
    // 今日情话存档：每天一条，全部历史保存在主页（同一天不重复）
    try {
      const today = fishToday();
      const list = JSON.parse(store.get('quote-history') || '[]');
      if (!list.length || list[0].date !== today) {
        list.unshift({ date: today, text: text, ts: Date.now() });
        store.set('quote-history', JSON.stringify(list));
      }
    } catch (e) {}
  })();

  // 恋爱纪念日：已在一起天数（默认不预设日期，设置页选择后显示）
  function updateLove() {
    const start = store.get('love-start');
    const daysEl = document.getElementById('love-days');
    const dateEl = document.getElementById('love-date');
    const mDays = document.getElementById('mem-love-days');
    const mDate = document.getElementById('mem-love-date');
    const mNext = document.getElementById('mem-next');
    if (!start) {
      if (daysEl) daysEl.textContent = '';
      if (dateEl) dateEl.textContent = '';
      if (mDays) mDays.textContent = '—';
      if (mDate) mDate.textContent = '';
      if (mNext) mNext.textContent = '请先设置恋爱纪念日';
      return;
    }
    const d = new Date(start + 'T00:00:00');
    if (isNaN(d.getTime())) return;
    const days = Math.max(1, Math.round((new Date() - d) / 864e5));
    const fmt = start.split('-').join('.');
    if (daysEl) daysEl.textContent = days + ' 天';
    if (dateEl) dateEl.textContent = fmt + ' 起 · 我们在一起';
    if (mDays) mDays.textContent = days;
    if (mDate) mDate.textContent = fmt + ' 起 · 我们在一起';
    // 下一个纪念日倒计时（下次同月同日）
    const now = new Date();
    const ann = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (ann.getTime() < now.getTime()) ann.setFullYear(ann.getFullYear() + 1);
    const cd = Math.ceil((ann - now) / 864e5);
    if (mNext) mNext.textContent = '还有 ' + cd + ' 天 · ' + (ann.getMonth() + 1) + ' 月 ' + ann.getDate() + ' 日';
  }
  updateLove();

  // 设置页恋爱纪念日：原生日期选择器（任何浏览器/手机上都能点开）
  const dateInput = document.getElementById('love-date-input');
  if (dateInput) {
    const saved = store.get('love-start');
    if (saved) dateInput.value = saved;
    dateInput.addEventListener('change', () => {
      if (dateInput.value) {
        store.set('love-start', dateInput.value);
        updateLove();
      }
    });
  }

  // 其他纪念日：可自由添加/删除（存本地）
  function getExtras() {
    try { return JSON.parse(store.get('mem-extras') || '[]'); } catch (e) { return []; }
  }
  function saveExtras(list) { store.set('mem-extras', JSON.stringify(list)); }
  function renderExtras() {
    const list = document.getElementById('mem-extra-list');
    if (!list) return;
    const extras = getExtras();
    list.innerHTML = '';
    extras.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'mem-extra';
      const days = Math.max(0, Math.round((new Date() - new Date(it.date + 'T00:00:00')) / 864e5));
      const fmt = it.date.split('-').join('.');
      d.innerHTML =
        '<span class="me-name">' + it.name + '</span>' +
        '<span class="me-date">' + fmt + '</span>' +
        '<span class="me-days">已 ' + days + ' 天</span>' +
        '<button class="me-del">✕</button>';
      d.querySelector('.me-del').addEventListener('click', () => {
        const ex = getExtras();
        ex.splice(i, 1);
        saveExtras(ex);
        renderExtras();
      });
      list.appendChild(d);
    });
  }
  const memAdd = document.getElementById('mem-add');
  if (memAdd) {
    memAdd.addEventListener('click', () => {
      if (window.openModal) {
        window.openModal('添加纪念日', '', (raw) => {
          // 支持两行：名称 + 日期，或一行 "名称 日期"
          const lines = String(raw || '').split('\n').map(l => l.trim()).filter(Boolean);
          if (!lines.length) return;
          let name = '', date = '';
          if (lines.length >= 2) {
            name = lines[0];
            date = lines[1];
          } else {
            const m = lines[0].match(/^(.+?)\s+(\d{4}-\d{1,2}-\d{1,2})$/);
            if (m) { name = m[1]; date = m[2]; }
            else { name = lines[0]; }
          }
          // 名称后跟日期选择
          if (!date) {
            // 名称已定，弹日期选择
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.style.display = 'none';
            document.body.appendChild(dateInput);
            dateInput.addEventListener('change', () => {
              if (dateInput.value) {
                const ex = getExtras();
                ex.push({ name: name || '纪念日', date: dateInput.value });
                saveExtras(ex);
                renderExtras();
              }
              dateInput.remove();
            });
            dateInput.click();
            return;
          }
          if (name && date) {
            const ex = getExtras();
            ex.push({ name: name, date: date });
            saveExtras(ex);
            renderExtras();
          }
        }, { textarea: true, textareaPlaceholder: '纪念日名称\n日期（如 2024-05-20）' });
      }
    });
  }

  // 纪念页：桌面【纪念】图标进入
  const memApp = document.querySelector('.app[data-app="memory"]');
  const memPage = document.getElementById('page-memory');
  if (memApp && memPage) {
    memApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      updateLove();
      renderExtras();
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      memPage.hidden = false;
    });
  }
  const memBack = document.getElementById('mem-back');
  if (memBack) {
    memBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const phonePage = document.getElementById('page-phone');
      if (phonePage) phonePage.hidden = false;
    });
  }

  // 清除本地数据（重置所有自定义内容）
  const resetRow = document.getElementById('row-reset');
  if (resetRow) {
    resetRow.addEventListener('click', () => {
      if (window.openModal) {
        window.openModal('确认清除所有本地数据？（头像、昵称、背景、图标、纪念日、打卡）', '', () => {
          try {
            Object.keys(localStorage)
              .filter(k => k.indexOf(uid + ':') === 0)
              .forEach(k => localStorage.removeItem(k));
          } catch (e) {}
          location.reload();
        }, { noInput: true });
      }
    });
  }

  // 每日打卡
  const checkin = document.querySelector('.checkin');
  if (checkin) {
    const btn = checkin.querySelector('.ck-btn');
    if (store.get('checkin')) {
      btn.textContent = '✓ 已打卡';
      btn.classList.add('done');
    }
    // 打卡反馈弹窗（IAB 用页面内弹窗）
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
    checkin.addEventListener('click', () => {
      if (btn.classList.contains('done')) {
        toast('今天已经打过卡啦');
        return;
      }
      btn.textContent = '✓ 已打卡';
      btn.classList.add('done');
      store.set('checkin', fishToday()); // 存日期，便于识别是哪天打的卡
      logFish();
      const days = getFishLog().length;
      toast('打卡成功！已摸鱼 ' + days + ' 天');
    });
  }

  // 离周末还有几天（点击摸鱼 +1，数值累计）
  const weDays = document.getElementById('weekend-days');
  const weCount = document.getElementById('weekend-count');
  const weFish = document.getElementById('weekend-fish');
  if (weDays) {
    const day = new Date().getDay(); // 0=日 6=六
    let daysTo = (6 - day + 7) % 7;   // 距周六
    if (day === 6 || day === 0) {
      weDays.textContent = day === 6 ? '今天就是周末啦' : '明天是周六 · 再摸一下';
    } else {
      weDays.textContent = '离周末还有 ' + daysTo + ' 天';
    }
  }
  if (weCount) {
    const n = parseInt(store.get('weekend-fish') || '0', 10) || 0;
    weCount.textContent = n;
  }
  // 我的摸鱼值（累计，与按钮数值一致）
  const weMineEl = document.getElementById('weekend-mine');
  const weMineName = document.getElementById('weekend-mine-name');
  if (weMineName) {
    const myName = store.get('lbl-user') || '我';
    weMineName.firstChild.textContent = myName + ' 摸鱼值 ';
  }
  if (weMineEl) {
    weMineEl.textContent = parseInt(store.get('weekend-fish') || '0', 10) || 0;
  }
  if (weFish) {
    weFish.addEventListener('click', () => {
      const n = (parseInt(store.get('weekend-fish') || '0', 10) || 0) + 1;
      store.set('weekend-fish', String(n));
      if (weCount) weCount.textContent = n;
      if (weMineEl) weMineEl.textContent = n;
      if (window.logFish) window.logFish();
    });
  }
  // 联系人摸鱼值：使用网站时每 60 秒 60% 概率 +1~10（累计，每日记录）
  // 我的摸鱼值：同样每 60 秒 60% 概率 +1~10（自动增长，按钮点击仍可 +1）
  const weTaEl = document.getElementById('weekend-ta');
  const weTaName = document.getElementById('weekend-ta-name');
  if (weTaName) {
    const name = store.get('lbl-partner') || 'TA';
    weTaName.firstChild.textContent = name + ' 摸鱼值 ';
  }
  // 每日摸鱼记录：{ date, mine, ta }（当天累计值）
  function fishDayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function fishDayLog() {
    try { return JSON.parse(store.get('fish-day-log') || '[]'); } catch (e) { return []; }
  }
  function saveFishDayLog(list) { store.set('fish-day-log', JSON.stringify(list)); }
  function recordFishDay(mine, ta) {
    const list = fishDayLog();
    const key = fishDayKey();
    const ex = list.find(x => x.date === key);
    if (ex) { ex.mine = mine; ex.ta = ta; }
    else { list.push({ date: key, mine: mine, ta: ta }); }
    if (list.length > 365) list.splice(0, list.length - 365);
    saveFishDayLog(list);
  }
  function syncFishUI() {
    const mine = parseInt(store.get('weekend-fish') || '0', 10) || 0;
    const ta = parseInt(store.get('weekend-fish-ta') || '0', 10) || 0;
    if (weMineEl) weMineEl.textContent = mine;
    if (weTaEl) weTaEl.textContent = ta;
    if (weCount) weCount.textContent = mine;
    recordFishDay(mine, ta);
    if (window.renderFishHistory) window.renderFishHistory();
  }
  if (weTaEl) {
    syncFishUI();
    setInterval(() => {
      try {
        // 联系人：60% 概率 +1~10
        if (Math.random() * 100 < 60) {
          const add = 1 + Math.floor(Math.random() * 10);
          const n = (parseInt(store.get('weekend-fish-ta') || '0', 10) || 0) + add;
          store.set('weekend-fish-ta', String(n));
        }
        // 我的：60% 概率 +1~10
        if (Math.random() * 100 < 60) {
          const add = 1 + Math.floor(Math.random() * 10);
          const n = (parseInt(store.get('weekend-fish') || '0', 10) || 0) + add;
          store.set('weekend-fish', String(n));
        }
        syncFishUI();
      } catch (e) {}
    }, 60000);
  }
  // 每日摸鱼值历史（供主页展示）
  window.getFishHistory = function () { return fishDayLog().slice().reverse(); };

  // 可二传二改的说明：点设置行 → 全屏说明页
  const licRow = document.getElementById('row-license');
  if (licRow) {
    licRow.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const licPage = document.getElementById('page-license');
      if (licPage) licPage.hidden = false;
    });
  }
  const licBack = document.getElementById('lic-back');
  if (licBack) {
    licBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const setPage = document.getElementById('page-setting');
      if (setPage) setPage.hidden = false;
    });
  }

  // 原版功能介绍：点设置行 → 全屏介绍页
  const aboutRow = document.getElementById('row-about');
  if (aboutRow) {
    aboutRow.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const aboutPage = document.getElementById('page-about');
      if (aboutPage) aboutPage.hidden = false;
    });
  }
  const aboutBack = document.getElementById('about-back');
  if (aboutBack) {
    aboutBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const setPage = document.getElementById('page-setting');
      if (setPage) setPage.hidden = false;
    });
  }

  // 通话设置：点设置行 → 全屏设置页
  const callSettingsRow = document.getElementById('row-call-settings');
  if (callSettingsRow) {
    callSettingsRow.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const csPage = document.getElementById('page-call-settings');
      if (csPage) csPage.hidden = false;
    });
  }
})();