import { supabase } from './supabase'

/**
 * 管理者ユーザーの識別
 * user_metadata.role または profiles テーブルから role を取得
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // user_metadata.role をチェック（優先）
    if (user.user_metadata?.role === 'admin') {
      return true
    }

    // profiles テーブルから role を取得（存在する場合）
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      // テーブルが存在しない場合はエラーを無視
      if (error && error.code !== 'PGRST116') {
        console.warn('profilesテーブルの取得エラー:', error)
      }

      return profile?.role === 'admin'
    } catch (profileError) {
      // profilesテーブルが存在しない場合はuser_metadataのみを信頼
      return false
    }
  } catch (error) {
    console.error('管理者チェックエラー:', error)
    return false
  }
}

/**
 * 現在のユーザーが管理者かどうかをチェック
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    return await isAdminUser(user.id)
  } catch (error) {
    console.error('管理者チェックエラー:', error)
    return false
  }
}

