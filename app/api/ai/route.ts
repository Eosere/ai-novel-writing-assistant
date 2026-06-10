export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { checkRateLimit, formatRateLimitReset, CONTEXT_MAX_LENGTH } from '@/lib/rate-limit'
import { generateContinue, validateText, extractForeshadowings, generateThemePrompt, styleCheck } from '@/lib/openai'

type AIAction = 'continue' | 'validate' | 'extract-foreshadowings' | 'generate-theme-prompt' | 'style-check'

interface AIRequest {
  action: AIAction
  context?: string
  text?: string
  theme?: string
  writing_id?: number
}

interface AIResponse {
  success: boolean
  data?: any
  error?: string
  remaining_requests?: number
  reset_in?: string
}

function validateRequest(req: AIRequest): string | null {
  if (!req.action) {
    return '缺少action参数'
  }
  
  const validActions: AIAction[] = ['continue', 'validate', 'extract-foreshadowings', 'generate-theme-prompt', 'style-check']
  if (!validActions.includes(req.action)) {
    return `无效的action类型，可选值: ${validActions.join(', ')}`
  }
  
  if (req.action === 'continue' && !req.context) {
    return '续写功能需要提供context参数'
  }
  
  if (req.action === 'validate' && !req.text) {
    return '纠错功能需要提供text参数'
  }
  
  if (req.action === 'extract-foreshadowings' && !req.text) {
    return '伏笔提取功能需要提供text参数'
  }
  
  if (req.action === 'generate-theme-prompt' && !req.theme) {
    return '主题引导语生成需要提供theme参数'
  }
  
  if (req.action === 'style-check' && (!req.text || !req.theme)) {
    return '风格检查需要提供text和theme参数'
  }
  
  return null
}

function truncateContext(text: string, maxLength: number = CONTEXT_MAX_LENGTH): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(-maxLength)
}

