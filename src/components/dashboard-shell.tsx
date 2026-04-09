"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { MobileHeader } from "./mobile-header";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Lock, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { checkAcademyStatusAction } from "@/app/admin/onboarding/actions";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [isSuspended, setIsSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAcademyStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // El Super Admin nunca es bloqueado
      if (user?.email === 'lucianopdl2401@gmail.com') {
        setLoading(false);
        return;
      }

      if (user?.user_metadata?.academy_id) {
        // Le preguntamos al SERVER, que tiene la llave maestra
        const academyStatus = await checkAcademyStatusAction(user.user_metadata.academy_id);
        
        if (academyStatus === 'suspended') {
          setIsSuspended(true);
        }
      }
      setLoading(false);
    }
    checkAcademyStatus();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin"></div></div>;

  if (isSuspended) {
    return (
      <div className="h-screen w-full bg-[#111] flex items-center justify-center p-6 text-white overflow-hidden">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-serif font-black tracking-tight">Servicio Suspendido</h1>
            <p className="text-white/60 font-medium leading-relaxed">
              Detectamos un inconveniente con el estado de tu suscripción a <span className="text-white font-bold">Sahara CRM</span>.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-[32px] space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-[#E67E22]">¿Qué significa esto?</p>
            <p className="text-sm text-white/40">Tu acceso y el de tus alumnos ha sido pausado temporalmente. Contactate con el Administrador Central para regularizar tu situación.</p>
          </div>

          <Button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black text-sm flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> VOLVER AL INICIO
          </Button>
          
          <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">Powered by Norte Sistemas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row bg-background min-h-screen text-foreground overflow-x-hidden font-sans">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Top Header */}
      <MobileHeader />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative pb-[var(--mobile-nav-height)] lg:pb-0 min-w-0 h-screen lg:h-auto overflow-y-auto lg:overflow-visible no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <MobileNav />
    </div>
  );
}
