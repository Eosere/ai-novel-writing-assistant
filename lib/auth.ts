import { supabase, getServerClient } from './supabase'

export interface User {
  id: string
  user_id: string
  created_at: string
}

export async function signUp(password: string): Promise<{ success: boolean; user_id?: string; message?: string }> {
  try {
    const serverClient = getServerClient()
    const { data: maxData, error: maxError } = await serverClient
      .from('users')
      .select('user_id')
      .order('user_id', { ascending: false })
      .limit(1)
    
    if (maxError) throw maxError
    
    let nextId = 1
    if (maxData && maxData.length > 0 && maxData[0].user_id) {
      nextId = parseInt(maxData[0].user_id) + 1
    }
    
    const userId = String(nextId).padStart(6, '0')
    
    const hashedPassword = await hashPassword(password)
    
    const { error: insertError } = await serverClient
      .from('users')
      .insert({ user_id: userId, password_hash: hashedPassword })
    
    if (insertError) {
      if (insertError.message.includes('duplicate key')) {
        console.log(`User ID ${userId} already exists, retrying...`)
        await new Promise(resolve => setTimeout(resolve, 100))
        return signUp(password)
      }
      console.error('Insert user error:', insertError)
      return { success: false, message: insertError.message }
    }
    
    return { success: true, user_id: userId }
  } catch (error) {
    console.error('Sign up catch error:', error)
    return { success: false, message: error instanceof Error ? error.message : '注册失败' }
  }
}

export async function signIn(user_id: string, password: string): Promise<{ success: boolean; user_id?: string; message?: string }> {
  try {
    const serverClient = getServerClient()
    const { data: userData, error: userError } = await serverClient
      .from('users')
      .select('password_hash')
      .eq('user_id', user_id)
      .single()
    
    if (userError) {
      console.error('SignIn query error:', userError)
      return { success: false, message: '用户不存在' }
    }
    
    if (!userData || !userData.password_hash) {
      return { success: false, message: '用户不存在' }
    }
    
    const isValid = await verifyPassword(password, userData.password_hash)
    
    if (!isValid) {
      return { success: false, message: '密码错误' }
    }
    
    return { success: true, user_id }
  } catch (error) {
    console.error('SignIn catch error:', error)
    return { success: false, message: error instanceof Error ? error.message : '登录失败' }
  }
}

export async function signOut(): Promise<{ success: boolean; message?: string }> {
  return { success: true }
}

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') {
    return null
  }
  
  try {
    const userId = localStorage.getItem('novel-assistant-user')
    
    if (!userId) {
      return null
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, user_id, created_at')
      .eq('user_id', userId)
      .single()
    
    if (userError) {
      localStorage.removeItem('novel-assistant-user')
      return null
    }
    
    return userData || null
  } catch (error) {
    return null
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('novel-assistant-user')
}

export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

// 服务端API使用的认证函数 - 从请求头获取用户ID
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    const userId = request.headers.get('x-user-id') || 
                   request.headers.get('X-User-Id')
    
    if (!userId) {
      return null
    }
    
    const serverClient = getServerClient()
    const { data: userData, error } = await serverClient
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .single()
    
    if (error || !userData) {
      return null
    }
    
    return userId
  } catch (error) {
    return null
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password)
  return hashed === hash
}
