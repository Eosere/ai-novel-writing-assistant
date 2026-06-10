'use client'

import { useState } from 'react'

interface NewDocumentModalProps {
  onClose: () => void
  onCreate: (title: string, theme: string | null) => void
}

const themes = [
  {
    name: '雨夜推理',
    icon: '🌧️',
    description: '发生在雨夜的悬疑故事，紧张刺激',
    color: 'from-blue-600 to-blue-800'
  },
  {
    name: '初次相遇',
    icon: '💕',
    description: '浪漫的邂逅，怦然心动的瞬间',
    color: 'from-pink-500 to-rose-500'
  },
  {
    name: '重逢',
    icon: '🤝',
    description: '久别重逢，情感交织',
    color: 'from-purple-500 to-purple-700'
  },
  {
    name: '背叛',
    icon: '⚔️',
    description: '信任崩塌，人性考验',
    color: 'from-red-600 to-red-800'
  },
  {
    name: '时空交错',
    icon: '🌀',
    description: '跨越时空的奇幻旅程',
    color: 'from-indigo-600 to-indigo-800'
  },
  {
    name: '孤岛惊魂',
    icon: '🏝️',
    description: '封闭空间的生存游戏',
    color: 'from-teal-600 to-teal-800'
  },
  {
    name: '梦境穿梭',
    icon: '💭',
    description: '现实与梦境的边界模糊',
    color: 'from-cyan-500 to-cyan-700'
  },
  {
    name: '时光倒流',
    icon: '⏳',
    description: '回到过去，改变命运',
    color: 'from-amber-500 to-amber-700'
  },
  {
    name: '秘密花园',
    icon: '🌺',
    description: '隐藏的秘密，神秘的角落',
    color: 'from-green-600 to-green-800'
  },
  {
    name: '未来都市',
    icon: '🌃',
    description: '赛博朋克与高科技世界',
    color: 'from-gray-700 to-gray-900'
  }
]

export default function NewDocumentModal({ onClose, onCreate }: NewDocumentModalProps) {
  const [title, setTitle] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!title.trim() && !selectedTheme) {
      onCreate('未命名文档', null)
    } else {
      onCreate(title.trim() || '未命名文档', selectedTheme)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-primary-500 to-purple-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">新建文档</h2>
              <p className="text-sm text-white/80 mt-1">选择主题开始创作，或跳过直接开始写作</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">文档标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              placeholder="输入文档标题"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">选择主题（可选）</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setSelectedTheme(selectedTheme === theme.name ? null : theme.name)}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    selectedTheme === theme.name
                      ? `bg-gradient-to-br ${theme.color} text-white border-transparent shadow-lg scale-[1.02]`
                      : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{theme.icon}</span>
                    <span className={`font-medium ${selectedTheme === theme.name ? 'text-white' : 'text-gray-800'}`}>
                      {theme.name}
                    </span>
                  </div>
                  <p className={`text-xs ${selectedTheme === theme.name ? 'text-white/90' : 'text-gray-500'}`}>
                    {theme.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-lg hover:from-primary-600 hover:to-purple-600 transition font-medium shadow-sm flex items-center"
          >
            {selectedTheme ? '开始创作' : '创建文档'}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
