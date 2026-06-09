import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 客户端使用的 Supabase 客户端（受 RLS 限制）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 服务端使用的 Supabase 客户端（绕过 RLS）
// 需要在 .env.local 中添加 SUPABASE_SERVICE_ROLE_KEY
let _serverClient: SupabaseClient | null = null

export function getServerClient(): SupabaseClient {
  if (!_serverClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      _serverClient = createClient(supabaseUrl, serviceRoleKey)
    } else {
      // 没有 service role key 时回退到 anon key
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set, using anon key (RLS will apply)')
      _serverClient = supabase
    }
  }
  return _serverClient
}
