
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, X, Sparkles, ArrowRight, FileText, Share2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NewFeatureModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenNewFeature = localStorage.getItem('hasSeenMaletinFeature');
    if (!hasSeenNewFeature) {
      const timer = setTimeout(() => setIsOpen(true), 1500); // Aparece un poco después de cargar
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenMaletinFeature', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden border border-white/20"
          >
            {/* Header / Accent */}
            <div className="h-32 bg-primary relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
              </div>
              <motion.div
                initial={{ rotate: -15, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/30"
              >
                <Briefcase className="w-10 h-10 text-white" />
              </motion.div>
              <button 
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 md:p-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Lanzamiento v3.0</span>
                </div>
              </div>

              <h2 className="text-3xl font-serif font-black tracking-tighter text-slate-900 mb-4 leading-none">
                Presentamos el <span className="text-primary italic font-normal">Maletín del Profe</span>
              </h2>
              
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Hemos diseñado una nueva experiencia para que la gestión de tus clases sea más fluida que nunca. Ahora todo tu material está en un solo lugar, seguro y siempre disponible.
              </p>

              <div className="space-y-6 mb-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Biblioteca Digital</h4>
                    <p className="text-xs text-slate-400 leading-snug">Sube PDFs, guías y recursos directamente desde tu panel.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Distribución Ágil</h4>
                    <p className="text-xs text-slate-400 leading-snug">Comparte material con tus alumnos de forma automática al asignar clases.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-1">Control de Acceso</h4>
                    <p className="text-xs text-slate-400 leading-snug">Solo tú y tus alumnos autorizados pueden acceder a los recursos.</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleClose}
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-primary text-white font-serif font-black text-lg transition-all shadow-xl group"
              >
                Explorar Ahora
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
