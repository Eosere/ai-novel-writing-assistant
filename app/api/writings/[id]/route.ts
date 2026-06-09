import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: { id: string } }) {
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
      .select('id, title, content, theme, theme_prompt, created_at, updated_at')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { success: false, message: '文档不存在' },
        { status: 404 }
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }

    const { title, content, theme, theme_prompt } = await request.json()
    const updatedAt = new Date().toISOString()

    const { error } = await supabase
      .from('writings')
      .update({ title, content, theme, theme_prompt, updated_at: updatedAt })
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    const { data: updatedData } = await supabase
      .from('writings')
      .select('id, title, content, theme, theme_prompt, created_at, updated_at')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    return NextResponse.json({ success: true, data: updatedData })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }
    
    const { error } = await supabase
      .from('writings')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)
    
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}