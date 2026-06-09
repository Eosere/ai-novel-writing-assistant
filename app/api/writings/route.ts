import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }
    
    const { data, error } = await supabase
      .from('writings')
      .select('id, title, content, theme, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }
    
    const { title, theme, theme_prompt } = await request.json()
    
    const { data, error } = await supabase
      .from('writings')
      .insert({
        user_id: userId,
        title: title || '未命名文档',
        content: '',
        theme,
        theme_prompt
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}
