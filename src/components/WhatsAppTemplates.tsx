'use client'

import React, { useState } from 'react'
import { MessageCircle, Send, Copy, Check, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface WhatsAppTemplatesProps {
  clienteNome: string
  valorPendente: string
  vencimento: string
  contratoId: string
  whatsapp: string
}

export function WhatsAppTemplates({ clienteNome, valorPendente, vencimento, contratoId, whatsapp }: WhatsAppTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const templates = [
    {
      id: 1,
      title: 'Lembrete Amigável',
      desc: 'Para vencimentos recentes ou próximos.',
      text: `Olá ${clienteNome}! 👋 Passando para lembrar que o juros do seu contrato ${contratoId} vence no dia ${vencimento}. O valor é de ${valorPendente}. Caso já tenha pago, por favor desconsidere.`
    },
    {
      id: 2,
      title: 'Cobrança em Atraso',
      desc: 'Para quando o pagamento já venceu.',
      text: `Oi ${clienteNome}, tudo bem? Notamos que o pagamento de ${valorPendente} do contrato ${contratoId} ainda não consta em nosso sistema. Precisamos regularizar isso hoje para evitar novos juros acumulados. Como podemos ajudar?`
    },
    {
      id: 3,
      title: 'Acordo de Renegociação',
      desc: 'Formalização de acordo feito.',
      text: `Olá ${clienteNome}! Conforme conversamos, estamos formalizando o acordo para o contrato ${contratoId}. Valor atualizado: ${valorPendente}. Aguardamos o comprovante para atualizar seu status no sistema.`
    }
  ]

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast.success('Mensagem copiada!')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSend = (text: string) => {
    const encoded = encodeURIComponent(text)
    const cleanPhone = whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-2xl text-xs font-black hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
      >
        <MessageCircle className="w-4 h-4" />
        Templates de Cobrança
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[70] min-w-[300px]"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black text-slate-900">Escolha um Template</p>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              <div className="space-y-4">
                {templates.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-100 hover:border-emerald-200 transition-colors group">
                    <p className="text-xs font-black text-slate-900">{t.title}</p>
                    <p className="text-[10px] text-slate-500 mb-3">{t.desc}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(t.text, t.id)}
                        className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 flex items-center justify-center gap-1 hover:bg-slate-950"
                      >
                        {copied === t.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        Copiar
                      </button>
                      <button
                        onClick={() => handleSend(t.text)}
                        className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-1 hover:bg-emerald-600"
                      >
                        <Send className="w-3 h-3" />
                        Enviar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
