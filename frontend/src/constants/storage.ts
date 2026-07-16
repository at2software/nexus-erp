export const storageGet = <T>(key: string, fallback: T): T => {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return raw as unknown as T;
    }
};

export const storageSet = (key: string, value: unknown): void => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const storageRemove = (key: string): void => {
    localStorage.removeItem(key);
};
