'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { FileIcon, ImageIcon, VideoIcon, FileTextIcon, Download, Trash2, Plus, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { isAdminRole } from '@/lib/admin-auth'

interface Documento {
  id: string
  nome: string
  tipo?: string | null
  url: string
  tamanho: number
  createdAt: Date
}

interface DocumentoApiResponse {
  id: string
  nome?: string | null
  originalName?: string | null
  tipo?: string | null
  mimeType?: string | null
  url: string
  tamanho?: number | null
  size?: number | null
  createdAt: Date | string
}

interface DocumentsTabProps {
  clienteId: string
  emprestimoId: string
  loanFiles: (string | null | undefined)[]
}

const ACCEPTED_UPLOAD_TYPES = '.jpg,.jpeg,.png,.pdf,.mp4,.webm,.mov'
const MAX_UPLOAD_SIZE_LABEL = '50 MB por arquivo'

export function DocumentsTab({ clienteId, loanFiles }: DocumentsTabProps) {
  const { data: session } = useSession()
  const isAdmin = isAdminRole(session?.user?.role)
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/clientes/${clienteId}/documentos`)
      if (res.ok) {
        const data = await res.json()
        const normalizedDocs = (Array.isArray(data) ? data : []).map((doc: DocumentoApiResponse) => ({
          id: doc.id,
          nome: doc.nome || doc.originalName || 'Documento sem nome',
          tipo: doc.tipo || doc.mimeType || null,
          url: doc.url,
          tamanho: Number(doc.tamanho ?? doc.size ?? 0),
          createdAt: new Date(doc.createdAt),
        }))
        setDocs(normalizedDocs)
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i])
      try {
        const res = await fetch(`/api/clientes/${clienteId}/documentos`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error || 'Falha no upload')
        }
        toast.success(`Arquivo ${files[i].name} enviado.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Erro ao enviar ${files[i].name}`)
      } finally {
        formData.delete('file')
      }
    }
    
    setUploading(false)
    loadDocs()
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Deseja excluir este documento?')) return
    try {
      const res = await fetch(`/api/clientes/${clienteId}/documentos/${docId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== docId))
        toast.success('Documento removido.')
      }
    } catch (error) {
      toast.error('Erro ao excluir documento.')
    }
  }

  const openPreview = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const triggerBrowserDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleDownload = async (url: string, filename: string, docKey: string) => {
    try {
      setDownloadingId(docKey)
      const res = await fetch(url.includes('?') ? `${url}&download=1` : `${url}?download=1`)
      if (!res.ok) throw new Error('Falha ao baixar arquivo')

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      triggerBrowserDownload(objectUrl, filename)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      toast.error('Não foi possível baixar o arquivo.')
    } finally {
      setDownloadingId((current) => (current === docKey ? null : current))
    }
  }

  const isPreviewable = (tipo?: string | null) =>
    Boolean(tipo && (tipo.startsWith('image/') || tipo.startsWith('video/') || tipo === 'application/pdf'))

  const getFileIcon = (tipo?: string | null) => {
    if (!tipo) return <FileIcon className="w-5 h-5 text-slate-500" />
    if (tipo.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />
    if (tipo.startsWith('video/')) return <VideoIcon className="w-5 h-5 text-purple-500" />
    if (tipo === 'application/pdf') return <FileTextIcon className="w-5 h-5 text-red-500" />
    return <FileIcon className="w-5 h-5 text-slate-500" />
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Acervo Digital</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visualize e baixe documentos, fotos, v&iacute;deos e comprovantes deste dossiê sem sair da análise.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Formatos aceitos: JPG, PNG, PDF, MP4, WebM e MOV. Limite: {MAX_UPLOAD_SIZE_LABEL}.
          </p>
        </div>
        
        <label className="cursor-pointer group">
          <input
            type="file"
            multiple
            accept={ACCEPTED_UPLOAD_TYPES}
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-gold-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-gold-700 transition-all shadow-lg shadow-slate-900/10 dark:shadow-gold-600/20 active:scale-95">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploading ? 'Enviando...' : 'Anexar Arquivos'}
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Loan specific files (Legacyarquivo1..5) */}
        {loanFiles.map((url, idx) => {
          if (!url) return null
          return (
            <div key={`loan-file-${idx}`} className="group relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-gold-500/50 transition-all hover:shadow-xl dark:hover:shadow-gold-900/10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
                  {getFileIcon('application/octet-stream')}
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openPreview(url)}
                    className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400"
                    title="Visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerBrowserDownload(url, `anexo-contrato-${idx + 1}`)}
                    className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400"
                    title="Baixar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate mb-1">Anexo Contrato #{idx + 1}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visualizar ou Baixar</p>
            </div>
          )
        })}

        {/* Client documents */}
        {docs.map((doc) => (
          <div key={doc.id} className="group relative p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-gold-500/50 transition-all hover:shadow-xl dark:hover:shadow-gold-900/10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
                {getFileIcon(doc.tipo)}
              </div>
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {isPreviewable(doc.tipo) ? (
                  <button
                    type="button"
                    onClick={() => openPreview(doc.url)}
                    className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400"
                    title="Visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDownload(doc.url, doc.nome, doc.id)}
                  className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400 disabled:opacity-60"
                  title="Baixar"
                  disabled={downloadingId === doc.id}
                >
                  {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(doc.id)} className="p-2 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate mb-1" title={doc.nome}>{doc.nome}</p>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-[10px] font-bold text-slate-400">{doc.tamanho >= 1024 ? `${(doc.tamanho / 1024).toFixed(0)} KB` : `${doc.tamanho} B`}</p>
            </div>
          </div>
        ))}

        {!loading && docs.length === 0 && loanFiles.every(f => !f) && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] opacity-40">
            <FileIcon className="w-12 h-12 mb-4 text-slate-300" />
            <p className="font-black text-sm uppercase tracking-widest">Nenhum documento anexado</p>
          </div>
        )}

        {loading && (
          <div className="col-span-full py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
          </div>
        )}
      </div>
    </div>
  )
}
