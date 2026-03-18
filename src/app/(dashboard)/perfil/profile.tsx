'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { updateMyAvatar, updateMyPassword } from './actions'

export function Profile({ me }: { me: { id: string; nome: string; email: string; role: string; avatarUrl: string | null } }) {
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
        <p className="text-slate-500">Atualize sua foto e senha de acesso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Conta</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-black text-slate-700 overflow-hidden">
              {me.avatarUrl ? (
                <img src={me.avatarUrl} alt={me.nome} className="w-full h-full object-cover" />
              ) : (
                me.nome?.[0] || 'U'
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{me.nome}</p>
              <p className="text-xs font-bold text-slate-500 truncate">{me.email}</p>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mt-1">{me.role}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Foto do Perfil</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (loadingAvatar) return
              setLoadingAvatar(true)
              try {
                await updateMyAvatar(avatarUrl.trim() === '' ? null : avatarUrl.trim())
                toast.success('Foto atualizada!')
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao atualizar foto')
              } finally {
                setLoadingAvatar(false)
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">URL da imagem</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Remover
              </button>
              <button
                type="submit"
                disabled={loadingAvatar}
                className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {loadingAvatar ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Senha</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (loadingPassword) return
            setLoadingPassword(true)
            try {
              await updateMyPassword(currentPassword, newPassword)
              toast.success('Senha atualizada!')
              setCurrentPassword('')
              setNewPassword('')
            } catch (err: any) {
              toast.error(err?.message || 'Erro ao atualizar senha')
            } finally {
              setLoadingPassword(false)
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loadingPassword || currentPassword.trim() === '' || newPassword.trim() === ''}
              className="w-full py-3 px-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
            >
              {loadingPassword ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
