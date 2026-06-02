import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const secureStoreOptions = {
  keychainService: 'trino-auth',
};

function createSecureStorage() {
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    const map = new Map<string, string>();
    return {
      getItem: async (key: string) => map.get(key) ?? null,
      setItem: async (key: string, value: string) => { map.set(key, value); },
      removeItem: async (key: string) => { map.delete(key); },
    };
  }

  return {
    getItem: async (key: string) => {
      try {
        return await SecureStore.getItemAsync(key, secureStoreOptions);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await SecureStore.setItemAsync(key, value, secureStoreOptions);
      } catch (e) {
        console.warn('SecureStore setItem failed:', e);
      }
    },
    removeItem: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key, secureStoreOptions);
      } catch (e) {
        console.warn('SecureStore deleteItem failed:', e);
      }
    },
  };
}

export const authStorage = createSecureStorage();
