'use client'

import { useState, useEffect } from 'react'

interface Writing {
  id: number
  title: string
  content: string
  theme: string | null
  created_at: string
  updated_at: string
}

interface Foreshadowing {
  id: number
  content: string
  used: boolean
  keywords: string[]
  writing_id?: number
  position_index?: number
}

interface SidebarProps {
  writings: Writing[]
  foreshadowings: Foreshadowing[]
  currentWritingId: number | null
  onSelectWriting: (id: number) => void
  onCreateWriting: () => void
  onDeleteWriting: (id: number) => void
  onToggleForeshadowingUsed: (id: number, used: boolean) => void
  onDeleteForeshadowing: (id: number) => void
  onAddForeshadowing: (content: string, keywords: string[]) => void
  highlightedKeywords: string[]
}

export default function Sidebar({
  writings,
  foreshadowings,
  currentWritingId,
  onSelectWriting,
  onCreateWriting,
  onDeleteWriting,
  onToggleForeshadowingUsed,
  onDeleteForeshadowing,
  onAddForeshadowing,
  highlightedKeywords,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'writings' | 'foreshadowings'>('writings')
  const [showAddForeshadowing, setShowAddForeshadowing] = useState(false)
  const [newForeshadowing, setNewForeshadowing] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used'>('all')

  const currentWritingForeshadowings = foreshadowings.filter(
    f => !f.writing_id || f.writing_id === currentWritingId
  )

  const filteredForeshadowings = currentWritingForeshadowings.filter(f => {
    if (filterStatus === 'unused') return !f.used
    if (filterStatus === 'used') return f.used
    return true
  }).filter(f => {
    if (!searchKeyword) return true
    const keyword = searchKeyword.toLowerCase()
    return f.content.toLowerCase().includes(keyword) ||
           f.keywords.some(k => k.toLowerCase().includes(keyword))
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isKeywordMatch = (keywords: string[]) => {
    return keywords.some(k => highlightedKeywords.includes(k))
  }

  const handleAddForeshadowing = () => {
    if (!newForeshadowing.trim()) return
    
    const keywords = newKeywords
      .split(/[,，]/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
    
    onAddForeshadowing(newForeshadowing.trim(), keywords)
    setNewForeshadowing('')
    setNewKeywords('')
    setShowAddForeshadowing(false)
  }

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('writings')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === 'writings'
              ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          文档列表
          <span className="ml-1 text-xs opacity-60">({writings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('foreshadowings')}
          className={`flex-1 py-3 text-sm font-medium transition relative ${
            activeTab === 'foreshadowings'
              ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          伏笔箱
          {currentWritingForeshadowings.filter(f => !f.used).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
              {currentWritingForeshadowings.filter(f => !f.used).length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'writings' && (
          <div className="p-3">
            <button
              onClick={onCreateWriting}
              className="w-full mb-3 px-4 py-2.5 text-sm text-primary-600 border-2 border-dashed border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary-400 transition flex items-center justify-center space-x-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新建文档</span>
            </button>

            <div className="space-y-2">
              {writings.map((writing) => (
                <div
                  key={writing.id}
                  className={`group p-3 rounded-lg cursor-pointer transition border ${
                    currentWritingId === writing.id
                      ? 'bg-primary-50 border-primary-200 shadow-sm'
                      : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => onSelectWriting(writing.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-800 truncate flex items-center">
                        {writing.title}
                        {writing.theme && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded">
                            {writing.theme}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {formatDate(writing.updated_at)}
                      </p>
                      {writing.content && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {writing.content.slice(0, 50)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('确定要删除这个文档吗？')) {
                          onDeleteWriting(writing.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      title="删除文档"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {writings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-medium">暂无文档</p>
                  <p className="text-sm mt-1">点击上方按钮创建第一篇文档</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'foreshadowings' && (
          <div className="p-3">
            <div className="mb-3 space-y-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索伏笔或关键词..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition ${
                    filterStatus === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilterStatus('unused')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition ${
                    filterStatus === 'unused' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  未使用
                </button>
                <button
                  onClick={() => setFilterStatus('used')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition ${
                    filterStatus === 'used' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  已使用
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAddForeshadowing(!showAddForeshadowing)}
              className="w-full mb-3 px-4 py-2.5 text-sm text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition flex items-center justify-center space-x-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>手动添加伏笔</span>
            </button>

            {showAddForeshadowing && (
              <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <textarea
                  value={newForeshadowing}
                  onChange={(e) => setNewForeshadowing(e.target.value)}
                  placeholder="输入伏笔内容..."
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="关键词（用逗号分隔）"
                  className="w-full mt-2 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => setShowAddForeshadowing(false)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddForeshadowing}
                    disabled={!newForeshadowing.trim()}
                    className="flex-1 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredForeshadowings.map((foreshadowing, index) => {
                const isHighlighted = isKeywordMatch(foreshadowing.keywords)
                return (
                  <div
                    key={foreshadowing.id || index}
                    className={`p-3 rounded-lg border transition ${
                      isHighlighted
                        ? 'bg-yellow-50 border-yellow-300 shadow-sm'
                        : foreshadowing.used
                        ? 'bg-gray-50 border-gray-100 opacity-60'
                        : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed">{foreshadowing.content}</p>
                        {foreshadowing.keywords && foreshadowing.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {foreshadowing.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 text-xs rounded ${
                                  highlightedKeywords.includes(keyword)
                                    ? 'bg-yellow-200 text-yellow-800 font-medium'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isHighlighted && (
                      <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1.5 rounded flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        检测到相关词汇！
                      </div>
                    )}
                    
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <button
                        onClick={() => onToggleForeshadowingUsed(foreshadowing.id, !foreshadowing.used)}
                        className={`text-xs px-2.5 py-1 rounded transition ${
                          foreshadowing.used
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {foreshadowing.used ? '✓ 已使用' : '标记为已使用'}
                      </button>
                      <button
                        onClick={() => onDeleteForeshadowing(foreshadowing.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}

              {filteredForeshadowings.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">暂无伏笔</p>
                  <p className="text-sm mt-1">写作时自动提取伏笔候选</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-400 text-center">
          {activeTab === 'foreshadowings' ? (
            <>
              <p>伏笔仅保存在当前文档</p>
              <p className="mt-0.5">相关词汇会自动高亮提醒</p>
            </>
          ) : (
            <>
              <p>文档数据自动云端同步</p>
              <p className="mt-0.5">草稿每30秒自动保存</p>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
