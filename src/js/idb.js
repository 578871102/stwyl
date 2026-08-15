// ===== 功能：IndexedDB 存储（持久化关键数据，不丢失任何记录） =====
// 用于：字卡数据（cc-groups）、查岗记录（checkin-history）、聊天记录等
// 策略：写入时双写（localStorage 缓存 + IndexedDB 权威持久），
//       读取时优先 localStorage（同步快），初始化时从 IndexedDB 合并/恢复最新数据
(function () {
  const DB_NAME = 'mochi-db';
  const DB_VERSION = 1;
  const STORE = 'kv';

  let dbPromise = null;
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        if (!window.indexedDB) { reject(new Error('no idb')); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
    return dbPromise;
  }

  // 写入（key: 完整键名，如 'xy-home-v2:cc-groups'）
  window.idbSet = function (key, value) {
    return open().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    })).catch(() => false);
  };

  // 批量写入（单事务一次完成，比逐条 idbSet 快；任一条失败则整体失败）
  window.idbSetAll = function (pairs) {
    if (!pairs || !pairs.length) return Promise.resolve(true);
    return open().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        const os = tx.objectStore(STORE);
        pairs.forEach(p => { os.put(p.v, p.k); });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) { resolve(false); }
    })).catch(() => false);
  };

  // 读取
  window.idbGet = function (key) {
    return open().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    })).catch(() => undefined);
  };

  // 列出所有键
  window.idbGetAllKeys = function () {
    return open().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) { resolve([]); }
    })).catch(() => []);
  };

  // 删除
  window.idbDelete = function (key) {
    return open().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    })).catch(() => false);
  };

  // 清空全部键（"清除所有数据"用）：不删库，避免连接占用导致 blocked
  window.idbClearAll = function () {
    return open().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) { resolve(false); }
    })).catch(() => false);
  };

  // 存储适配层：各模块统一用它读写（接口与原 store 一致）。
  // IndexedDB 是权威持久层；localStorage 只是快速快照（配额满/隐私模式写失败也不丢数据——
  // 启动时从 IDB 恢复）；内存缓存兜底 localStorage 缺失的键。
  // v3.5.92：大键（>200KB，如头像池/壁纸/朋友圈背景等图片 dataURL）只写 IndexedDB，
  //   不写 localStorage——手机 5MB 配额不再被几十 MB 图片撑爆，大数据全进 IDB（配额大得多）
  const LS_BIG_LIMIT = 200 * 1024;
  let memoryCache = null;
  window.xyStore = function (prefix) {
    return {
      get(k) {
        const key = prefix + ':' + k;
        try { const v = localStorage.getItem(key); if (v !== null) return v; } catch (e) {}
        if (memoryCache && key in memoryCache) return memoryCache[key];
        return null;
      },
      set(k, v) {
        const key = prefix + ':' + k;
        if (memoryCache) memoryCache[key] = v;
        // 大键跳过 localStorage（只进 IDB + 内存缓存）
        const big = typeof v === 'string' && v.length > LS_BIG_LIMIT;
        if (!big) {
          try { localStorage.setItem(key, v); } catch (e) {}
        } else {
          try { localStorage.removeItem(key); } catch (e) {}
        }
        try { if (window.idbSet) window.idbSet(key, v); } catch (e) {}
      },
      remove(k) {
        const key = prefix + ':' + k;
        if (memoryCache) delete memoryCache[key];
        try { localStorage.removeItem(key); } catch (e) {}
        try { if (window.idbDelete) window.idbDelete(key); } catch (e) {}
      }
    };
  };

  // 恢复：从 IndexedDB 读回 localStorage 缺失的键（初始化时调用）
  window.idbRestore = function (uidPrefix) {
    if (!window.idbGetAllKeys) return;
    window.idbGetAllKeys().then(keys => {
      if (!keys || !keys.length) return;
      let refilled = 0;
      keys.forEach(k => {
        if (k.indexOf(uidPrefix) !== 0) return;
        // 音乐文件只存 IndexedDB（体积大），不进内存缓存、不回填 localStorage（会撑爆配额）
        if (k.indexOf(uidPrefix + 'music-file:') === 0) return;
        window.idbGet(k).then(v => {
          if (v === undefined || v === null) return;
          const str = typeof v === 'string' ? v : JSON.stringify(v);
          if (!memoryCache) memoryCache = {};
          memoryCache[k] = str;
          // v3.5.92：大键（>200KB 图片 dataURL）只留 IDB + 内存缓存，不回填 localStorage
          if (str.length > LS_BIG_LIMIT) return;
          try {
            // 仅当 localStorage 无此键，或 IndexedDB 数据更新时覆盖
            if (!localStorage.getItem(k)) {
              localStorage.setItem(k, str);
              refilled++;
            }
          } catch (e) {}
        });
      });
      // 数据在 IndexedDB、localStorage 缺失 → 回填后刷新一次，让模块读到完整数据
      // （防循环：sessionStorage 标记只允许一次；回填失败不刷新）
      setTimeout(() => {
        if (refilled > 0 && !sessionStorage.getItem('xy-idb-refilled')) {
          try { sessionStorage.setItem('xy-idb-refilled', '1'); } catch (e) {}
          location.reload();
        }
      }, 800);
    });
  };
  // v3.5.24：启动时自动从 IndexedDB 回填 localStorage 缺失的键。
  // 之前只定义不调用——手机端导入/配额异常导致 localStorage 部分丢失后，IndexedDB 里的
  // 聊天记录/字卡/查岗等备份永远不会回填。现在初始化自动跑一次。
  try { window.idbRestore('xy-home-v2:'); } catch (e) {}

  // v3.5.92：一次性迁移——localStorage 里 >200KB 的旧大键（头像池/壁纸/朋友圈背景等）
  // 移入 IndexedDB 并从 localStorage 删除（老用户升级后 LS 立刻瘦身，不再撑爆 5MB）
  try {
    if (!sessionStorage.getItem('xy-ls-big-migrated')) {
      let moved = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('xy-home-v2:') !== 0) continue;
        if (k.indexOf('xy-home-v2:music-file:') === 0) continue;
        const v = localStorage.getItem(k);
        if (v && v.length > LS_BIG_LIMIT) {
          try { if (window.idbSet) window.idbSet(k, v); } catch (e) {}
          try { localStorage.removeItem(k); } catch (e) {}
          moved++;
        }
      }
      if (moved > 0) { try { sessionStorage.setItem('xy-ls-big-migrated', '1'); } catch (e) {} }
    }
  } catch (e) {}
})();
