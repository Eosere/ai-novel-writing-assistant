import fs from 'fs'
import path from 'path'
import GuideContent from './GuideContent'

export default function GuidePage() {
  const filePath = path.join(process.cwd(), 'docs', 'user-guide.md')
  let markdown = ''
  try {
    markdown = fs.readFileSync(filePath, 'utf-8')
  } catch {
    markdown = '# 暂无指引内容'
  }

  return <GuideContent markdown={markdown} />
}
