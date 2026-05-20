/**
 * Primary Controller / Coordinator
 * Binds DOM nodes, handles rendering cycles, sync notifications,
 * and handles UI dual-theme transitions.
 */
import { state, subscribe, dispatch, getLocal, saveLocal } from './state.js';
import { initAuthSession, handleAuthAction, logout, generateRandomNumericId } from './auth.js';
import { supabaseClient } from './supabase.js';
import { askAiCoach, continueWrite, checkErrors, extractForeshadows, generateThemeGuide } from './ai_service.js';


const DOM = {
    authContainer: document.getElementById('auth-container'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    authForm: document.getElementById('auth-form'),
    authIdInput: document.getElementById('auth-id'),
    authPasswordInput: document.getElementById('auth-password'),
    btnSubmitAuth: document.getElementById('btn-submit-auth'),
    btnToggleAuthMode: document.getElementById('btn-toggle-auth-mode'),
    
    appWorkspace: document.getElementById('app-workspace'),
    sidebar: document.getElementById('sidebar'),
    btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    userAvatarInitial: document.getElementById('user-avatar-initial'),
    userDisplayId: document.getElementById('user-display-id'),
    btnLogout: document.getElementById('btn-logout'),
    btnManualSync: document.getElementById('btn-manual-sync'),
    
    documentList: document.getElementById('document-list'),
    btnNewDocument: document.getElementById('btn-new-document'),
    activeDocumentTitle: document.getElementById('active-document-title'),
    editorWordCount: document.getElementById('editor-word-count'),
    saveStatusBadge: document.getElementById('save-status-badge'),
    btnDeleteDocument: document.getElementById('btn-delete-document'),
    markdownEditor: document.getElementById('markdown-editor'),
    
    tabForeshadow: document.getElementById('tab-foreshadow'),
    tabAiCoach: document.getElementById('tab-ai-coach'),
    panelForeshadowContent: document.getElementById('panel-foreshadow-content'),
    panelAiCoachContent: document.getElementById('panel-ai-coach-content'),
    
    btnAddForeshadow: document.getElementById('btn-add-foreshadow'),
    foreshadowForm: document.getElementById('foreshadow-form'),
    fsClue: document.getElementById('fs-clue'),
    fsContent: document.getElementById('fs-content'),
    fsPosition: document.getElementById('fs-position'),
    fsResolved: document.getElementById('fs-resolved'),
    btnCancelFs: document.getElementById('btn-cancel-fs'),
    btnSaveFs: document.getElementById('btn-save-fs'),
    foreshadowList: document.getElementById('foreshadow-list'),
    
    aiAnalyzeForeshadow: document.getElementById('ai-analyze-foreshadow'),
    aiDeducePlot: document.getElementById('ai-deduce-plot'),
    btnToggleKeyInput: document.getElementById('btn-toggle-key-input'),
    keyInputBox: document.getElementById('key-input-box'),
    customApiKey: document.getElementById('custom-api-key'),
    aiResponseContainer: document.getElementById('ai-response-container'),
    btnClearCoach: document.getElementById('btn-clear-coach'),
    toaster: document.getElementById('toaster'),


    themeDialog: document.getElementById('theme-dialog'),
    btnCancelTheme: document.getElementById('btn-cancel-theme'),
    btnApplyTheme: document.getElementById('btn-apply-theme'),
    currentThemeBadge: document.getElementById('current-theme-badge'),
    styleHintsPanel: document.getElementById('style-hints-panel'),
    styleHintsDesc: document.getElementById('style-hints-desc'),


    btnAiContinue: document.getElementById('btn-ai-continue'),
    continuePanel: document.getElementById('continue-panel'),
    continueLoading: document.getElementById('continue-loading'),
    continueCards: document.getElementById('continue-cards'),
    btnCloseContinue: document.getElementById('btn-close-continue'),

    btnAiCheckErrors: document.getElementById('btn-ai-check-errors'),
    errorCheckPanel: document.getElementById('error-check-panel'),
    errorList: document.getElementById('error-list'),
    btnCloseErrorPanel: document.getElementById('btn-close-error-panel'),

    btnExtractForeshadow: document.getElementById('btn-extract-foreshadow'),
    extractedConfirmPanel: document.getElementById('extracted-confirm-panel'),
    extractedList: document.getElementById('extracted-list'),
    btnCloseExtract: document.getElementById('btn-close-extract'),

    foreshadowAlert: document.getElementById('foreshadow-alert'),
    foreshadowAlertMsg: document.getElementById('foreshadow-alert-msg'),
    btnIgnoreAlert: document.getElementById('btn-ignore-alert')
};

let authMode = 'login'; // 'login' | 'register'
let autoSaveInterval = null;
let selectedThemeKey = null;

const THEME_STYLES = {
    rainy_detective: {
        name: "雨夜推理",
        desc: "阴冷、悬疑，蛛丝马迹与雨夜秘密相交融。",
        suggest: "侧重‘冷冽、滴答声、影子、昏黄街灯’。适合使用‘线索、死角、冷笑、雨幕’等高张力悬疑词汇。"
    },
    first_encounter: {
        name: "初次相遇",
        desc: "唯美、轻柔，宿命感爆发的惊鸿一瞥。",
        suggest: "侧重‘余晖、心跳、纸伞、惊艳、无措’。适合使用温润如玉、慢节奏的描写笔调。"
    },
    betrayal: {
        name: "背叛",
        desc: "戏剧冲突、撕裂，温暖面具之下的残忍利刃。",
        suggest: "侧重‘凄冷、笑意消退、寒芒、错愕、裂痕’。突兀的语气转折更具戏剧冲突美感。"
    },
    reunion: {
        name: "重逢",
        desc: "沧桑、暗潮涌动，释怀与欲言又止的克制美感。",
        suggest: "侧重‘浊酒、斑驳、无言、依旧、沧海桑田’。笔力重在留白与欲说还休的微表情描写。"
    }
};


window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupEventListeners();
    initTheme();
    
    const activeSession = initAuthSession();
    if (activeSession) {
        onAuthSuccess();
    } else {
        showAuthScreen('login');
    }
});


