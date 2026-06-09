import { NextResponse } from 'next/server'
import { signUp } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    console.log('Register request received, password length:', password?.length)
    
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: '密码长度至少6位' },
        { status: 400 }
      )
    }
    
    const result = await signUp(password)
    
    console.log('Sign up result:', result)
    
    if (result.success) {
      return NextResponse.json({ success: true, user_id: result.user_id })
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}
