import { NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { user_id, password } = await request.json()
    
    if (!user_id || !password) {
      return NextResponse.json(
        { success: false, message: '请输入用户ID和密码' },
        { status: 400 }
      )
    }
    
    const result = await signIn(user_id, password)
    
    if (result.success) {
      return NextResponse.json({ success: true, user_id: result.user_id })
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}
