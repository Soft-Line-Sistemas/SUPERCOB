'use client'

import React from 'react'
import { Camera, Download, Eye, Image as ImageIcon, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { DocItem } from './types'

export function ClientStepAnexos({
  editingClient,
  docs,
  selectedFiles = [],
  previewUrl,
  inputFileRef,
  inputCameraRef,
  onPickFiles,
  handleUpload,
  uploading,
  progress,
  setSelectedFiles,
  setPreviewUrl,
  formatSize,
  handleDeleteDoc,
  isAdmin,
}: {
  editingClient: boolean
  docs: DocItem[]
  selectedFiles: File[]
  previewUrl: string | null
  inputFileRef: React.RefObject<HTMLInputElement | null>
  inputCameraRef: React.RefObject<HTMLInputElement | null>
  onPickFiles: (files: File[]) => void
  handleUpload: () => Promise<void>
  uploading: boolean
  progress: number
  setSelectedFiles: (files: File[]) => void
  setPreviewUrl: (url: string | null) => void
  formatSize: (n: number) => string
  handleDeleteDoc: (id: string) => Promise<void>
  isAdmin?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Anexos de Documentos</p>
          {!editingClient && <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pode anexar vários e enviar ao salvar</span>}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => inputFileRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-gold-600 text-white text-sm font-black rounded-2xl"
          >
            <ImageIcon className="w-4 h-4" /> Selecionar Arquivos
          </button>
          <button
            type="button"
            onClick={() => inputCameraRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 dark:bg-white dark:text-black text-white text-sm font-black rounded-2xl"
          >
            <Camera className="w-4 h-4" /> Capturar Foto
          </button>
          <input
            ref={inputFileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              onPickFiles(files)
            }}
          />
          <input
            ref={inputCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              onPickFiles(files)
            }}
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivos Pendentes ({selectedFiles.length})</p>
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                    ) : file.type.startsWith('video/') ? (
                      <Download className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <Download className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase">{formatSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...selectedFiles]
                      next.splice(idx, 1)
                      setSelectedFiles(next)
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={uploading || !editingClient}
                onClick={() => handleUpload()}
                className="flex-1 py-3 bg-emerald-600 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {uploading ? `Enviando ${progress}%...` : 'Fazer Upload Agora'}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => setSelectedFiles([])}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-black rounded-xl"
              >
                Limpar Tudo
              </button>
            </div>

            {uploading && (
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-2">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          {!editingClient ? (
            <p className="text-xs text-slate-500">Após salvar o cliente, os anexos enviados aparecerão aqui.</p>
          ) : docs.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum documento anexado.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivos Salvos ({docs.length})</p>
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                    {d.mimeType.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-slate-500" /> : d.mimeType.startsWith('video/') ? <Download className="w-5 h-5 text-indigo-500" /> : <Download className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{d.originalName}</p>
                    <p className="text-[10px] font-bold text-slate-500">{formatSize(d.size)}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-black rounded-xl flex items-center gap-1 dark:text-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </a>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(d.id)}
                        className="px-3 py-2 bg-red-600 text-white text-xs font-black rounded-xl flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

