'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

interface GuideContentProps {
  markdown: string
}

function markdownToHtml(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-800 mt-8 mb-3 pb-2 border-b border-gray-200">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[\s-:]+$/.test(c))) return ''
      const isHeader = false
      const tag = isHeader ? 'th' : 'td'
      const row = cells.map(c => `<${tag} class="px-4 py-2 border border-gray-200 text-sm">${c.trim()}</${tag}>`).join('')
      return `<tr>${row}</tr>`
    })
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-600">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-600">$1</li>')
    // Paragraphs (lines that aren't already HTML tags)
    .replace(/^(?!<[hbltuo]|<\/)(.+)$/gm, '<p class="text-gray-600 mb-2 leading-relaxed">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*">\s*<\/p>/g, '')

  // Wrap consecutive <tr> in table
  html = html.replace(/((?:<tr>.*<\/tr>\s*)+)/g, (match) => {
    const rows = match.replace(/<tr>/g, '<tr class="even:bg-gray-50">')
    return `<table class="w-full border-collapse my-4">${rows}</table>`
  })

  return html
}

export default function GuideContent({ markdown }: GuideContentProps) {
  const router = useRouter()
  const htmlContent = useMemo(() => markdownToHtml(markdown), [markdown])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">新手指引</h1>
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-1 px-4 py-2 text-sm text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>返回写作</span>
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className="bg-white rounded-xl shadow-sm p-8 prose-sm"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  )
}
