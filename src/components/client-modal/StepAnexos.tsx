'use client'

import React from 'react'
import { Camera, Download, Eye, Image as ImageIcon, Trash2 } from 'lucide-react'
import type { DocItem } from './types'

export function ClientStepAnexos({
  editingClient,
  docs,
  selectedFile,
  previewUrl,
  inputFileRef,
  inputCameraRef,
  onPickFile,
  handleUpload,
  uploading,
  progress,
  setSelectedFile,
  setPreviewUrl,
  formatSize,
  handleDeleteDoc,
}: {
  editingClient: boolean
  docs: DocItem[]
  selectedFile: File | null
  previewUrl: string | null
  inputFileRef: React.RefObject<HTMLInputElement | null>
  inputCameraRef: React.RefObject<HTMLInputElement | null>
  onPickFile: (file: File | null) => void
  handleUpload: () => Promise<void>
  uploading: boolean
  progress: number
  setSelectedFile: (file: File | null) => void
  setPreviewUrl: (url: string | null) => void
  formatSize: (n: number) => string
  handleDeleteDoc: (id: string) => Promise<void>
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Anexos de Documentos</p>
          {!editingClient && <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pode anexar agora e enviar ao salvar</span>}
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => inputFileRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl"
          >
            <ImageIcon className="w-4 h-4" /> Selecionar Arquivo
          </button>
          <button
            type="button"
            onClick={() => inputCameraRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl"
          >
            <Camera className="w-4 h-4" /> Capturar Foto
          </button>
          <input
            ref={inputFileRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={inputCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {selectedFile && (
          <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <Download className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatSize(selectedFile.size)}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading || !editingClient}
                  onClick={() => handleUpload()}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl disabled:opacity-50"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setSelectedFile(null)
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl)
                      setPreviewUrl(null)
                    }
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 text-xs font-black rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </div>
            {uploading && (
              <div className="mt-3 w-full h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
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
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                    {d.mimeType.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-slate-500" /> : <Download className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{d.originalName}</p>
                    <p className="text-[10px] font-bold text-slate-500">{formatSize(d.size)}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white border border-slate-200 text-xs font-black rounded-xl flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(d.id)}
                      className="px-3 py-2 bg-red-600 text-white text-xs font-black rounded-xl flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
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

