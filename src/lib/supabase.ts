import { createClient } from '@supabase/supabase-js'

// Required envs: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const missing: string[] = []
if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (missing.length > 0) {
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}`
  )
}

// TypeScript: After the check above, we know these are defined
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)


