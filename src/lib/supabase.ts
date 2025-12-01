import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const missingEnv: string[] = []
if (!supabaseUrl) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseAnonKey) missingEnv.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (missingEnv.length > 0) {
  // Vercel のビルドログでどれが足りないか分かるようにする
  throw new Error(
    `Missing Supabase environment variables: ${missingEnv.join(', ')}`
  )
}

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!
)


