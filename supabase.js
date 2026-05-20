/**
 * Supabase virtual client & Local Sync Manager
 * Includes transparent mock state engine fallback so that users can test the UI fully
 * without manual Supabase configurations, conforming to "High availability/Zero-config".
 */
import { state, getLocal, saveLocal } from './state.js';

const SUPABASE_URL = ""; 
const SUPABASE_ANON_KEY = "";


const mockDb = {
    users: getLocal('mock_users', []),
    writings: getLocal('mock_writings', [
        {
            id: 'demo-doc-1',
            user_id: 'guest',
            title: '山海隐秘录（开篇试写）',
            content: '# 第一章：雾海归客\n\n大雾弥漫的清晨，江边的古渡口来了一个奇怪的旅人。他穿着一袭旧青衣，背着破烂的书笈，腰间却系着一枚刻满雷纹的青铜断简。\n\n“船家，今日还出江吗？” 他低声发问，声音仿佛带着雷雨前的潮湿感。\n\n老艏子抬头瞅了他一眼，吧嗒了一口老旱烟：“雾太大，看不见方向，江心有些不干净的影子。官爷，要不您等日出？”\n\n旅人微微一笑，从怀里取出一枚亮得诡异的红珊瑚珠子，轻轻扣在木案上。老艏子烟杆猛地一抖，整个人都呆住了。这可不就是十年前失踪的小公子身上戴的那颗【血焰珠】吗？\n\n那旅人将衣袖微卷，遮住手腕。江面风急，而那片大雾，竟隐隐因他的到来而开始向两侧分开。',
            word_count: 320,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ]),
    foreshadowings: getLocal('mock_foreshadowings', [
        {
            id: 'demo-fs-1',
            writing_id: 'demo-doc-1',
            user_id: 'guest',
            clue_title: '血焰珠出现',
            content: '血焰珠本是十年前王家失踪小公子的遗物，暗示老艏子与王家惨案有直接瓜葛。',
            planted_at_position: '第一章 5段',
            is_resolved: false,
            resolved_at_position: ''
        }
    ]),
    logs: []
};

function saveMockData() {
    saveLocal('mock_users', mockDb.users);
    saveLocal('mock_writings', mockDb.writings);
    saveLocal('mock_foreshadowings', mockDb.foreshadowings);
}

export const supabaseClient = {
    isConfigured: () => false,

    async signUp(numericId, password) {
        const exists = mockDb.users.find(u => u.numeric_id === numericId);
        if (exists) {
            throw new Error('此数字ID已被占用，请尝试其他数字');
        }
        const newUser = {
            id: 'usr_' + Math.random().toString(36).substr(2, 9),
            numeric_id: numericId,
            password_hash: password, // Simple hashing simulation
            created_at: new Date().toISOString()
        };
        mockDb.users.push(newUser);
        saveMockData();
        return newUser;
    },

    async signIn(numericId, password) {
        const user = mockDb.users.find(u => u.numeric_id === numericId && u.password_hash === password);
        if (!user) {
            throw new Error('数字ID或密码口令错误');
        }
        return user;
    },

    async getWritings(userId) {
        return mockDb.writings.filter(w => w.user_id === userId);
    },

    async createWriting(userId, title, content = '') {
        const newDoc = {
            id: 'doc_' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            title: title || '未命名草稿',
            content,
            word_count: content.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        mockDb.writings.push(newDoc);
        saveMockData();
        return newDoc;
    },

    async updateWriting(id, updates) {
        const doc = mockDb.writings.find(w => w.id === id);
        if (doc) {
            Object.assign(doc, updates, { updated_at: new Date().toISOString() });
            saveMockData();
        }
        return doc;
    },

    async deleteWriting(id) {
        mockDb.writings = mockDb.writings.filter(w => w.id !== id);
        mockDb.foreshadowings = mockDb.foreshadowings.filter(f => f.writing_id !== id);
        saveMockData();
    },

    async getForeshadowings(writingId) {
        return mockDb.foreshadowings.filter(f => f.writing_id === writingId);
    },

    async createForeshadowing(userId, writingId, data) {
        const newFs = {
            id: 'fs_' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            writing_id: writingId,
            clue_title: data.clue_title,
            content: data.content,
            planted_at_position: data.planted_at_position || '未知章节',
            is_resolved: data.is_resolved || false,
            resolved_at_position: data.resolved_at_position || '',
            created_at: new Date().toISOString()
        };
        mockDb.foreshadowings.push(newFs);
        saveMockData();
        return newFs;
    },

    async updateForeshadowing(id, updates) {
        const fs = mockDb.foreshadowings.find(f => f.id === id);
        if (fs) {
            Object.assign(fs, updates);
            saveMockData();
        }
        return fs;
    },

    async deleteForeshadowing(id) {
        mockDb.foreshadowings = mockDb.foreshadowings.filter(f => f.id !== id);
        saveMockData();
    }
};
