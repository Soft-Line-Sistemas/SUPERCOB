'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resetPassword } from './actions'

export default function RedefinirSenhaPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => sp.get('token') ?? '', [sp])
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6">
        <h1 className="text-2xl font-black text-white">Redefinir senha</h1>
        <p className="text-slate-400 text-sm mt-2">Defina sua nova senha de acesso.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (loading) return
            if (senha !== confirmacao) {
              toast.error('As senhas não conferem.')
              return
            }
            setLoading(true)
            try {
              await resetPassword(token, senha)
              toast.success('Senha redefinida com sucesso!')
              router.push('/login')
            } catch (err: any) {
              toast.error(err?.message || 'Erro ao redefinir senha')
            } finally {
              setLoading(false)
            }
          }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-200 ml-1">Nova senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 text-white rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-200 ml-1">Confirmar senha</label>
            <input
              type="password"
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 text-white rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading || token.trim() === ''}
            className="w-full py-3 px-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm font-bold text-blue-400 hover:text-blue-300">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}