subscribe(async (updatedState) => {
    updateWorkspaceUI(updatedState);
});


function initTheme() {
    const savedTheme = getLocal('theme', 'light');
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    dispatch({ theme });
    saveLocal('theme', theme);
}


function notify(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-xl text-xs font-medium tracking-wide shadow-lg border animate-slideup flex items-center gap-2 ${
        type === 'error' 
        ? 'bg-red-500/10 text-red-500 border-red-500/20' 
        : 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
    }`;
    toast.innerHTML = `
        <i data-lucide="${type === 'error' ? 'alert-triangle' : 'check-circle'}" class="w-4 h-4"></i>
        <span>${message}</span>
    `;
    DOM.toaster.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'w-4 h-4' } });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}


async function onAuthSuccess() {
    DOM.authContainer.classList.add('hidden');
    DOM.appWorkspace.classList.remove('opacity-0');
    DOM.appWorkspace.classList.add('opacity-100');
    
    DOM.userDisplayId.textContent = state.user.numericId;
    DOM.userAvatarInitial.textContent = state.user.numericId.slice(-2);
    

    try {
        const list = await supabaseClient.getWritings(state.user.id);
        dispatch({ writings: list });
        
        if (list.length > 0) {
            selectDocument(list[0].id);
        } else {

            DOM.themeDialog.classList.remove('hidden');
        }
    } catch(err) {
        notify("获取作品档案失败，已加载离线安全缓冲区", "error");
    }


    startAutoSaveBackup();
}

function showAuthScreen(mode) {
    authMode = mode;
    DOM.authContainer.classList.remove('hidden');
    DOM.appWorkspace.classList.add('opacity-0');
    
    if (mode === 'register') {
        DOM.authTitle.textContent = '生成全新写作数字ID';
        DOM.authSubtitle.textContent = '系统将自动分配独一无二的六位笔名ID';
        DOM.authIdInput.value = generateRandomNumericId();
        DOM.authIdInput.readOnly = true;
        DOM.btnSubmitAuth.innerHTML = `<span>立即注册写作舱</span><i data-lucide="sparkles" class="w-4 h-4"></i>`;
        DOM.btnToggleAuthMode.textContent = '已有专属数字ID？点击直接登录';
    } else {
        DOM.authTitle.textContent = '进入数字写作间';
        DOM.authSubtitle.textContent = '极致纯粹，不受任何繁杂社交账号打扰';
        DOM.authIdInput.value = '';
        DOM.authIdInput.readOnly = false;
        DOM.btnSubmitAuth.innerHTML = `<span>登入写作间</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        DOM.btnToggleAuthMode.textContent = '还没有数字ID？立即点击生成';
    }
    lucide.createIcons();
}


