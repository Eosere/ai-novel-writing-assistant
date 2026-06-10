import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI小说写作训练助手',
  description: '智能续写、纠错检查、伏笔管理的私密写作辅助工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
