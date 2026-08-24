import { openDatabase } from '../database.ts';
import { defaultUserSettings, USER_SETTINGS_KEY } from '../database.defaults.ts';
import { STORES } from '../database.defaults.ts';
import type { UserSettingsRecord } from './user-setting.types.ts';

export async function getUserPreferences(): Promise<UserSettingsRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.USER_SETTINGS, 'readonly').objectStore(
         STORES.USER_SETTINGS,
      );
      const request = store.get(USER_SETTINGS_KEY) as IDBRequest<UserSettingsRecord>;
      request.onsuccess = () => {
         if (request.result) {
            resolve(request.result);
            return;
         }
         else { reject(new Error('User preferences not found')); }
      };

      request.onerror = () => reject(request.error);
   });
}

export async function setUserPreferences(record = defaultUserSettings): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.USER_SETTINGS, 'readwrite').objectStore(
         STORES.USER_SETTINGS,
      );
      const request = store.put(record, USER_SETTINGS_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}
