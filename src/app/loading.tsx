'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Banknote, Building2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div className="relative mb-4 w-20 h-20 flex items-center justify-center">
          {/* Money counting animation */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: [ -30, 0, 30 ], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="absolute text-green-500"
          >
            <Banknote size={32} />
          </motion.div>
          <div className="z-10 bg-white p-3 rounded-xl shadow-md border border-gray-100">
            <Building2 size={32} className="text-blue-600" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Carregando dados...</p>
      </div>
    </div>
  );
}
