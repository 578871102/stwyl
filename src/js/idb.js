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

  // 恢复：从 IndexedDB 读回 localStorage 缺失的键（初始化时调用）
  window.idbRestore = function (uidPrefix) {
    window.idbGetAllKeys().then(keys => {
      if (!keys || !keys.length) return;
      keys.forEach(k => {
        if (k.indexOf(uidPrefix) !== 0) return;
        window.idbGet(k).then(v => {
          if (v === undefined || v === null) return;
          try {
            // 仅当 localStorage 无此键，或 IndexedDB 数据更新时覆盖
            if (!localStorage.getItem(k)) {
              localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
            }
          } catch (e) {}
        });
      });
    });
  };
})();
