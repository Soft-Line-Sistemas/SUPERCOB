// Importa motion
import { motion } from "framer-motion"

export default function PremiumLine() {
  return (
    <div className="relative w-56 h-[4px] bg-blue-600/10 rounded-full overflow-hidden">

      {/* núcleo da luz (mais definido) */}
      <motion.div
        className="absolute h-full w-28 rounded-full
        bg-gradient-to-r from-transparent via-cyan-300 to-transparent
        opacity-90"
        
        initial={{ x: "-120%" }}
        animate={{ x: "220%" }}
        
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "linear"
        }}
      />

      {/* camada esfumaçada média */}
      <motion.div
        className="absolute h-full w-36 rounded-full
        bg-cyan-400/40 blur-xl"
        
        initial={{ x: "-120%" }}
        animate={{ x: "220%" }}
        
        transition={{
          repeat: 3,
          duration: 5,
          ease: "linear"
        }}
      />

      {/* difusão larga (fumaça real) */}
      <motion.div
        className="absolute h-full w-48 rounded-full
        bg-cyan-300/20 blur-2xl"
        
        initial={{ x: "-120%" }}
        animate={{ x: "220%" }}
        
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "linear"
        }}
      />

      {/* glow pulsante no container */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          opacity: [0.5, 0.9, 0.5]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }}
      />

    </div>
  )
}