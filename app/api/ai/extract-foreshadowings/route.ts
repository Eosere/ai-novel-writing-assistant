import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractForeshadowings } from '@/lib/openai'

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
    
    const { text, writing_id } = await request.json()
    
    if (!text) {
      return NextResponse.json(
        { success: false, message: '请输入要分析的文本' },
        { status: 400 }
      )
    }
    
    const limitedText = text.slice(-2000)
    
    const result = await extractForeshadowings(limitedText)
    
    return NextResponse.json({
      success: true,
      foreshadowings: result.foreshadowings,
      remaining_requests: rateLimitResult.remaining
    })
  } catch (error) {
    console.error('伏笔提取API错误:', error)
    return NextResponse.json(
      { success: false, message: 'AI服务暂时不可用' },
      { status: 500 }
    )
  }
}