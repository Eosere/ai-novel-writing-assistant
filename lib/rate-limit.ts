import { supabase } from './supabase'

const RATE_LIMIT = 10
const TIME_WINDOW = 60000

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now()
  
  try {
    const { data, error } = await supabase
      .from('ai_rate_limits')
      .select('request_count, last_request_time')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      await supabase
        .from('ai_rate_limits')
        .insert({ user_id: userId, request_count: 1, last_request_time: new Date().toISOString() })
      
      return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + TIME_WINDOW }
    }
    
    const lastReset = new Date(data.last_request_time).getTime()
    
    if (now - lastReset > TIME_WINDOW) {
      await supabase
        .from('ai_rate_limits')
        .update({ request_count: 1, last_request_time: new Date().toISOString() })
        .eq('user_id', userId)
      
      return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + TIME_WINDOW }
    }
    
    if (data.request_count >= RATE_LIMIT) {
      return { allowed: false, remaining: 0, resetAt: lastReset + TIME_WINDOW }
    }
    
    await supabase
      .from('ai_rate_limits')
      .update({ request_count: data.request_count + 1 })
      .eq('user_id', userId)
    
    return { 
      allowed: true, 
      remaining: RATE_LIMIT - data.request_count - 1, 
      resetAt: lastReset + TIME_WINDOW 
    }
  } catch (error) {
    console.error('限流检查失败，使用内存限流:', error)
    
    const memoryKey = `rate_limit_${userId}`
    const memoryData = (global as any)[memoryKey]
    
    if (!memoryData || now - memoryData.lastReset > TIME_WINDOW) {
      (global as any)[memoryKey] = { count: 1, lastReset: now }
      return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + TIME_WINDOW }
    }
    
    if (memoryData.count >= RATE_LIMIT) {
      return { allowed: false, remaining: 0, resetAt: memoryData.lastReset + TIME_WINDOW }
    }
    
    memoryData.count++
    return { allowed: true, remaining: RATE_LIMIT - memoryData.count, resetAt: memoryData.lastReset + TIME_WINDOW }
  }
}

export function formatRateLimitReset(resetAt: number): string {
  const remaining = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))
  if (remaining >= 60) {
    return `${Math.floor(remaining / 60)}分${remaining % 60}秒`
  }
  return `${remaining}秒`
}

export const CONTEXT_MAX_LENGTH = 2000
export const MAX_TOKENS = 500
export const REQUEST_TIMEOUT = 8000
