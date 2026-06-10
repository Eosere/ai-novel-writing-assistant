'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import SimpleMDE from 'react-simplemde-editor'
import 'easymde/dist/easymde.min.css'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

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
  originalText: string
  startIndex: number
  endIndex: number
}

interface EditorProps {
  content: string
  title: string
  themePrompt: string | null
  onChangeContent: (content: string) => void
  onChangeTitle: (title: string) => void
  onContinue: () => void
  onValidate: () => void
  onExtractForeshadowings: () => void
  onStyleCheck: () => void
  onIgnoreError: (errorId: number) => void
  onSave: () => void
  onUndo: () => void
  candidates: ContinueCandidate[]
  errors: ValidateError[]
  showCandidates: boolean
  showErrors: boolean
  isLoading: boolean
  loadingAction: string
  rateLimitRemaining: number
  rateLimitResetIn?: string
}

export default function Editor({
  content,
  title,
  themePrompt,
  onChangeContent,
  onChangeTitle,
  onContinue,
  onValidate,
  onExtractForeshadowings,
  onStyleCheck,
  onIgnoreError,
  onSave,
  onUndo,
  candidates,
  errors,
  showCandidates,
  showErrors,
  isLoading,
  loadingAction,
  rateLimitRemaining,
  rateLimitResetIn,
}: EditorProps) {
  const simpleMdeRef = useRef<any>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [insertedCandidateId, setInsertedCandidateId] = useState<number | null>(null)
  const [activeErrorId, setActiveErrorId] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (content.trim() && content.length > 0) {
        setIsAutoSaving(true)
        setLastSavedTime(new Date())
        setTimeout(() => setIsAutoSaving(false), 1500)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [content])

  const handleChange = (value: string) => {
    onChangeContent(value)
  }

  // 导出为Word文档
  const handleExportWord = useCallback(async () => {
    const text = content || ''
    if (!text.trim()) return

    // 将Markdown文本按段落拆分并转换为docx段落
    const lines = text.split('\n')
    const paragraphs: Paragraph[] = []

    // 添加标题
    paragraphs.push(
      new Paragraph({
        text: title || '未命名文档',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    )

    for (const line of lines) {
      if (!line.trim()) {
        // 空行
        paragraphs.push(new Paragraph({ text: '' }))
      } else if (line.startsWith('# ')) {
        // 一级标题
        paragraphs.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }))
      } else if (line.startsWith('## ')) {
        // 二级标题
        paragraphs.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }))
      } else if (line.startsWith('### ')) {
        // 三级标题
        paragraphs.push(new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }))
      } else if (line.startsWith('> ')) {
        // 引用
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace('> ', ''), italics: true, color: '666666' })],
          spacing: { before: 100, after: 100 },
          indent: { left: 720 },
        }))
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // 列表项
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace(/^[-*]\s/, '') })],
          bullet: { level: 0 },
          spacing: { before: 50, after: 50 },
        }))
      } else {
        // 普通段落 - 处理粗体和斜体
        const runs: TextRun[] = []
        const boldRegex = /\*\*(.+?)\*\*/g
        const italicRegex = /\*(.+?)\*/g
        let remaining = line
        let match

        // 简单处理：先处理粗体，再处理斜体
        const parts = remaining.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        for (const part of parts) {
          if (!part) continue
          if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
          } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true }))
          } else {
            runs.push(new TextRun({ text: part }))
          }
        }

        paragraphs.push(new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun({ text: line })],
          spacing: { before: 100, after: 100 },
        }))
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${title || '未命名文档'}.docx`)
  }, [content, title])

  // 将全文字符索引转换为 CodeMirror 的 {line, ch} 坐标
  const posFromIndex = useCallback((cm: any, index: number): { line: number; ch: number } | null => {
    if (index < 0) return null
    const lines = (cm.getValue() as string).split('\n')
    let remaining = index
    for (let line = 0; line < lines.length; line++) {
      const lineLen = lines[line].length
      if (remaining <= lineLen) {
        return { line, ch: remaining }
      }
      remaining -= lineLen + 1 // +1 for the newline character
    }
    return { line: lines.length - 1, ch: lines[lines.length - 1]?.length || 0 }
  }, [])

  // 通过 originalText 在编辑器内容中搜索真实的起止位置
  const findErrorRange = useCallback((cm: any, error: ValidateError): { from: { line: number; ch: number }; to: { line: number; ch: number } } | null => {
    const contentText = cm.getValue() as string

    // 优先使用 originalText 精确搜索
    if (error.originalText && error.originalText.trim()) {
      const searchText = error.originalText.trim()
      const idx = contentText.indexOf(searchText)
      if (idx >= 0) {
        const from = posFromIndex(cm, idx)
        const to = posFromIndex(cm, idx + searchText.length)
        if (from && to) return { from, to }
      }
      // 模糊搜索：去掉标点后匹配
      const cleanContent = contentText.replace(/[，。！？、；：""''（）\s]/g, '')
      const cleanSearch = searchText.replace(/[，。！？、；：""''（）\s]/g, '')
      const cleanIdx = cleanContent.indexOf(cleanSearch)
      if (cleanIdx >= 0) {
        // 将模糊匹配的位置映射回原文（简单方式：逐字符映射）
        let realIdx = 0
        let cleanPos = 0
        for (; realIdx < contentText.length && cleanPos < cleanIdx; realIdx++) {
          if (!/[，。！？、；：""''（）\s]/.test(contentText[realIdx])) {
            cleanPos++
          }
        }
        const from = posFromIndex(cm, realIdx)
        const to = posFromIndex(cm, realIdx + searchText.length)
        if (from && to) return { from, to }
      }
    }

    // 回退：使用 AI 提供的 startIndex/endIndex
    if (error.startIndex >= 0 && error.endIndex > error.startIndex && error.endIndex <= contentText.length) {
      const from = posFromIndex(cm, error.startIndex)
      const to = posFromIndex(cm, error.endIndex)
      if (from && to) return { from, to }
    }

    return null
  }, [posFromIndex])

  // 统一获取 CodeMirror 实例的辅助函数
  const getCMInstance = useCallback((): any => {
    const mdeInstance = simpleMdeRef.current
    if (mdeInstance) {
      const cm = mdeInstance.editor?.codemirror 
        || mdeInstance.codemirror 
        || mdeInstance.editor
      if (cm) return cm
    }
    // 从 DOM 获取
    const cmElement = document.querySelector('.CodeMirror') as any
    if (cmElement && cmElement.CodeMirror) {
      return cmElement.CodeMirror
    }
    return null
  }, [])

  const handleInsertCandidate = useCallback((candidate: ContinueCandidate) => {
    const cm = getCMInstance()
    if (!cm) {
      console.error('无法获取编辑器实例')
      return
    }

    // 插入到文章末尾
    const lastLine = cm.lastLine ? cm.lastLine() : (cm.lineCount ? cm.lineCount() - 1 : 0)
    const lastLineLength = cm.getLine ? (cm.getLine(lastLine)?.length || 0) : 0
    const endPos = { line: lastLine, ch: lastLineLength }
    
    const insertText = '\n\n' + candidate.content + '\n\n'
    
    if (cm.replaceRange) {
      cm.replaceRange(insertText, endPos)
    } else if (cm.setValue) {
      cm.setValue(cm.getValue() + insertText)
    }
    
    // 滚动并聚焦
    if (cm.setCursor) cm.setCursor({ line: lastLine + 3, ch: 0 })
    if (cm.scrollIntoView) cm.scrollIntoView({ line: lastLine + 3, ch: 0 })
    if (cm.focus) cm.focus()
    
    // 同步内容到父组件
    const newContent = cm.getValue ? cm.getValue() : ''
    if (newContent) onChangeContent(newContent)
    
    setInsertedCandidateId(candidate.id)
    setTimeout(() => setInsertedCandidateId(null), 2000)
  }, [getCMInstance, onChangeContent])

  const clearErrorHighlights = useCallback(() => {
    const cm = getCMInstance()
    if (!cm) return
    if (cm.errorMarkers) {
      cm.errorMarkers.forEach((marker: any) => marker.clear())
    }
    cm.errorMarkers = []
  }, [getCMInstance])

  const highlightErrors = useCallback((errorsToHighlight: ValidateError[]) => {
    const cm = getCMInstance()
    if (!cm) return

    clearErrorHighlights()

    const markers: any[] = []

    errorsToHighlight.forEach((error) => {
      try {
        const range = findErrorRange(cm, error)
        if (range) {
          const marker = cm.markText(
            range.from,
            range.to,
            { className: `error-highlight error-type-${error.type}`, clearOnEnter: true }
          )
          markers.push(marker)
        }
      } catch (e) {
        console.error('Error highlighting failed:', e)
      }
    })

    cm.errorMarkers = markers
  }, [getCMInstance, clearErrorHighlights, findErrorRange])

  const handleApplySuggestion = useCallback((error: ValidateError) => {
    const cm = getCMInstance()
    if (!cm) return

    const range = findErrorRange(cm, error)
    if (range) {
      cm.replaceRange(error.suggestion, range.from, range.to)
      const newContent = cm.getValue()
      onChangeContent(newContent)
      clearErrorHighlights()
      // 重新高亮剩余错误（排除已应用的）
      const remainingErrors = errors.filter(e => e.id !== error.id)
      if (remainingErrors.length > 0) {
        highlightErrors(remainingErrors)
      }
    }
  }, [getCMInstance, onChangeContent, clearErrorHighlights, findErrorRange, errors, highlightErrors])

  useEffect(() => {
    if (showErrors && errors.length > 0) {
      highlightErrors(errors)
    } else {
      clearErrorHighlights()
    }
  }, [showErrors, errors, highlightErrors, clearErrorHighlights])

  const jumpToError = useCallback((error: ValidateError) => {
    const cm = getCMInstance()
    if (!cm) return

    setActiveErrorId(error.id)
    const range = findErrorRange(cm, error)
    if (range) {
      cm.setCursor(range.from)
      cm.scrollIntoView({ from: range.from, to: range.to }, 200)
      cm.focus()
    }

    setTimeout(() => {
      setActiveErrorId(null)
    }, 2000)
  }, [getCMInstance, findErrorRange])

  const simpleMdeConfig = useMemo(() => ({
    spellChecker: false,
    toolbar: [
      {
        name: 'bold',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`**${selection}**`)
        },
        className: 'fa fa-bold',
        title: '粗体',
      },
      {
        name: 'italic',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`*${selection}*`)
        },
        className: 'fa fa-italic',
        title: '斜体',
      },
      {
        name: 'heading',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`# ${selection}`)
        },
        className: 'fa fa-header',
        title: '标题',
      },
      '|',
      {
        name: 'quote',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`> ${selection}`)
        },
        className: 'fa fa-quote-right',
        title: '引用',
      },
      {
        name: 'code',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`\`${selection}\``)
        },
        className: 'fa fa-code',
        title: '代码',
      },
      '|',
      {
        name: 'unordered-list',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`- ${selection}`)
        },
        className: 'fa fa-list-ul',
        title: '无序列表',
      },
      {
        name: 'ordered-list',
        action: (editor: any) => {
          const cm = editor.codemirror
          const selection = cm.getSelection()
          cm.replaceSelection(`1. ${selection}`)
        },
        className: 'fa fa-list-ol',
        title: '有序列表',
      },
      '|',
      'preview',
      'side-by-side',
      'fullscreen',
    ],
    placeholder: '开始写作...',
    status: false,
  }), [])

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'grammar': return '语法'
      case 'logic': return '逻辑'
      case 'punctuation': return '标点'
      default: return '其他'
    }
  }

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'bg-red-100 text-red-700 border-red-200'
      case 'logic': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'punctuation': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const handleContinueWithCheck = () => {
    if (content.length < 50) {
      alert('请输入至少50字上下文')
      return
    }
    if (rateLimitRemaining <= 0) {
      alert(`AI调用次数已达上限，请在${rateLimitResetIn || '1分钟后'}重试`)
      return
    }
    onContinue()
  }

  const handleValidateWithCheck = () => {
    if (!content.trim()) {
      alert('请输入要检查的文本')
      return
    }
    if (rateLimitRemaining <= 0) {
      alert(`AI调用次数已达上限，请在${rateLimitResetIn || '1分钟后'}重试`)
      return
    }
    onValidate()
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="text-lg font-medium text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 w-64"
            placeholder="未命名文档"
          />
          {isAutoSaving ? (
            <span className="text-xs text-green-600 flex items-center">
              <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              自动保存中...
            </span>
          ) : lastSavedTime ? (
            <span className="text-xs text-gray-400">
              上次保存: {formatTime(lastSavedTime)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onUndo}
            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title="撤回上一步"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
            撤回
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
            title="手动保存"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            保存
          </button>
          <button
            onClick={handleExportWord}
            className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg transition"
            title="导出为Word文档"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出Word
          </button>
          {rateLimitRemaining <= 3 && rateLimitRemaining > 0 && (
            <span className="text-xs text-orange-500 font-medium animate-pulse">
              剩余{rateLimitRemaining}次AI调用
            </span>
          )}
          {rateLimitRemaining <= 0 && (
            <span className="text-xs text-red-500 font-medium">
              AI调用已达上限
            </span>
          )}
          <div className="text-sm text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {rateLimitRemaining}/10
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            {themePrompt && (
              <div className="border-b border-gray-100 p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                <p className="text-xs text-purple-600 font-medium mb-1 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  主题引导
                </p>
                <p className="text-sm text-gray-700 italic leading-relaxed">{themePrompt}</p>
              </div>
            )}
            
            <div className="flex-1">
              <SimpleMDE
                ref={simpleMdeRef}
                value={content}
                onChange={handleChange}
                options={simpleMdeConfig}
              />
            </div>
          </div>
        </div>

        {showCandidates && candidates.length > 0 && (
          <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                续写候选
              </h3>
              <span className="text-xs text-gray-400">{candidates.length}条建议</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`p-4 border rounded-xl transition cursor-pointer ${
                    insertedCandidateId === candidate.id
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                  onClick={() => handleInsertCandidate(candidate)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      candidate.style === '悬疑紧张' ? 'bg-gray-900 text-white' :
                      candidate.style === '温情细腻' ? 'bg-pink-100 text-pink-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {insertedCandidateId === candidate.id ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          已插入
                        </>
                      ) : (
                        candidate.style
                      )}
                    </span>
                    {insertedCandidateId !== candidate.id && (
                      <span className="text-xs text-gray-400">点击插入</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{candidate.content}</p>
                  <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                    <span>{candidate.content.length}字</span>
                    <span className="text-primary-500">点击插入到编辑器</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                选择一条续写内容，点击后自动插入到编辑器光标位置
              </p>
            </div>
          </div>
        )}

        {showErrors && errors.length > 0 && (
          <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                纠错结果
              </h3>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{errors.length}个问题</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {errors.map((error, index) => (
                <div
                  key={error.id || index}
                  className={`p-3 rounded-lg border transition ${getErrorTypeColor(error.type)} ${
                    activeErrorId === error.id ? 'ring-2 ring-orange-400' : ''
                  }`}
                  onClick={() => jumpToError(error)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/50">
                      {getErrorTypeLabel(error.type)}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          jumpToError(error)
                        }}
                        className="text-xs bg-white/80 px-2 py-0.5 rounded hover:bg-white transition font-medium"
                        title="跳转到错误位置"
                      >
                        定位
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApplySuggestion(error)
                        }}
                        className="text-xs bg-green-100 px-2 py-0.5 rounded hover:bg-green-200 transition font-medium text-green-700"
                      >
                        应用
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onIgnoreError(error.id)
                        }}
                        className="text-xs bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300 transition font-medium text-gray-600"
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{error.message}</p>
                  {error.suggestion && (
                    <div className="mt-2 text-xs bg-white/30 p-2 rounded">
                      <span className="opacity-70">建议修改：</span>
                      <span className="font-medium">{error.suggestion}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                点击卡片定位到错误位置，支持一键应用或忽略
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleContinueWithCheck}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>智能续写</span>
            {isLoading && loadingAction === '续写' && (
              <svg className="w-4 h-4 animate-spin ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>

          <button
            onClick={handleValidateWithCheck}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>纠错检查</span>
            {isLoading && loadingAction === '纠错检查' && (
              <svg className="w-4 h-4 animate-spin ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>

          <button
            onClick={onExtractForeshadowings}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>提取伏笔</span>
            {isLoading && loadingAction === '提取伏笔' && (
              <svg className="w-4 h-4 animate-spin ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>

          <button
            onClick={onStyleCheck}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>风格检查</span>
            {isLoading && loadingAction === '风格检查' && (
              <svg className="w-4 h-4 animate-spin ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {content.length} 字
          </span>
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Markdown 支持</span>
        </div>
      </div>

      <style jsx global>{`
        .error-highlight {
          background-color: rgba(255, 200, 0, 0.3) !important;
          border-bottom: 2px solid rgba(255, 100, 0, 0.8) !important;
        }
        .error-type-grammar {
          background-color: rgba(255, 100, 100, 0.2) !important;
          border-bottom: 2px solid rgba(255, 50, 50, 0.8) !important;
        }
        .error-type-logic {
          background-color: rgba(255, 165, 0, 0.2) !important;
          border-bottom: 2px solid rgba(255, 140, 0, 0.8) !important;
        }
        .error-type-punctuation {
          background-color: rgba(100, 150, 255, 0.2) !important;
          border-bottom: 2px solid rgba(50, 100, 255, 0.8) !important;
        }
        .error-highlight:hover {
          background-color: rgba(255, 200, 0, 0.5) !important;
        }
      `}</style>
    </div>
  )
}