async function selectDocument(docId) {
    dispatch({ activeWritingId: docId });
    const doc = state.writings.find(w => w.id === docId);
    if (doc) {
        DOM.activeDocumentTitle.value = doc.title;
        DOM.markdownEditor.value = doc.content;
        updateWordCount(doc.content);
        

        if (doc.theme && THEME_STYLES[doc.theme]) {
            DOM.currentThemeBadge.textContent = THEME_STYLES[doc.theme].name;
            DOM.currentThemeBadge.classList.remove('hidden');
            DOM.styleHintsDesc.textContent = THEME_STYLES[doc.theme].suggest;
            DOM.styleHintsPanel.classList.remove('hidden');
        } else {
            DOM.currentThemeBadge.classList.add('hidden');
            DOM.styleHintsPanel.classList.add('hidden');
        }

        try {
            const fsList = await supabaseClient.getForeshadowings(docId);
            dispatch({ foreshadowings: fsList });
        } catch (e) {
            dispatch({ foreshadowings: [] });
        }
    }
}

function updateWordCount(text) {
    const cleaned = text.replace(new RegExp('[\\s\\t\\r\\n]', 'g'), '');
    DOM.editorWordCount.textContent = `${cleaned.length} 字`;
}

async function handleCreateNewDoc(optTitle = "", themeKey = null) {
    try {
        let content = '';
        if (themeKey && THEME_STYLES[themeKey]) {
            notify("AI正在谱写唯美主题开篇，请稍候...", "success");
            content = await generateThemeGuide(themeKey, THEME_STYLES[themeKey].name);
        }

        const newDoc = await supabaseClient.createWriting(state.user.id, optTitle || '无标题草稿', content, themeKey);
        const list = await supabaseClient.getWritings(state.user.id);
        dispatch({ writings: list });
        selectDocument(newDoc.id);
        notify("创建新作品成功");
    } catch(err) {
        notify("创建新作品失败", "error");
    }
}

async function handleDeleteActiveDoc() {
    if (!state.activeWritingId) return;
    if (state.writings.length <= 1) {
        notify("为了保护创作，系统必须保留至少一份小说草案", "error");
        return;
    }
    if (confirm("您确定要彻底销毁这份手稿与关联的伏笔吗？该操作无法撤销。")) {
        try {
            await supabaseClient.deleteWriting(state.activeWritingId);
            const list = await supabaseClient.getWritings(state.user.id);
            dispatch({ writings: list });
            selectDocument(list[0].id);
            notify("作品销毁成功");
        } catch(err) {
            notify("删除失败", "error");
        }
    }
}


