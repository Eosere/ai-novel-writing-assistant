import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateThemePrompt } from '@/lib/openai'

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }
    
    const rateLimitResult = checkRateLimit(userId)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: 'AI调用次数已达上限，请稍后再试' },
        { status: 429 }
      )
    }
    
    const { theme } = await request.json()
    
    if (!theme) {
      return NextResponse.json(
        { success: false, message: '请选择主题' },
        { status: 400 }
      )
    }
    
    const result = await generateThemePrompt(theme)
    
    return NextResponse.json({
      success: true,
      prompt: result.prompt,
      remaining_requests: rateLimitResult.remaining
    })
  } catch (error) {
    console.error('主题引导语API错误:', error)
    return NextResponse.json(
      { success: false, message: 'AI服务暂时不可用' },
      { status: 500 }
    )
  }
}