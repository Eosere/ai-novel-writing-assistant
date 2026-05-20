/**
 * State Management & Reactive Handlers
 * Governs the local state architecture, backing up drafts, and synchronization
 */
export const state = {
    user: null, // { numericId: string, id: string, token: string }
    writings: [],
    activeWritingId: null,
    foreshadowings: [],
    theme: 'light',
    activeTab: 'foreshadow', // foreshadow | coach
    customApiKey: ''
};


const listeners = [];

export function subscribe(callback) {
    listeners.push(callback);
    return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    };
}

export function dispatch(newState) {
    Object.assign(state, newState);

    listeners.forEach(callback => callback(state));
}


const STORAGE_PREFIX = 'ai_writer_';

export function getLocal(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export function saveLocal(key, value) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.error("Localstorage save failed: ", e);
    }
}

export function removeLocal(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
}
