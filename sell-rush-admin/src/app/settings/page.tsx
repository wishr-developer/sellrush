'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../components/ui/dialog'
import { Shield, QrCode, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import QRCodeLib from 'qrcode'

/**
 * 設定ページ
 * MFA/TOTPセットアップ機能
 */
export default function SettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [isMfaDialogOpen, setIsMfaDialogOpen] = useState(false)
  const [mfaStep, setMfaStep] = useState<'qr' | 'verify'>('qr')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [isMfaLoading, setIsMfaLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // MFAステータスの確認
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        
        const factors = data?.all || []
        const totpFactor = factors.find((factor) => factor.factor_type === 'totp' && factor.status === 'verified')
        setMfaEnabled(!!totpFactor)
      } catch (error) {
        console.error('MFAステータスの確認に失敗:', error)
      }
    }
    
    checkMfaStatus()
  }, [])

  // MFAセットアップ開始
  const handleStartMfaSetup = async () => {
    setIsMfaLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error) throw error

      if (data?.totp?.qr_code && data?.id) {
        // QRコードを生成
        const qrDataUrl = await QRCodeLib.toDataURL(data.totp.qr_code)
        setQrCodeDataUrl(qrDataUrl)
        setMfaFactorId(data.id)
        setMfaStep('qr')
        setIsMfaDialogOpen(true)
      } else {
        throw new Error('QRコードの取得に失敗しました')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'MFAのセットアップに失敗しました')
    } finally {
      setIsMfaLoading(false)
    }
  }

  // MFAコード確認
  const handleVerifyMfaCode = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      setErrorMessage('6桁のコードを入力してください')
      return
    }

    if (!mfaFactorId) {
      setErrorMessage('MFAファクターが見つかりません')
      return
    }

    setIsMfaLoading(true)
    setErrorMessage(null)

    try {
      // challengeAndVerifyを使用してコードを検証
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      })

      if (error) throw error

      setSuccessMessage('2段階認証が有効化されました')
      setMfaEnabled(true)
      setIsMfaDialogOpen(false)
      setMfaCode('')
      setQrCodeDataUrl(null)
      setMfaFactorId(null)
      setMfaStep('qr')
    } catch (error: any) {
      setErrorMessage(error.message || 'コードの確認に失敗しました')
    } finally {
      setIsMfaLoading(false)
    }
  }

  // MFA解除
  const handleDisableMfa = async () => {
    if (!confirm('2段階認証を解除しますか？')) {
      return
    }

    setIsMfaLoading(true)
    setErrorMessage(null)

    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError

      const factors = data?.all || []
      const totpFactor = factors.find((factor) => factor.factor_type === 'totp' && factor.status === 'verified')
      if (!totpFactor) {
        throw new Error('MFAファクターが見つかりません')
      }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      })

      if (unenrollError) throw unenrollError

      setSuccessMessage('2段階認証が解除されました')
      setMfaEnabled(false)
    } catch (error: any) {
      setErrorMessage(error.message || 'MFAの解除に失敗しました')
    } finally {
      setIsMfaLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">設定</h1>
          <p className="text-gray-400">運営管理画面の設定を管理します</p>
        </div>

        {/* セキュリティ設定セクション */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-semibold">セキュリティ設定</h2>
          </div>

          {/* MFAセクション */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold mb-2">2段階認証 (MFA/TOTP)</h3>
              <p className="text-sm text-gray-400 mb-4">
                ログイン時に追加の認証コードを要求することで、アカウントのセキュリティを強化します
              </p>
            </div>

            {/* MFAステータス */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mfaEnabled ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium text-white">有効</div>
                        <div className="text-xs text-gray-400">2段階認証が有効になっています</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium text-white">無効</div>
                        <div className="text-xs text-gray-400">2段階認証が設定されていません</div>
                      </div>
                    </>
                  )}
                </div>
                {mfaEnabled ? (
                  <Button
                    onClick={handleDisableMfa}
                    disabled={isMfaLoading}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    {isMfaLoading ? '処理中...' : 'MFAを解除する'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartMfaSetup}
                    disabled={isMfaLoading}
                    className="bg-gradient-to-r from-red-600 to-orange-400 text-white hover:opacity-90"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {isMfaLoading ? '処理中...' : 'MFAを設定する'}
                  </Button>
                )}
              </div>
            </div>

            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {errorMessage}
              </div>
            )}

            {/* 成功メッセージ */}
            {successMessage && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MFAセットアップDialog */}
      <Dialog open={isMfaDialogOpen} onOpenChange={setIsMfaDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => {
            setIsMfaDialogOpen(false)
            setMfaStep('qr')
            setMfaCode('')
            setQrCodeDataUrl(null)
            setMfaFactorId(null)
            setErrorMessage(null)
          }} />
          <DialogHeader>
            <DialogTitle>2段階認証のセットアップ</DialogTitle>
            <DialogDescription>
              {mfaStep === 'qr' 
                ? 'QRコードをスキャンして、認証アプリに追加してください'
                : '認証アプリに表示されている6桁のコードを入力してください'}
            </DialogDescription>
          </DialogHeader>

          {mfaStep === 'qr' && qrCodeDataUrl && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400 mb-2">
                  <strong>手順:</strong>
                </p>
                <ol className="text-xs text-blue-300/80 space-y-1 list-decimal list-inside">
                  <li>Google Authenticator、Microsoft Authenticatorなどのアプリを開く</li>
                  <li>「QRコードをスキャン」を選択</li>
                  <li>上記のQRコードをスキャン</li>
                  <li>アプリに6桁のコードが表示されたら「次へ」をクリック</li>
                </ol>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsMfaDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => setMfaStep('verify')}
                  className="bg-gradient-to-r from-red-600 to-orange-400 text-white hover:opacity-90"
                >
                  次へ
                </Button>
              </DialogFooter>
            </div>
          )}

          {mfaStep === 'verify' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-300 mb-2">
                  認証コード（6桁）
                </label>
                <Input
                  id="mfa-code"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setMfaCode(value)
                  }}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  認証アプリに表示されている6桁のコードを入力してください
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMfaStep('qr')
                    setMfaCode('')
                    setErrorMessage(null)
                  }}
                >
                  戻る
                </Button>
                <Button
                  onClick={handleVerifyMfaCode}
                  disabled={mfaCode.length !== 6 || isMfaLoading}
                  className="bg-gradient-to-r from-red-600 to-orange-400 text-white hover:opacity-90 flex items-center gap-2"
                >
                  {isMfaLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      確認中...
                    </>
                  ) : (
                    '有効化'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