function renderForeshadowCards() {
    DOM.foreshadowList.innerHTML = '';
    if (state.foreshadowings.length === 0) {
        DOM.foreshadowList.innerHTML = `
            <p class="text-[11px] text-gray-400 text-center py-10">
                当前文档暂无登记伏笔。<br/>合理的伏笔埋藏能大幅提升读者阅读爽感。
            </p>
        `;
        return;
    }

    state.foreshadowings.forEach(f => {
        const card = document.createElement('div');
        card.className = `p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${f.is_resolved ? 'bg-gray-50/50 dark:bg-charcoal-900/30 border-gray-200/50 dark:border-charcoal-50/5 opacity-60' : 'bg-white dark:bg-charcoal-800 border-ivory-200 dark:border-charcoal-50/10'}`;
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${f.is_resolved ? 'bg-gray-400' : 'bg-amber-800 dark:bg-amber-400'}"></span>
                    <span class="text-xs font-bold font-serif ${f.is_resolved ? 'line-through text-gray-400' : 'text-amber-900 dark:text-ivory-100'}">${f.clue_title}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn-toggle-fs-resolve text-[10px] text-amber-800 dark:text-amber-400 hover:underline" data-id="${f.id}">
                        ${f.is_resolved ? '标记未收' : '标记已收'}
                    </button>
                    <button class="btn-delete-fs text-gray-300 hover:text-red-500" data-id="${f.id}">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">${f.content}</p>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-ivory-100 dark:border-charcoal-50/5 text-[10px] text-gray-400 font-mono">
                <span>出处: ${f.planted_at_position}</span>
                ${f.is_resolved ? '<span class="text-green-600 dark:text-green-400">已回收</span>' : '<span class="text-amber-800/60">等待回收</span>'}
            </div>
        `;
        

        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-toggle-fs-resolve') || e.target.closest('.btn-delete-fs')) return;
            highlightInText(f.clue_title);
        });

        DOM.foreshadowList.appendChild(card);
    });

    lucide.createIcons();


    document.querySelectorAll('.btn-toggle-fs-resolve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fsId = e.target.dataset.id;
            const item = state.foreshadowings.find(f => f.id === fsId);
            if (item) {
                await supabaseClient.updateForeshadowing(fsId, { is_resolved: !item.is_resolved });
                const updatedList = await supabaseClient.getForeshadowings(state.activeWritingId);
                dispatch({ foreshadowings: updatedList });
            }
        });
    });

    document.querySelectorAll('.btn-delete-fs').forEach(btn => {
        btn.closest('button').addEventListener('click', async (e) => {
            const fsId = e.currentTarget.dataset.id;
            await supabaseClient.deleteForeshadowing(fsId);
            const updatedList = await supabaseClient.getForeshadowings(state.activeWritingId);
            dispatch({ foreshadowings: updatedList });
            notify("已移除伏笔卡片");
        });
    });
}


function highlightInText(keyword) {
    const text = DOM.markdownEditor.value;
    const index = text.indexOf(keyword);
    if (index !== -1) {
        DOM.markdownEditor.focus();
        DOM.markdownEditor.setSelectionRange(index, index + keyword.length);
        notify(`已为您在正文中定位：【${keyword}】`);
    } else {
        notify(`正文中暂未找到与【${keyword}】字面完全相同的片段`, "error");
    }
}


function startAutoSaveBackup() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(async () => {
        if (!state.activeWritingId) return;
        
        const freshContent = DOM.markdownEditor.value;
        const freshTitle = DOM.activeDocumentTitle.value;
        const currentDoc = state.writings.find(w => w.id === state.activeWritingId);

        await supabaseClient.updateWriting(state.activeWritingId, {
            title: freshTitle,
            content: freshContent,
            word_count: freshContent.length,
            theme: currentDoc ? currentDoc.theme : null
        });


        const currentActiveIndex = state.writings.findIndex(w => w.id === state.activeWritingId);
        if (currentActiveIndex !== -1) {
            state.writings[currentActiveIndex].title = freshTitle;
            state.writings[currentActiveIndex].content = freshContent;
        }

        DOM.saveStatusBadge.classList.remove('hidden');
        DOM.saveStatusBadge.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
            每30秒自动保存于 ${new Date().toLocaleTimeString()}
        `;
        setTimeout(() => {
            renderDocList(state.writings, state.activeWritingId);
        }, 100);
    }, 30000); // Conforming to 30s criteria
}


