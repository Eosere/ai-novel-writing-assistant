/**
 * Authentication management layer
 * Handles Numeric-ID generation, validation guards and visual dialog bindings.
 */
import { state, dispatch, saveLocal, getLocal, removeLocal } from './state.js';
import { supabaseClient } from './supabase.js';

export function generateRandomNumericId() {

    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function initAuthSession() {
    const savedUser = getLocal('auth_session');
    if (savedUser) {
        dispatch({ user: savedUser });
        return savedUser;
    }
    return null;
}

export function logout() {
    removeLocal('auth_session');
    dispatch({ user: null, writings: [], activeWritingId: null, foreshadowings: [] });
    window.location.reload();
}

export async function handleAuthAction(mode, numericId, password) {
    if (!new RegExp("^[0-9]{5,10}$").test(numericId)) {
        throw new Error("请使用5到10位的纯数字ID进行登录");
    }
    if (password.length < 4) {
        throw new Error("密码长度至少需要4位，以确保安全性");
    }

    let userObj;
    if (mode === 'register') {
        userObj = await supabaseClient.signUp(numericId, password);
    } else {
        userObj = await supabaseClient.signIn(numericId, password);
    }

    const sessionPayload = {
        id: userObj.id,
        numericId: userObj.numeric_id,
        token: 'v_session_' + Math.random().toString(36).substr(2, 9)
    };

    saveLocal('auth_session', sessionPayload);
    dispatch({ user: sessionPayload });
    return sessionPayload;
}
