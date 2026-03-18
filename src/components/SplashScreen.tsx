'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, Building2 } from 'lucide-react';

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 3500); // 3.5s display time

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-blue-600"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-8 w-24 h-24 flex items-center justify-center">
              {/* "Money Machine" effect */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: [ -50, 0, 50 ], opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="absolute text-green-300"
              >
                <Banknote size={48} />
              </motion.div>
              <div className="z-10 bg-white p-4 rounded-2xl shadow-xl">
                <Building2 size={40} className="text-blue-600" />
              </div>
            </div>

            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
              SUPERCOB
            </h1>
            <p className="text-blue-100 text-lg font-medium tracking-wide">
              A máquina de recuperar dinheiro
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
