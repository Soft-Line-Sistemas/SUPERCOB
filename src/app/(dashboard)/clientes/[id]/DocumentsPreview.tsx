'use client'

import React, { useMemo, useState } from 'react'
import { FileText, X, ZoomIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Doc = {
  id: string
  originalName: string
  mimeType: string
  size: number
  createdAt: string
  url: string
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPreview({ docs }: { docs: Doc[] }) {
  const [open, setOpen] = useState<Doc | null>(null)
  const images = useMemo(() => docs.filter((d) => d.mimeType.startsWith('image/')), [docs])
  const files = useMemo(() => docs.filter((d) => !d.mimeType.startsWith('image/')), [docs])

  return (
    <>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">Nenhum documento anexado.</p>
      ) : (
        <div className="space-y-4 mt-3">
          {images.length ? (
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Imagens</p>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setOpen(d)}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 hover:opacity-95 transition-opacity"
                    aria-label={`Abrir ${d.originalName}`}
                  >
                    <img src={d.url} alt={d.originalName} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded-xl px-2 py-1 text-[10px] font-black flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      Ver
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {files.length ? (
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Arquivos</p>
              <div className="mt-2 space-y-2">
                {files.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setOpen(d)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{d.originalName}</p>
                      <p className="text-[10px] font-bold text-slate-500">
                        {formatSize(d.size)} • {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{open.originalName}</p>
                  <p className="text-[10px] font-bold text-slate-500">{formatSize(open.size)}</p>
                </div>
                <button type="button" onClick={() => setOpen(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-700" aria-label="Fechar">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-slate-50">
                {open.mimeType.startsWith('image/') ? (
                  <div className="p-4">
                    <img src={open.url} alt={open.originalName} className="w-full max-h-[70vh] object-contain rounded-2xl bg-white border border-slate-200" />
                  </div>
                ) : (
                  <iframe title={open.originalName} src={open.url} className="w-full h-[75vh] bg-white" />
                )}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

