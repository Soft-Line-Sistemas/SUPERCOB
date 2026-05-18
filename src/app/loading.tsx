'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Banknote } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute right-4 top-4 flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg px-4 py-3">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <motion.div
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: [-14, 0, 14], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="absolute text-green-500"
          >
            <Banknote size={18} />
          </motion.div>
          <div className="relative z-10 bg-white w-8 h-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <Image src="/logo/logo.jpeg" alt="Logo" fill sizes="32px" className="object-cover" />
          </div>
        </div>
        <p className="text-xs font-bold text-gray-500 animate-pulse">Carregando...</p>
      </div>
    </div>
  );
}
