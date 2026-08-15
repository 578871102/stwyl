// ===== 功能：导出数据 / 导入数据 =====
// 导出：收集全部本地数据（localStorage + IndexedDB 音乐文件/字卡/查岗记录）打包为 JSON 下载
// 导入：读取备份 JSON，确认后覆盖恢复并刷新页面
// v3.5.24 修复手机端导入丢数据：
//  - 写 localStorage 前先按字节估算总大小，超出配额的大键（聊天图片/头像库等）自动删掉并计数，
//    保证昵称/设置/聊天文字记录等小键全部恢复成功（不再因超配额静默丢数据）
//  - 写入失败逐条回滚（还原被清掉的旧值），不会出现"清空后写一半"的情况
//  - IndexedDB 改为逐条顺序写入（不再用 Promise.all 一拥而上，手机内存压力大时容易失败）
//  - 兼容旧 iOS 的 <input type=file> 读取（File.text() 老版本不支持时改用 FileReader）
(function () {
  const uid = 'xy-home-v2';
  // 容量余量：给正在运行的其他功能留一点（手机 localStorage 约 5MB，桌面 10MB）
  const LS_HEADROOM = 512 * 1024;

  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2600);
  }

  // 估算字符串体积（UTF-8 字节，用于配额判断）
  function byteLen(s) {
    if (s == null) return 0;
    if (typeof s !== 'string') s = JSON.stringify(s);
    let n = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0xD800 || c > 0xDFFF ? 3 : 4;
    }
    return n;
  }

  // 兼容旧 iOS：读取文件文本（File.text() 不支持时退回 FileReader）
  function readFileText(file) {
    return new Promise((resolve) => {
      if (typeof file.text === 'function') {
        file.text().then(resolve).catch(() => readViaReader());
      } else readViaReader();
      function readViaReader() {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => resolve('');
        r.readAsText(file, 'utf-8');
      }
    });
  }

  // 导出：localStorage + IndexedDB
  async function doExport() {
    const data = { version: '1.0', app: 'mochi-zika', exportTime: new Date().toISOString(), ls: {}, idb: {} };
    // localStorage：全部 xy-home-v2: 键（音乐文件本体只存 IndexedDB）
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf(uid + ':') !== 0) continue;
        data.ls[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    // IndexedDB：字卡 / 查岗 / 音乐文件等权威数据
    if (window.idbGetAllKeys) {
      try {
        const keys = await window.idbGetAllKeys();
        for (const k of keys || []) {
          if (k.indexOf(uid + ':') !== 0) continue;
          const v = await window.idbGet(k);
          if (v !== undefined && v !== null) data.idb[k] = v;
        }
      } catch (e) {}
    }
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mochi数据备份_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('数据已导出（' + Math.round(json.length / 1024) + ' KB）');
  }

  // 导入
  async function doImport(file) {
    let data;
    try {
      const text = await readFileText(file);
      data = JSON.parse(text || 'null');
    } catch (e) {
      toast('无效的数据文件');
      return;
    }
    if (!data || typeof data !== 'object' || !data.ls || typeof data.ls !== 'object') {
      toast('不是 mochi 导出的数据文件');
      return;
    }
    if (!window.openModal) return;
    window.openModal('确定导入数据？将覆盖当前所有数据（头像、昵称、聊天记录、字卡、设置等），且无法恢复。', '', () => {
      doImportGo(data);
    }, { noInput: true });
  }

  function doImportGo(data) {
    // ---- 1. 备份当前 localStorage 的 xy-home-v2 键（导入失败可回滚） ----
    let backup = null;
    try {
      backup = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(uid + ':') === 0) backup[k] = localStorage.getItem(k);
      }
    } catch (e) { backup = null; }

    // ---- 2. 先恢复 IndexedDB（字卡 / 查岗 / 音乐文件等大件挪进 IDB，不占 localStorage 配额） ----
    // 写入前先清空 IDB：否则备份里没有的旧键会残留，刷新后被 idbRestore 回填，等于没导入
    const idbRestored = new Promise((resolve) => {
      if (!window.idbSet) { resolve(true); return; }
      const clearFirst = (window.idbClearAll && window.idbClearAll()) || Promise.resolve(true);
      clearFirst.then(() => {
        if (!data.idb) { resolve(true); return; }
        const idbKeys = Object.keys(data.idb).filter(k => k.indexOf(uid + ':') === 0);
        if (!idbKeys.length) { resolve(true); return; }
        let p = Promise.resolve();
        let failed = 0;
        // 逐条顺序写入，避免手机内存压力
        idbKeys.forEach(k => {
          p = p.then(() => window.idbSet(k, data.idb[k])).then(ok => { if (!ok) failed++; });
        });
        p.then(() => resolve(failed === 0)).catch(() => resolve(false));
      });
    });

    // ---- 3. 清空旧数据（xy-home-v2 前缀） ----
    function clearLs() {
      try {
        Object.keys(localStorage)
          .filter(k => k.indexOf(uid + ':') === 0)
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
    // 回滚：还原导入前的旧数据
    function rollback() {
      clearLs();
      if (backup) {
        try {
          Object.keys(backup).forEach(k => localStorage.setItem(k, backup[k]));
        } catch (e) {}
      }
    }

    idbRestored.then((idbOk) => {
      // ---- 4. 写 localStorage 前先估算总字节；超配额时按体积从大到小丢弃大键 ----
      // 聊天记录含图片（dataURL）最容易超配额；丢弃大键后小键全部保住。
      // 聊天文字记录（chat-msgs）绝不丢；若连它一起都放不下，则整体回滚并明确提示。
      const lsKeys = Object.keys(data.ls).filter(k => k.indexOf(uid + ':') === 0);
      const entries = lsKeys.map(k => ({ k: k, len: byteLen(data.ls[k]) + byteLen(k) }));
      const total = entries.reduce((s, e) => s + e.len, 0);
      // 估算当前设备配额：探测能否写入 1MB 临时键（能 → 桌面 10MB 档；不能 → 手机 5MB 档）
      let quota = 5 * 1024 * 1024;
      try {
        const probe = 'x'.repeat(1024 * 1024);
        localStorage.setItem(uid + ':__quota_probe__', probe);
        localStorage.removeItem(uid + ':__quota_probe__');
        quota = 10 * 1024 * 1024;
      } catch (e) {}
      let budget = total;
      let dropped = [];
      const sorted = entries.slice().sort((a, b) => b.len - a.len);
      for (const e of sorted) {
        if (budget + LS_HEADROOM <= quota) break;
        if (e.k === uid + ':chat-msgs') continue; // 聊天文字记录绝不丢
        budget -= e.len;
        dropped.push(e);
      }
      if (budget + LS_HEADROOM > quota) {
        // 丢弃大键后仍放不下 → 整体回滚，不写半个数据
        rollback();
        const mb = (total / 1048576).toFixed(1);
        toast('手机存储空间不足（数据约 ' + mb + ' MB），已取消导入并保留原数据。可清理照片/音乐后重试。');
        return;
      }
      const skipSet = {};
      dropped.forEach(e => { skipSet[e.k] = true; });
      let dropBytes = dropped.reduce((s, e) => s + e.len, 0);

      clearLs();
      let writeFailed = [];
      for (const e of entries) {
        if (skipSet[e.k]) continue;
        try {
          localStorage.setItem(e.k, data.ls[e.k]);
        } catch (err) {
          writeFailed.push(e.k);
        }
      }
      // 写入有失败 → 整体回滚
      if (writeFailed.length) {
        rollback();
        toast('写入失败 ' + writeFailed.length + ' 项，已还原旧数据。请清理存储空间后重试。');
        return;
      }

      // ---- 5. 汇总 + 提示（大键丢弃 / 未装 IDB 都有明确提示，不再静默丢数据） ----
      const parts = [];
      if (idbOk) parts.push('音乐/字卡/查岗等大文件已恢复');
      if (dropped.length) {
        const mb = (dropBytes / 1048576).toFixed(1);
        parts.push('存储容量有限，已跳过超大图片/音乐 ' + dropped.length + ' 项（约 ' + mb + ' MB，可在聊天/头像库中重新添加）');
      }
      if (!parts.length) parts.push('导入成功');
      const msg = parts.join('；');
      toast(msg + '，正在刷新…');
      setTimeout(() => location.reload(), 900);
    });
  }

  // 入口绑定
  const exportRow = document.getElementById('row-export');
  if (exportRow) {
    exportRow.addEventListener('click', () => {
      toast('正在导出，请稍候…');
      doExport();
    });
  }
  const importRow = document.getElementById('row-import');
  if (importRow) {
    importRow.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (f) doImport(f);
      };
      input.click();
    });
  }
})();
