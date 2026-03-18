const KEY_STORAGE = "nephila:apiKey";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setApiKey(key: string) {
  try {
    localStorage.setItem(KEY_STORAGE, key);
  } catch {
    // localStorage unavailable
  }
}

export function clearApiKey() {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    // localStorage unavailable
  }
}
