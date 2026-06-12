'use client'

import React, { useEffect, useState } from 'react'
import { FileIcon, ImageIcon, VideoIcon, FileTextIcon, Download, Trash2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { isAdminRole } from '@/lib/admin-auth'

interface Documento {
  id: string
  nome: string
  tipo: string
  url: string
  tamanho: number
  createdAt: Date
}

interface DocumentsTabProps {
  clienteId: string
  emprestimoId: string
  loanFiles: (string | null | undefined)[]
}

export function DocumentsTab({ clienteId, emprestimoId, loanFiles }: DocumentsTabProps) {
  const { data: session } = useSession()
  const isAdmin = isAdminRole(session?.user?.role)
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const loadDocs = async () => {
    try {
      const res = await fetch(`/api/clientes/${clienteId}/documentos`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data)
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [clienteId])

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
        if (!res.ok) throw new Error('Falha no upload')
        toast.success(`Arquivo ${files[i].name} enviado.`)
      } catch (error) {
        toast.error(`Erro ao enviar ${files[i].name}`)
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

  const getFileIcon = (tipo: string) => {
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie documentos, fotos e comprovantes deste dossiê.</p>
        </div>
        
        <label className="cursor-pointer group">
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
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
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate mb-1">Anexo Contrato #{idx + 1}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arquivo do Contrato</p>
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
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400" title="Download">
                  <Download className="w-4 h-4" />
                </a>
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
              <p className="text-[10px] font-bold text-slate-400">
                {(doc.tamanho / 1024).toFixed(0)} KB
              </p>
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
