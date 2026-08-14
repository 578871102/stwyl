// ===== 功能：导出数据 / 导入数据 =====
// 导出：收集全部本地数据（localStorage + IndexedDB 音乐文件/字卡/查岗记录）打包为 JSON 下载
// 导入：读取备份 JSON，确认后覆盖恢复并刷新页面
(function () {
  const uid = 'xy-home-v2';

  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }

  // 导出：localStorage + IndexedDB
  async function doExport() {
    const data = { version: '1.0', app: 'mochi-zika', exportTime: new Date().toISOString(), ls: {}, idb: {} };
    // localStorage：全部 xy-home-v2: 键（除体积巨大的音乐文件镜像，它们只存在 IndexedDB）
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
      data = JSON.parse(await file.text());
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
      // 清空旧数据（xy-home-v2 前缀）
      try {
        Object.keys(localStorage)
          .filter(k => k.indexOf(uid + ':') === 0)
          .forEach(k => localStorage.removeItem(k));
      } catch (e) {}
      // 写入 localStorage
      Object.keys(data.ls).forEach(k => {
        if (k.indexOf(uid + ':') === 0) {
          try { localStorage.setItem(k, data.ls[k]); } catch (e) {}
        }
      });
      // 写入 IndexedDB（音乐文件 / 字卡 / 查岗）
      if (window.idbSet) {
        const writes = Object.keys(data.idb || {}).filter(k => k.indexOf(uid + ':') === 0)
          .map(k => window.idbSet(k, data.idb[k]));
        Promise.all(writes).then(() => {
          toast('导入成功，正在刷新…');
          setTimeout(() => location.reload(), 600);
        }).catch(() => {
          toast('导入成功，正在刷新…');
          setTimeout(() => location.reload(), 600);
        });
        return;
      }
      toast('导入成功，正在刷新…');
      setTimeout(() => location.reload(), 600);
    }, { noInput: true });
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
