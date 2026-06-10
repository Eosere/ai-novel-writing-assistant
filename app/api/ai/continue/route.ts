import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateContinue } from '@/lib/openai'

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
    
    const { context, writing_id } = await request.json()
    
    if (!context || context.length < 50) {
      return NextResponse.json(
        { success: false, message: '上下文至少需要50字' },
        { status: 400 }
      )
    }
    
    const limitedContext = context.slice(-2000)
    
    const result = await generateContinue(limitedContext)
    
    return NextResponse.json({
      success: true,
      candidates: result.candidates,
      remaining_requests: rateLimitResult.remaining
    })
  } catch (error) {
    console.error('AI续写API错误:', error)
    return NextResponse.json(
      { success: false, message: 'AI服务暂时不可用' },
      { status: 500 }
    )
  }
}