'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { requestPasswordReset } from './actions'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6">
        <h1 className="text-2xl font-black text-white">Recuperar senha</h1>
        <p className="text-slate-400 text-sm mt-2">Você receberá um link por e-mail para redefinir sua senha.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (loading) return
            setLoading(true)
            try {
              const res = await requestPasswordReset(email)
              toast.success('Se o e-mail existir, enviaremos um link de recuperação.')
              if ((res as any).previewLink) {
                toast.message('Link de teste (dev):', { description: (res as any).previewLink })
              }
              setEmail('')
            } catch (err: any) {
              toast.error(err?.message || 'Erro ao solicitar recuperação')
            } finally {
              setLoading(false)
            }
          }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-200 ml-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 text-white rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder="exemplo@supercob.com.br"
            />
          </div>
          <button
            type="submit"
            disabled={loading || email.trim() === ''}
            className="w-full py-3 px-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link'}
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

