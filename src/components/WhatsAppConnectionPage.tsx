'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, QrCode, RefreshCcw, Unplug } from 'lucide-react'
import { toast } from 'sonner'

type QrStatus = {
  ready: boolean
  qrAvailable: boolean
  qr: string | null
  generatedAt: number | null
  message: string
}

export function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<QrStatus | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [lastQrImageUrl, setLastQrImageUrl] = useState<string | null>(null)

  const loadStatus = async (refresh = false, silent = false) => {
    if (refresh) setRefreshing(true)
    else if (!silent) setInitialLoading(true)

    try {
      const res = await fetch(`/api/whatsapp/qr${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erro ao consultar WhatsApp')
      setStatus(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao consultar WhatsApp')
    } finally {
      if (!silent) setInitialLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadStatus()
    const id = setInterval(() => {
      if (document.hidden) return
      void loadStatus(false, true)
    }, 15000)
    return () => clearInterval(id)
  }, [])

  const qrImageUrl = useMemo(() => {
    if (!status?.qr) return null
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(status.qr)}`
  }, [status?.qr])

  useEffect(() => {
    if (qrImageUrl) setLastQrImageUrl(qrImageUrl)
  }, [qrImageUrl])

  const disconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao desconectar')
      toast.success('Sessão desconectada')
      await loadStatus(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Conexão WhatsApp</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escaneie o QR Code para habilitar a mensageria automática de cobrança.
        </p>
      </div>

      <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_-25px_rgba(2,6,23,0.25)]">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center">
          <div className="w-full rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 p-5 min-h-[360px] flex items-center justify-center shadow-inner">
            {initialLoading ? (
              <div className="text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando status...
              </div>
            ) : status?.ready ? (
              <div className="text-emerald-600">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                <p className="font-black">WhatsApp conectado</p>
              </div>
            ) : lastQrImageUrl ? (
              <Image
                src={lastQrImageUrl}
                alt="QR Code WhatsApp"
                width={300}
                height={300}
                className="w-[300px] h-[300px] border-[6px] border-slate-800 dark:border-slate-200 bg-white p-2 shadow-lg"
                unoptimized
              />
            ) : (
              <div className="text-slate-500">
                <QrCode className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">QR ainda não disponível</p>
              </div>
            )}
          </div>

          <p className="text-xs font-medium text-slate-500 mt-3 min-h-5">{status?.message || 'Aguardando status...'}</p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-gold-600 text-white text-sm font-black flex items-center gap-2 shadow-md shadow-gold-700/25 hover:bg-gold-700 transition-colors disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Novo QR
            </button>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-black flex items-center gap-2 shadow-md shadow-red-700/25 hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />} Desconectar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
