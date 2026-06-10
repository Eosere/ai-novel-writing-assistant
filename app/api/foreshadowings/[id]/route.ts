import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      )
    }
    
    const { content, used, keywords } = await request.json()
    
    const { error } = await supabase
      .from('foreshadowings')
      .update({ content, used, keywords, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', userId)
    
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, message: '更新成功' })
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
      .from('foreshadowings')
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