const MAX_RETRIES = 1
const REQUEST_TIMEOUT = 30000

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<{ data?: T; error?: string; timedOut?: boolean; retriesUsed?: number }> {
  let lastError: string = ''
  let timedOut = false
  let retriesUsed = 0

  for (let i = 0; i <= retries; i++) {
    retriesUsed = i
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), timeoutMs)
      })

      const data = await Promise.race([fn(), timeoutPromise])
      return { data, retriesUsed: i }
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      
      // 余额不足等非网络错误，直接返回不重试
      if (errorMsg.includes('402') || errorMsg.includes('Insufficient Balance')) {
        return { error: 'AI服务余额不足，请联系管理员充值', retriesUsed: i }
      }
      
      // 认证错误不重试
      if (errorMsg.includes('401') || errorMsg.includes('Incorrect API key')) {
        return { error: 'AI服务认证失败，请检查API密钥配置', retriesUsed: i }
      }
      
      if (errorMsg === '请求超时') {
        timedOut = true
        lastError = 'AI响应超时，请稍后重试'
        console.log(`AI请求超时，重试中 (${i + 1}/${retries + 1})...`)
        continue
      }
      
      // 网络错误可以重试
      if (errorMsg.includes('Connection') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('fetch failed')) {
        lastError = 'AI服务连接失败: ' + errorMsg
        if (i < retries) {
          console.log(`AI连接失败，重试中 (${i + 1}/${retries + 1})...`)
          continue
        }
      } else {
        lastError = errorMsg
        break
      }
    }
  }

  return { error: lastError, timedOut, retriesUsed }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json<AIResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }
    
    const rateLimitResult = await checkRateLimit(userId)
    
    if (!rateLimitResult.allowed) {
      const resetIn = formatRateLimitReset(rateLimitResult.resetAt)
      return NextResponse.json<AIResponse>(
        { 
          success: false, 
          error: `AI调用次数已达上限，请在${resetIn}后重试`,
          remaining_requests: 0,
          reset_in: resetIn
        },
        { status: 429 }
      )
    }
    
    const body: AIRequest = await request.json()
    
    const validationError = validateRequest(body)
    if (validationError) {
      return NextResponse.json<AIResponse>(
        { success: false, error: validationError },
        { status: 400 }
      )
    }
    
    let result: any
    const action = body.action
    
    switch (action) {
      case 'continue': {
        const context = truncateContext(body.context || '')
        if (context.length < 50) {
          return NextResponse.json<AIResponse>(
            { success: false, error: '上下文至少需要50字' },
            { status: 400 }
          )
        }

        const { data, error, timedOut, retriesUsed } = await callWithRetry(() => generateContinue(context))

        if (error || !data) {
          const errorMsg = retriesUsed && retriesUsed > 0
            ? `AI响应超时（已重试${retriesUsed}次），请稍后重试`
            : (timedOut ? 'AI响应超时，请稍后重试' : (error || '续写失败'))
          return NextResponse.json<AIResponse>(
            {
              success: false,
              error: errorMsg,
              remaining_requests: rateLimitResult.remaining
            },
            { status: 500 }
          )
        }

        result = {
          success: true,
          data: { candidates: data.candidates },
          remaining_requests: rateLimitResult.remaining
        }
        break
      }
      
      case 'validate': {
        const text = truncateContext(body.text || '')

        const { data, error, timedOut, retriesUsed } = await callWithRetry(() => validateText(text))

        if (error || !data) {
          const errorMsg = retriesUsed && retriesUsed > 0
            ? `AI响应超时（已重试${retriesUsed}次），请稍后重试`
            : (timedOut ? 'AI响应超时，请稍后重试' : (error || '检查失败'))
          return NextResponse.json<AIResponse>(
            {
              success: false,
              error: errorMsg,
              remaining_requests: rateLimitResult.remaining
            },
            { status: 500 }
          )
        }

        result = {
          success: true,
          data: { errors: data.errors },
          remaining_requests: rateLimitResult.remaining
        }
        break
      }

      case 'extract-foreshadowings': {
        const text = truncateContext(body.text || '')

        const { data, error, timedOut, retriesUsed } = await callWithRetry(() => extractForeshadowings(text))

        if (error || !data) {
          const errorMsg = retriesUsed && retriesUsed > 0
            ? `AI响应超时（已重试${retriesUsed}次），请稍后重试`
            : (timedOut ? 'AI响应超时，请稍后重试' : (error || '提取失败'))
          return NextResponse.json<AIResponse>(
            {
              success: false,
              error: errorMsg,
              remaining_requests: rateLimitResult.remaining
            },
            { status: 500 }
          )
        }

        result = {
          success: true,
          data: { foreshadowings: data.foreshadowings },
          remaining_requests: rateLimitResult.remaining
        }
        break
      }

      case 'generate-theme-prompt': {
        const theme = body.theme || ''

        const { data, error, timedOut, retriesUsed } = await callWithRetry(() => generateThemePrompt(theme))

        if (error || !data) {
          const errorMsg = retriesUsed && retriesUsed > 0
            ? `AI响应超时（已重试${retriesUsed}次），请稍后重试`
            : (timedOut ? 'AI响应超时，请稍后重试' : (error || '生成失败'))
          return NextResponse.json<AIResponse>(
            {
              success: false,
              error: errorMsg,
              remaining_requests: rateLimitResult.remaining
            },
            { status: 500 }
          )
        }

        result = {
          success: true,
          data: { prompt: data.prompt },
          remaining_requests: rateLimitResult.remaining
        }
        break
      }

      case 'style-check': {
        const text = truncateContext(body.text || '')
        const theme = body.theme || ''

        const { data, error, timedOut, retriesUsed } = await callWithRetry(() => styleCheck(text, theme))

        if (error || !data) {
          const errorMsg = retriesUsed && retriesUsed > 0
            ? `AI响应超时（已重试${retriesUsed}次），请稍后重试`
            : (timedOut ? 'AI响应超时，请稍后重试' : (error || '检查失败'))
          return NextResponse.json<AIResponse>(
            {
              success: false,
              error: errorMsg,
              remaining_requests: rateLimitResult.remaining
            },
            { status: 500 }
          )
        }

        result = {
          success: true,
          data: { feedback: data.feedback },
          remaining_requests: rateLimitResult.remaining
        }
        break
      }
      
      default:
        return NextResponse.json<AIResponse>(
          { success: false, error: '未知的操作类型' },
          { status: 400 }
        )
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('AI接口错误:', error)
    return NextResponse.json<AIResponse>(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'AI统一接口',
    supported_actions: [
      'continue - 智能续写',
      'validate - 纠错检查',
      'extract-foreshadowings - 伏笔提取',
      'generate-theme-prompt - 主题引导语',
      'style-check - 风格检查'
    ]
  })
}
