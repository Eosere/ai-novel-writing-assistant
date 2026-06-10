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
    
    const url = new URL(request.url)
    const writing_id = url.searchParams.get('writing_id')
    
    let query = supabase
      .from('foreshadowings')
      .select('id, content, writing_id, position_index, used, keywords, created_at')
      .eq('user_id', userId)
    
    if (writing_id) {
      query = query.eq('writing_id', writing_id)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
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
    
    const { content, writing_id, position_index, keywords } = await request.json()
    
    if (!content) {
      return NextResponse.json(
        { success: false, message: '请输入伏笔内容' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('foreshadowings')
      .insert({
        user_id: userId,
        content,
        writing_id,
        position_index: position_index || 0,
        keywords: keywords || [],
        used: false
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