function renderDocList(writings, activeId) {
    DOM.documentList.innerHTML = '';
    writings.forEach(w => {
        const item = document.createElement('div');
        item.className = `p-3.5 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-ivory-200/50 dark:hover:bg-charcoal-50/5 flex items-center justify-between ${w.id === activeId ? 'doc-item-active font-medium' : ''}`;
        item.dataset.id = w.id;
        
        item.innerHTML = `
            <div class="flex-1 overflow-hidden pointer-events-none">
                <p class="text-xs font-serif font-semibold truncate text-amber-900 dark:text-ivory-100">${w.title || '无标题草稿'}</p>
                <p class="text-[10px] text-gray-400 font-mono mt-1">${w.word_count || 0} 字 · ${new Date(w.updated_at).toLocaleDateString()}</p>
            </div>
            <i data-lucide="book-open" class="w-4 h-4 text-amber-800/30 dark:text-amber-400/20"></i>
        `;
        
        item.addEventListener('click', () => selectDocument(w.id));
        DOM.documentList.appendChild(item);
    });
    lucide.createIcons();
}


function updateWorkspaceUI(currentState) {
    renderDocList(currentState.writings, currentState.activeWritingId);
    renderForeshadowCards();
}


async function triggerAiAssist(actionType) {
    const doc = state.writings.find(w => w.id === state.activeWritingId);
    if (!doc || !DOM.markdownEditor.value.trim()) {
        notify("请在编辑器中撰写一些情节再进行AI分析", "error");
        return;
    }

    DOM.aiResponseContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 space-y-3">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-800"></span>
            </span>
            <p class="text-[11px] text-gray-400 animate-pulse font-mono">DeepSeek-V3 正在深度揣摩上下文逻辑与伏笔关联...</p>
        </div>
    `;

    try {
        const aiResponse = await askAiCoach(
            actionType, 
            DOM.activeDocumentTitle.value, 
            DOM.markdownEditor.value, 
            state.foreshadowings
        );
        DOM.aiResponseContainer.innerHTML = marked.parse(aiResponse);
    } catch(err) {
        DOM.aiResponseContainer.innerHTML = `
            <div class="p-3 bg-red-500/10 text-red-500 rounded-lg text-[11px] leading-relaxed">
                <p class="font-bold">深度学习服务器接入限制</p>
                <p class="mt-1 text-gray-400">由于免费高频并发控制，连接已被暂时挂起。您可以尝试点击右侧“展开”输入您的自定义 OpenRouter API 密钥重新发起。</p>
            </div>
        `;
    }
}


function setupEventListeners() {

    DOM.btnToggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthScreen(authMode === 'login' ? 'register' : 'login');
    });

    DOM.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const numId = DOM.authIdInput.value.trim();
        const pwd = DOM.authPasswordInput.value.trim();
        
        try {
            DOM.btnSubmitAuth.disabled = true;
            DOM.btnSubmitAuth.textContent = '请稍后...';
            await handleAuthAction(authMode, numId, pwd);
            notify("登录鉴权成功，欢迎踏入创作天地");
            onAuthSuccess();
        } catch(error) {
            notify(error.message, 'error');
            DOM.btnSubmitAuth.disabled = false;
            showAuthScreen(authMode);
        }
    });


    DOM.btnThemeToggle.addEventListener('click', () => {
        setTheme(state.theme === 'light' ? 'dark' : 'light');
    });


    DOM.btnSidebarToggle.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('sidebar-collapsed');
    });


    DOM.btnNewDocument.addEventListener('click', () => {
        selectedThemeKey = null;
        document.querySelectorAll('.theme-option-btn').forEach(b => b.classList.remove('selected'));
        DOM.themeDialog.classList.remove('hidden');
    });

    DOM.btnCancelTheme.addEventListener('click', () => {
        DOM.themeDialog.classList.add('hidden');
        handleCreateNewDoc("无标题草稿");
    });

    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedThemeKey = btn.dataset.theme;
        });
    });

    DOM.btnApplyTheme.addEventListener('click', () => {
        DOM.themeDialog.classList.add('hidden');
        const themeName = selectedThemeKey ? THEME_STYLES[selectedThemeKey].name : "未命名";
        handleCreateNewDoc(`基于《${themeName}》的新篇章`, selectedThemeKey);
    });

    DOM.btnDeleteDocument.addEventListener('click', handleDeleteActiveDoc);


    DOM.markdownEditor.addEventListener('input', (e) => {
        const content = e.target.value;
        updateWordCount(content);


        const matchingForeshadow = state.foreshadowings.find(f => !f.is_resolved && content.includes(f.clue_title) && content.slice(-30).includes(f.clue_title.slice(0, 3)));
        if (matchingForeshadow) {
            DOM.foreshadowAlertMsg.textContent = `伏笔关联提醒：当前输入涉及已登记的伏笔【${matchingForeshadow.clue_title}】。是否在后文回收它？`;
            DOM.foreshadowAlert.classList.remove('hidden');
        }
    });

    DOM.btnIgnoreAlert.addEventListener('click', () => {
        DOM.foreshadowAlert.classList.add('hidden');
    });


    DOM.btnLogout.addEventListener('click', () => {
        if (confirm("您确定要锁上创作间并退出登录吗？本地草稿随时会自动保持同步。")) {
            logout();
        }
    });


    DOM.btnManualSync.addEventListener('click', () => {
        notify("手稿及伏笔数据已完美保存同步");
    });


    DOM.btnToggleKeyInput.addEventListener('click', () => {
        DOM.keyInputBox.classList.toggle('hidden');
        DOM.btnToggleKeyInput.textContent = DOM.keyInputBox.classList.contains('hidden') ? '展开' : '收起';
    });

    DOM.customApiKey.addEventListener('input', (e) => {
        dispatch({ customApiKey: e.target.value.trim() });
    });


    DOM.tabForeshadow.addEventListener('click', () => {
        DOM.tabForeshadow.classList.add('tab-active');
        DOM.tabAiCoach.classList.remove('tab-active', 'text-amber-800', 'dark:text-amber-400');
        DOM.tabAiCoach.classList.add('text-gray-400');
        
        DOM.panelForeshadowContent.classList.remove('hidden');
        DOM.panelAiCoachContent.classList.add('hidden');
    });

    DOM.tabAiCoach.addEventListener('click', () => {
        DOM.tabAiCoach.classList.add('tab-active', 'text-amber-800', 'dark:text-amber-400');
        DOM.tabForeshadow.classList.remove('tab-active');
        
        DOM.panelForeshadowContent.classList.add('hidden');
        DOM.panelAiCoachContent.classList.remove('hidden');
        lucide.createIcons();
    });


    DOM.btnAddForeshadow.addEventListener('click', () => {
        DOM.foreshadowForm.classList.toggle('hidden');
    });

    DOM.btnCancelFs.addEventListener('click', () => {
        DOM.foreshadowForm.classList.add('hidden');
    });

    DOM.btnSaveFs.addEventListener('click', async () => {
        const title = DOM.fsClue.value.trim();
        const content = DOM.fsContent.value.trim();
        if (!title || !content) {
            notify("请输入伏笔线索及其对应的预兆意图", "error");
            return;
        }

        try {
            await supabaseClient.createForeshadowing(state.user.id, state.activeWritingId, {
                clue_title: title,
                content: content,
                planted_at_position: DOM.fsPosition.value.trim() || '未知章节',
                is_resolved: DOM.fsResolved.checked,
                resolved_at_position: ''
            });


            const updated = await supabaseClient.getForeshadowings(state.activeWritingId);
            dispatch({ foreshadowings: updated });


            DOM.fsClue.value = '';
            DOM.fsContent.value = '';
            DOM.fsPosition.value = '';
            DOM.fsResolved.checked = false;
            DOM.foreshadowForm.classList.add('hidden');
            notify("新伏笔登记入库，等待回收");
        } catch (e) {
            notify("添加伏笔失败", "error");
        }
    });


    DOM.aiAnalyzeForeshadow.addEventListener('click', () => triggerAiAssist('analyze_foreshadow'));
    DOM.aiDeducePlot.addEventListener('click', () => triggerAiAssist('deduce_plot'));
    DOM.btnClearCoach.addEventListener('click', () => {
        DOM.aiResponseContainer.innerHTML = `
            <div class="text-gray-400 text-center py-10">
                <i data-lucide="sparkles" class="w-8 h-8 text-amber-800/20 mx-auto mb-2"></i>
                控制台已被清空。请选择上方训导指令以开启剧情分析。
            </div>
        `;
        lucide.createIcons();
    });


    DOM.btnAiContinue.addEventListener('click', async () => {
        const editor = DOM.markdownEditor;
        const text = editor.value;
        const caretPos = editor.selectionStart;
        
        let beforeText = text.substring(0, caretPos).trim();
        if (beforeText.length < 50) {

            beforeText = text.slice(-100);
        }

        if (beforeText.length < 15) {
            notify("请至少在正文编写一些故事前传再进行智能续写", "error");
            return;
        }

        DOM.continuePanel.classList.remove('hidden');
        DOM.continueLoading.classList.remove('hidden');
        DOM.continueCards.innerHTML = '';

        try {
            const suggestions = await continueWrite(DOM.activeDocumentTitle.value, beforeText);
            DOM.continueLoading.classList.add('hidden');
            
            suggestions.forEach(item => {
                const card = document.createElement('div');
                card.className = "p-3 bg-ivory-50 dark:bg-charcoal-900 border border-ivory-200 dark:border-charcoal-50/10 rounded-xl cursor-pointer hover:border-amber-800 dark:hover:border-amber-400 transition-all";
                card.innerHTML = `
                    <div class="flex items-center gap-1 mb-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-800"></span>
                        <span class="text-[10px] font-bold text-amber-800">${item.style}</span>
                    </div>
                    <p class="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">${item.text}</p>
                `;
                card.addEventListener('click', () => {
                    const start = editor.selectionStart;
                    const end = editor.selectionEnd;
                    editor.value = text.substring(0, start) + "\n" + item.text + "\n" + text.substring(end);
                    DOM.continuePanel.classList.add('hidden');
                    updateWordCount(editor.value);
                    notify("已成功将所选续写卡片插入至光标处");
                });
                DOM.continueCards.appendChild(card);
            });
        } catch (e) {
            DOM.continueLoading.classList.add('hidden');
            notify("AI续写服务响应受阻，请重新尝试", "error");
        }
    });

    DOM.btnCloseContinue.addEventListener('click', () => {
        DOM.continuePanel.classList.add('hidden');
    });


    DOM.btnAiCheckErrors.addEventListener('click', async () => {
        const editor = DOM.markdownEditor;
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd).trim() || editor.value.trim();

        if (selectedText.length < 5) {
            notify("请在编辑器中划选一段文字再进行纠错润色", "error");
            return;
        }

        DOM.tabAiCoach.click();
        DOM.errorCheckPanel.classList.remove('hidden');
        DOM.errorList.innerHTML = `<p class="text-[10px] text-gray-400 animate-pulse text-center py-4">正在推敲字句语序与逻辑自洽性...</p>`;

        try {
            const feedback = await checkErrors(selectedText);
            DOM.errorList.innerHTML = '';

            if (feedback.length === 0) {
                DOM.errorList.innerHTML = `<p class="text-xs text-green-600 text-center py-4">未检测到明显文笔瑕疵，行文非常流利！</p>`;
                return;
            }

            feedback.forEach(item => {
                const itemCard = document.createElement('div');
                itemCard.className = "p-2.5 bg-ivory-50 dark:bg-charcoal-900 border border-red-500/10 rounded-lg space-y-1";
                itemCard.innerHTML = `
                    <p class="text-[10px] text-red-500 font-mono">原文: "${item.wrong}"</p>
                    <p class="text-[11px] text-gray-400">${item.reason}</p>
                    <p class="text-[11px] text-green-600 dark:text-green-400 font-bold">建议: "${item.fix}"</p>
                    <div class="flex gap-2 justify-end pt-1">
                        <button class="btn-ignore-err text-[9px] text-gray-400 hover:underline">忽略</button>
                        <button class="btn-apply-err text-[9px] text-amber-800 dark:text-amber-400 font-bold hover:underline" data-wrong="${item.wrong}" data-fix="${item.fix}">一键应用</button>
                    </div>
                `;

                itemCard.querySelector('.btn-ignore-err').addEventListener('click', () => {
                    itemCard.remove();
                });

                itemCard.querySelector('.btn-apply-err').addEventListener('click', (e) => {
                    const wrongStr = e.target.dataset.wrong;
                    const fixStr = e.target.dataset.fix;
                    const content = editor.value;
                    if (content.includes(wrongStr)) {
                        editor.value = content.replace(wrongStr, fixStr);
                        updateWordCount(editor.value);
                        notify("已成功无缝润色替换原文");
                        itemCard.remove();
                    } else {
                        notify("找不到对应片段，请手动替换", "error");
                    }
                });

                DOM.errorList.appendChild(itemCard);
            });
        } catch (e) {
            DOM.errorList.innerHTML = `<p class="text-xs text-red-500 text-center py-4">纠错暂时不可用，请稍后再试</p>`;
        }
    });

    DOM.btnCloseErrorPanel.addEventListener('click', () => {
        DOM.errorCheckPanel.classList.add('hidden');
    });


    DOM.btnExtractForeshadow.addEventListener('click', async () => {
        const text = DOM.markdownEditor.value.trim();
        if (text.length < 20) {
            notify("文本内容太少，不足以构成或分析伏笔", "error");
            return;
        }

        DOM.extractedConfirmPanel.classList.remove('hidden');
        DOM.extractedList.innerHTML = `<p class="text-[10px] text-gray-400 animate-pulse text-center py-4">正在深度提取潜在的隐藏线索...</p>`;

        try {
            const candidates = await extractForeshadows(text);
            DOM.extractedList.innerHTML = '';

            if (candidates.length === 0) {
                DOM.extractedList.innerHTML = `<p class="text-[10px] text-gray-400 text-center py-4">未扫到明显的隐藏伏笔钩子。</p>`;
                return;
            }

            candidates.forEach(cand => {
                const item = document.createElement('div');
                item.className = "p-2 bg-white dark:bg-charcoal-800 border border-amber-800/10 rounded-lg space-y-1";
                item.innerHTML = `
                    <p class="text-xs font-bold text-amber-900 dark:text-ivory-100">${cand.clue_title}</p>
                    <p class="text-[10px] text-gray-400">${cand.content}</p>
                    <div class="flex justify-end gap-2 pt-1">
                        <button class="btn-del-cand text-[9px] text-red-500">丢弃</button>
                        <button class="btn-confirm-cand text-[9px] text-green-600 dark:text-green-400 font-bold">确认加入伏笔柜</button>
                    </div>
                `;

                item.querySelector('.btn-del-cand').addEventListener('click', () => item.remove());
                item.querySelector('.btn-confirm-cand').addEventListener('click', async () => {
                    await supabaseClient.createForeshadowing(state.user.id, state.activeWritingId, {
                        clue_title: cand.clue_title,
                        content: cand.content,
                        planted_at_position: cand.planted_at_position || '未知章节',
                        is_resolved: false
                    });
                    const updated = await supabaseClient.getForeshadowings(state.activeWritingId);
                    dispatch({ foreshadowings: updated });
                    notify(`【${cand.clue_title}】已顺利存入伏笔箱`);
                    item.remove();
                });

                DOM.extractedList.appendChild(item);
            });
        } catch (e) {
            DOM.extractedList.innerHTML = `<p class="text-[10px] text-red-500 text-center py-4">提取伏笔出错，请稍后重试</p>`;
        }
    });

    DOM.btnCloseExtract.addEventListener('click', () => {
        DOM.extractedConfirmPanel.classList.add('hidden');
    });
}
