'use strict';

const LocalHistory = (() => {
  const storeName = 'calculos';
  const maximumEntries = 20;
  let connection;

  function open() {
    if (!connection) {
      connection = new Promise((resolve, reject) => {
        const request = indexedDB.open('trayectoria', 1);
        request.onupgradeneeded = () => request.result.createObjectStore(storeName, {autoIncrement:true});
        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => {
            database.close();
            connection = undefined;
          };
          resolve(database);
        };
        request.onerror = () => reject(request.error);
      }).catch(error => {
        connection = undefined;
        throw error;
      });
    }
    return connection;
  }

  async function list() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).openCursor(null, 'prev');
      const items = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        items.push(cursor.value);
        if (items.length < maximumEntries) cursor.continue();
      };
      transaction.oncomplete = () => resolve(items);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function save(input) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.add(input);
      const request = store.openCursor(null, 'prev');
      let skipRecent = true;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (skipRecent) {
          skipRecent = false;
          cursor.advance(maximumEntries);
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }

  return {list, save};
})();
