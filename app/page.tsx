'use client'

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import AuthForm from '@/components/AuthForm'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import NewDocumentModal from '@/components/NewDocumentModal'
import { getCurrentUser, isLoggedIn } from '@/lib/auth'

const Editor = lazy(() => import('@/components/Editor'))

interface Writing {
  id: number
  title: string
  content: string
  theme: string | null
  theme_prompt: string | null
  created_at: string
  updated_at: string
}

interface Foreshadowing {
  id: number
  content: string
  writing_id: number
  used: boolean
  keywords: string[]
}

interface ContinueCandidate {
  id: number
  style: string
  content: string
}

interface ValidateError {
  id: number
  type: string
  message: string
  suggestion: string
  startIndex: number
  endIndex: number
}

interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const LOCAL_STORAGE_KEY = 'novel-assistant-draft'

export default function Home() {
  const [user, setUser] = useState<{ user_id: string } | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [writings, setWritings] = useState<Writing[]>([])
  const [foreshadowings, setForeshadowings] = useState<Foreshadowing[]>([])
  const [currentWriting, setCurrentWriting] = useState<Writing | null>(null)
  const [showNewDocModal, setShowNewDocModal] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [candidates, setCandidates] = useState<ContinueCandidate[]>([])
  const [errors, setErrors] = useState<ValidateError[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string>('')
  const [rateLimitRemaining, setRateLimitRemaining] = useState(10)
  const [rateLimitResetIn, setRateLimitResetIn] = useState<string>('')
  const [highlightedKeywords, setHighlightedKeywords] = useState<string[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastIdRef = useRef(0)

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `toast-${++toastIdRef.current}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // 封装API请求，自动携带用户ID
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const userId = localStorage.getItem('novel-assistant-user')
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-User-Id': userId || ''
    }
    return fetch(url, { ...options, headers })
  }

  const loadWritings = useCallback(async () => {
    try {
      const response = await apiRequest('/api/writings')
      const data = await response.json()
      if (data.success) {
        setWritings(data.data)
        if (data.data.length > 0) {
          setCurrentWriting(prev => prev || data.data[0])
        }
      }
    } catch (error) {
      console.error('加载文档列表失败:', error)
    }
  }, [])

  const loadForeshadowings = useCallback(async () => {
    try {
      const response = await apiRequest('/api/foreshadowings')
      const data = await response.json()
      if (data.success) {
        setForeshadowings(data.data)
      }
    } catch (error) {
      console.error('加载伏笔列表失败:', error)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true)
      const loggedIn = await isLoggedIn()
      if (loggedIn) {
        const userData = await getCurrentUser()
        if (userData) {
          setUser(userData)
        }
      }
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadWritings()
      loadForeshadowings()
    }
  }, [user, loadWritings, loadForeshadowings])

  useEffect(() => {
    if (currentWriting) {
      const keywords = foreshadowings
        .filter(f => !f.used)
        .flatMap(f => f.keywords)
      
      const text = currentWriting.content.toLowerCase()
      const matched = keywords.filter(k => text.includes(k.toLowerCase()))
      setHighlightedKeywords(matched)
    }
  }, [currentWriting, foreshadowings])

  useEffect(() => {
    const loadDraft = () => {
      const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedDraft && !currentWriting && writings.length === 0) {
        try {
          const draft = JSON.parse(savedDraft)
          if (draft.content && draft.content.length > 0) {
            setCurrentWriting({
              id: -1,
              title: draft.title || '未命名文档',
              content: draft.content,
              theme: null,
              theme_prompt: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        } catch (e) {
          console.error('加载草稿失败:', e)
        }
      }
    }

    if (!isCheckingAuth) {
      loadDraft()
    }
  }, [isCheckingAuth, currentWriting, writings.length])

  useEffect(() => {
    if (currentWriting && currentWriting.id === -1) {
      const draft = {
        title: currentWriting.title,
        content: currentWriting.content,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft))
    }
  }, [currentWriting])

  useEffect(() => {
    if (currentWriting && currentWriting.id > 0 && currentWriting.content) {
      const syncToCloud = async () => {
        setSyncStatus('syncing')
        try {
          const response = await apiRequest(`/api/writings/${currentWriting.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: currentWriting.content }),
          })
          const data = await response.json()
          if (data.success && data.data?.updated_at) {
            setCurrentWriting(prev => prev ? { ...prev, updated_at: data.data.updated_at } : null)
          }
          setSyncStatus('synced')
          setTimeout(() => setSyncStatus('idle'), 2000)
        } catch (error) {
          console.error('云端同步失败:', error)
          setSyncStatus('idle')
        }
      }

      const debounce = setTimeout(syncToCloud, 30000)
      return () => clearTimeout(debounce)
    }
  }, [currentWriting?.content, currentWriting?.id])

  // Cross-device sync: poll for changes every 60 seconds
  useEffect(() => {
    if (!user) return

    const pollForChanges = async () => {
      try {
        const response = await apiRequest('/api/writings')
        const data = await response.json()
        if (data.success) {
          setWritings(prev => {
            const merged = [...prev]
            data.data.forEach((cloudDoc: Writing) => {
              const localIndex = merged.findIndex(w => w.id === cloudDoc.id)
              if (localIndex === -1) {
                merged.push(cloudDoc)
              } else {
                const localDoc = merged[localIndex]
                if (new Date(cloudDoc.updated_at) > new Date(localDoc.updated_at)) {
                  merged[localIndex] = cloudDoc
                  if (currentWriting?.id === cloudDoc.id) {
                    setCurrentWriting(cloudDoc)
                  }
                }
              }
            })
            return merged.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          })

          const foreshadowingsResponse = await apiRequest('/api/foreshadowings')
          const foreshadowingsData = await foreshadowingsResponse.json()
          if (foreshadowingsData.success) {
            setForeshadowings(foreshadowingsData.data)
          }
        }
      } catch (error) {
        console.error('同步检查失败:', error)
      }
    }

    const interval = setInterval(pollForChanges, 60000)
    return () => clearInterval(interval)
  }, [user, currentWriting?.id])

  const callAI = async (action: string, params: Record<string, any>) => {
    try {
      const response = await apiRequest('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })

      const data = await response.json()

      if (data.remaining_requests !== undefined) {
        setRateLimitRemaining(data.remaining_requests)
      }

      if (data.reset_in) {
        setRateLimitResetIn(data.reset_in)
      }

      if (response.status === 429) {
        addToast('warning', data.error || 'AI调用次数已达上限')
        return { success: false, error: data.error }
      }

      if (!data.success) {
        addToast('error', data.error || '操作失败')
        return { success: false, error: data.error }
      }

      return { success: true, data: data.data }
    } catch (error) {
      addToast('error', '网络错误，请检查网络连接后重试')
      return { success: false, error: '网络错误' }
    }
  }

  const handleLogin = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    // 不需要清除 novel-assistant-user，因为已经设置了新的登录状态
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('novel-assistant-user')
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setUser(null)
    setWritings([])
    setForeshadowings([])
    setCurrentWriting(null)
  }

  const handleSelectWriting = async (id: number) => {
    try {
      const response = await apiRequest(`/api/writings/${id}`)
      const data = await response.json()
      if (data.success) {
        setCurrentWriting(data.data)
        setShowCandidates(false)
        setShowErrors(false)
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    } catch (error) {
      console.error('加载文档失败:', error)
    }
  }

  const handleCreateWriting = async (title: string, theme: string | null, themePrompt: string | null) => {
    try {
      const response = await apiRequest('/api/writings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, theme, theme_prompt: themePrompt }),
      })
      const data = await response.json()
      if (data.success) {
        loadWritings()
        setCurrentWriting(data.data)
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    } catch (error) {
      console.error('创建文档失败:', error)
    }
  }

  const handleDeleteWriting = async (id: number) => {
    if (!confirm('确定要删除这个文档吗？')) return

    try {
      const response = await apiRequest(`/api/writings/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        loadWritings()
        if (currentWriting?.id === id) {
          setCurrentWriting(null)
        }
      }
    } catch (error) {
      console.error('删除文档失败:', error)
    }
  }

  const handleChangeContent = (content: string) => {
    if (currentWriting) {
      setCurrentWriting(prev => prev ? { ...prev, content, updated_at: new Date().toISOString() } : null)
    }
  }

  const handleChangeTitle = async (title: string) => {
    if (currentWriting) {
      setCurrentWriting(prev => prev ? { ...prev, title } : null)
      
      if (currentWriting.id > 0) {
        try {
          await apiRequest(`/api/writings/${currentWriting.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          })
        } catch (error) {
          console.error('保存标题失败:', error)
        }
      }
    }
  }

  const handleSave = async () => {
    if (!currentWriting || currentWriting.id <= 0) return
    try {
      await apiRequest(`/api/writings/${currentWriting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentWriting.title,
          content: currentWriting.content,
          theme: currentWriting.theme,
          theme_prompt: currentWriting.theme_prompt,
        }),
      })
      addToast('success', '保存成功')
    } catch (error) {
      addToast('error', '保存失败')
    }
  }

  const handleUndo = () => {
    const cmElement = document.querySelector('.CodeMirror') as any
    if (cmElement?.CodeMirror) {
      cmElement.CodeMirror.undo()
    }
  }

  const handleContinue = async () => {
    if (!currentWriting) return
    if (currentWriting.content.length < 50) {
      addToast('warning', '请输入至少50字上下文')
      return
    }

    setIsLoading(true)
    setLoadingAction('续写')
    setShowCandidates(false)

    try {
      const result = await callAI('continue', {
        context: currentWriting.content,
        writing_id: currentWriting.id > 0 ? currentWriting.id : undefined,
      })

      if (result.success && result.data && result.data.candidates && result.data.candidates.length > 0) {
        setCandidates(result.data.candidates)
        setShowCandidates(true)
        setShowErrors(false)
        addToast('success', '续写完成，获得3条候选')
      } else {
        addToast('error', result.error || '续写失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
      setLoadingAction('')
    }
  }

  const handleValidate = async () => {
    if (!currentWriting) return
    if (!currentWriting.content.trim()) {
      addToast('warning', '请输入要检查的文本')
      return
    }

    setIsLoading(true)
    setLoadingAction('纠错检查')
    setShowErrors(false)

    try {
      const result = await callAI('validate', {
        text: currentWriting.content,
      })

      if (result.success && result.data) {
        setErrors(result.data.errors || [])
        setShowErrors(true)
        setShowCandidates(false)
        if (result.data.errors && result.data.errors.length > 0) {
          addToast('info', `发现${result.data.errors.length}个问题`)
        } else {
          addToast('success', '未发现问题，文章写得不错！')
        }
      } else {
        addToast('error', result.error || '纠错检查失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
      setLoadingAction('')
    }
  }

  const handleIgnoreError = useCallback((errorId: number) => {
    setErrors(prev => prev.filter(e => e.id !== errorId))
    if (errors.length <= 1) {
      setShowErrors(false)
    }
    addToast('info', '已忽略该错误')
  }, [errors.length])

  const handleExtractForeshadowings = async () => {
    if (!currentWriting) return
    if (!currentWriting.content.trim()) {
      addToast('warning', '请输入要分析的文本')
      return
    }

    setIsLoading(true)
    setLoadingAction('提取伏笔')

    try {
      const result = await callAI('extract-foreshadowings', {
        text: currentWriting.content,
        writing_id: currentWriting.id > 0 ? currentWriting.id : undefined,
      })

      if (result.success && result.data) {
        if (result.data.foreshadowings && result.data.foreshadowings.length > 0) {
          showForeshadowingPreview(result.data.foreshadowings)
        } else {
          addToast('info', '未提取到伏笔')
        }
      } else {
        addToast('error', result.error || '伏笔提取失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
      setLoadingAction('')
    }
  }

  const showForeshadowingPreview = (foreshadowings: any[]) => {
    const previewModal = document.createElement('div')
    previewModal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
    previewModal.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div class="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4">
          <h3 class="text-lg font-bold">提取到以下伏笔候选</h3>
          <p class="text-sm opacity-90">请选择要保存的伏笔（点击确认后才会入库）</p>
        </div>
        <div class="p-4 max-h-96 overflow-y-auto">
          ${foreshadowings.map((f: any, i: number) => `
            <div class="p-3 border border-gray-200 rounded-lg mb-2 hover:border-primary-300 transition cursor-pointer">
              <label class="flex items-start cursor-pointer">
                <input type="checkbox" id="foreshadowing-${i}" class="mt-1 mr-3 w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500" checked>
                <div class="flex-1">
                  <p class="text-sm text-gray-700">${f.content}</p>
                  ${f.keywords && f.keywords.length > 0 ? `<p class="text-xs text-gray-400 mt-2">关键词: ${f.keywords.map((k: string) => `<span class="inline-block px-1.5 py-0.5 bg-gray-100 rounded mr-1">${k}</span>`).join('')}</p>` : ''}
                </div>
              </label>
            </div>
          `).join('')}
        </div>
        <div class="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button id="cancel-btn" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium">取消</button>
          <button id="confirm-btn" class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-medium">确认保存</button>
        </div>
      </div>
    `
    document.body.appendChild(previewModal)

    const confirmBtn = previewModal.querySelector('#confirm-btn')
    const cancelBtn = previewModal.querySelector('#cancel-btn')

    const handleConfirm = async () => {
      const checkboxes = previewModal.querySelectorAll('input[type="checkbox"]:checked')
      let savedCount = 0

      for (let i = 0; i < checkboxes.length; i++) {
        const checkbox = checkboxes[i] as HTMLInputElement
        const index = parseInt(checkbox.id.split('-')[1])
        const foreshadowing = foreshadowings[index]
        
        if (currentWriting && currentWriting.id > 0) {
          await apiRequest('/api/foreshadowings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: foreshadowing.content,
              writing_id: currentWriting.id,
              position_index: currentWriting.content.length,
              keywords: foreshadowing.keywords || [],
            }),
          })
          savedCount++
        }
      }
      
      loadForeshadowings()
      document.body.removeChild(previewModal)
      addToast('success', `已保存${savedCount}条伏笔`)
    }

    confirmBtn?.addEventListener('click', handleConfirm)
    cancelBtn?.addEventListener('click', () => {
      document.body.removeChild(previewModal)
    })
  }

  const handleStyleCheck = async () => {
    if (!currentWriting) return
    if (!currentWriting.content.trim()) {
      addToast('warning', '请输入要检查的文本')
      return
    }

    setIsLoading(true)
    setLoadingAction('风格检查')

    try {
      const result = await callAI('style-check', {
        text: currentWriting.content,
        theme: currentWriting.theme || '',
      })

      if (result.success && result.data) {
        showFeedbackModal(result.data.feedback || '未检测到风格不一致问题')
      } else {
        addToast('error', result.error || '风格检查失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
      setLoadingAction('')
    }
  }

  const showFeedbackModal = (feedback: string) => {
    const feedbackModal = document.createElement('div')
    feedbackModal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
    feedbackModal.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div class="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <h3 class="text-lg font-bold">风格检查反馈</h3>
          <button id="close-x-btn" class="text-white/80 hover:text-white transition p-1 rounded-lg hover:bg-white/20" title="关闭">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-6 overflow-y-auto flex-1">
          <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">${feedback}</p>
        </div>
        <div class="px-6 py-4 bg-gray-50 flex justify-end shrink-0">
          <button id="close-btn" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">关闭</button>
        </div>
      </div>
    `
    document.body.appendChild(feedbackModal)

    const closeModal = () => {
      if (document.body.contains(feedbackModal)) {
        document.body.removeChild(feedbackModal)
      }
    }

    const closeBtn = feedbackModal.querySelector('#close-btn')
    const closeXBtn = feedbackModal.querySelector('#close-x-btn')
    closeBtn?.addEventListener('click', closeModal)
    closeXBtn?.addEventListener('click', closeModal)
    feedbackModal.addEventListener('click', (e) => {
      if (e.target === feedbackModal) closeModal()
    })
  }

  const handleToggleForeshadowingUsed = async (id: number, used: boolean) => {
    try {
      await apiRequest(`/api/foreshadowings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ used }),
      })
      loadForeshadowings()
    } catch (error) {
      console.error('更新伏笔状态失败:', error)
    }
  }

  const handleDeleteForeshadowing = async (id: number) => {
    try {
      await apiRequest(`/api/foreshadowings/${id}`, { method: 'DELETE' })
      loadForeshadowings()
    } catch (error) {
      console.error('删除伏笔失败:', error)
    }
  }

  const handleAddForeshadowing = async (content: string, keywords: string[]) => {
    if (!currentWriting || currentWriting.id <= 0) {
      addToast('warning', '请先保存文档后再添加伏笔')
      return
    }

    try {
      const response = await apiRequest('/api/foreshadowings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          writing_id: currentWriting.id,
          position_index: currentWriting.content.length,
          keywords,
        }),
      })

      const data = await response.json()

      if (data.success) {
        loadForeshadowings()
        addToast('success', '伏笔添加成功')
      } else {
        addToast('error', data.message || '添加失败')
      }
    } catch (error) {
      addToast('error', '网络错误，请稍后重试')
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onSuccess={handleLogin} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      <Header userId={user.user_id} onLogout={handleLogout} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          writings={writings}
          foreshadowings={foreshadowings}
          currentWritingId={currentWriting?.id || null}
          onSelectWriting={handleSelectWriting}
          onCreateWriting={() => setShowNewDocModal(true)}
          onDeleteWriting={handleDeleteWriting}
          onToggleForeshadowingUsed={handleToggleForeshadowingUsed}
          onDeleteForeshadowing={handleDeleteForeshadowing}
          onAddForeshadowing={handleAddForeshadowing}
          highlightedKeywords={highlightedKeywords}
        />

        {currentWriting ? (
          <>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>}>
              <Editor
                content={currentWriting.content}
                title={currentWriting.title}
                themePrompt={currentWriting.theme_prompt}
                onChangeContent={handleChangeContent}
                onChangeTitle={handleChangeTitle}
                onContinue={handleContinue}
                onValidate={handleValidate}
                onExtractForeshadowings={handleExtractForeshadowings}
                onStyleCheck={handleStyleCheck}
                onIgnoreError={handleIgnoreError}
                onSave={handleSave}
                onUndo={handleUndo}
                candidates={candidates}
                errors={errors}
                showCandidates={showCandidates}
                showErrors={showErrors}
                isLoading={isLoading}
                loadingAction={loadingAction}
                rateLimitRemaining={rateLimitRemaining}
                rateLimitResetIn={rateLimitResetIn}
              />
            </Suspense>
            {syncStatus === 'syncing' && (
              <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">正在同步...</span>
              </div>
            )}
            {syncStatus === 'synced' && (
              <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">已同步</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">选择或创建文档</h3>
              <p className="text-sm">从左侧列表选择一个文档，或点击"新建文档"创建新的写作</p>
            </div>
          </div>
        )}
      </div>

      {showNewDocModal && (
        <NewDocumentModal
          onClose={() => setShowNewDocModal(false)}
          onCreate={handleCreateWriting}
        />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-500 border-t-transparent"></div>
            <span className="text-gray-700 font-medium">{loadingAction}中...</span>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 hover:opacity-80"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
