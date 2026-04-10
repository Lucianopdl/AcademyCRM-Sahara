"use client";

import React, { useEffect, useState } from "react";
import { useAcademy } from "@/hooks/use-academy";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  School, 
  Bell,
  Search,
  Plus,
  Loader2,
  DollarSign,
  GraduationCap,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [academyInfo, setAcademyInfo] = useState({ name: 'Tu Academia', rubro: 'Gestión' });
  const [userFirstName, setUserFirstName] = useState("Director");
  const [stats, setStats] = useState({
    studentsCount: 0,
    classesCount: 0,
    paymentsTotal: 0
  });
  const [loading, setLoading] = useState(true);

  const { academyId, userId, loading: contextLoading } = useAcademy();

  useEffect(() => {
    async function fetchDashboardData() {
      if (!academyId || contextLoading) return;
      setLoading(true);
      
      // Attempt to get user name from hook context or auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.user_metadata?.full_name) {
          setUserFirstName(user.user_metadata.full_name.split(' ')[0]);
        } else if (user.email) {
          setUserFirstName(user.email.split('@')[0]);
        }
      }

      // Fetch filtered data
      const [settingsRes, studentsRes, classesRes, paymentsRes] = await Promise.all([
        supabase.from('settings').select('academy_name, category').eq('academy_id', academyId).maybeSingle(),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
        supabase.from('payments').select('amount').eq('academy_id', academyId),
      ]);

      if (settingsRes.data) {
        setAcademyInfo({ 
          name: settingsRes.data.academy_name, 
          rubro: settingsRes.data.category 
        });
      }

      setStats({
        studentsCount: studentsRes.count || 0,
        classesCount: classesRes.count || 0,
        paymentsTotal: paymentsRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
      });
      setLoading(false);
    }
    fetchDashboardData();
  }, [academyId, contextLoading]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 120, damping: 20 } }
  };

  return (
    <DashboardShell>
      <div className="p-4 lg:p-8 flex flex-col h-full gap-6 lg:gap-8">
        
        {/* Header Compacto (Desktop: Visible, Mobile: Oculto porque MobileHeader lo maneja) */}
        <motion.header 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="hidden lg:flex items-center justify-between mb-2 shrink-0"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#E67E22] font-bold text-[9px] uppercase tracking-[0.2em] bg-[#E67E22]/10 px-2 py-0.5 rounded-full border border-[#E67E22]/5">
                <Sparkles className="w-2.5 h-2.5 inline mr-1" /> General
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
              ¡Hola, <span className="text-[#E67E22]">{userFirstName}</span>!
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative hidden md:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#847365]/50" />
               <input 
                placeholder="Buscar..." 
                className="bg-[#F5F1EE] border-none rounded-xl pl-9 pr-4 py-2 h-10 text-xs focus:ring-1 focus:ring-[#E67E22]/30 w-48 transition-all"
              />
             </div>
             <Button className="rounded-xl h-10 w-10 bg-[#F5F1EE] text-[#847365] hover:bg-white hover:shadow-sm border-none">
                <Bell className="w-4 h-4" />
             </Button>
          </div>
        </motion.header>

        {/* Bienvenida Táctil (Móvil) */}
        <div className="lg:hidden mb-2">
           <h2 className="text-2xl font-serif font-bold text-foreground">
             ¡Hola, <span className="text-[#E67E22] font-black">{userFirstName}</span>! 👋
           </h2>
           <p className="text-xs text-secondary/60 font-bold uppercase tracking-widest mt-1">Dashboard Principal</p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col gap-6"
        >
          {/* Stats Row - Adaptable */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shrink-0">
            {[
              { label: "Estudiantes", value: stats.studentsCount, icon: Users, color: "bg-[#E67E22]", accent: "text-[#E67E22]" },
              { label: "Ingresos", value: `$${stats.paymentsTotal.toLocaleString()}`, icon: TrendingUp, color: "bg-[#27AE60]", accent: "text-[#27AE60]" },
              { label: "Clases", value: stats.classesCount, icon: GraduationCap, color: "bg-[#2D241E]", accent: "text-[#2D241E]" }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                whileHover={{ y: -3 }}
                className="bg-card border border-border/50 p-5 rounded-[28px] shadow-sm flex items-center gap-5 group active:scale-[0.98] transition-all"
              >
                <div className={cn("p-4 rounded-2xl shadow-md text-white transition-transform group-hover:scale-105", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50 mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    {loading ? (
                      <div className="h-6 w-12 bg-black/5 animate-pulse rounded" />
                    ) : (
                      <h3 className="text-3xl font-serif font-bold tracking-tighter text-foreground">{stat.value}</h3>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </section>

          {/* Body Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 lg:pb-0">
            
            {/* Banner Principal */}
            <motion.div 
                variants={itemVariants}
                className="lg:col-span-8 relative bg-gradient-to-br from-[#D35400] to-[#E67E22] p-8 lg:p-12 rounded-[40px] shadow-xl shadow-[#E67E22]/10 overflow-hidden flex flex-col justify-center min-h-[350px] lg:min-h-0"
            >
                <School className="absolute bottom-[-10%] right-[-5%] w-64 h-64 opacity-20 rotate-12" />
                
                <div className="relative z-10">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full w-fit text-white text-[9px] font-black uppercase tracking-[0.2em] mb-6 border border-white/20">
                    Sistemas Norte
                  </div>
                  <h3 className="text-4xl lg:text-5xl font-serif font-bold text-white mb-4 tracking-tight max-w-md leading-[1.1]">
                    Gestión Académica de Vanguardia.
                  </h3>
                  <p className="text-white/80 text-base max-w-sm font-medium leading-relaxed mb-10 opacity-90">
                    Administra tus clases y cobros con la elegancia que tu academia merece.
                  </p>
                  <Button 
                    onClick={() => window.location.href='/clases'} 
                    className="bg-white text-[#D35400] hover:bg-neutral-50 px-8 h-14 rounded-2xl font-black text-base shadow-2xl active:scale-95 transition-all w-full md:w-fit"
                  >
                    Ver Clases
                    <ArrowUpRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6">
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ x: 5 }}
                  onClick={() => window.location.href='/pagos'}
                  className="flex-1 bg-[#2D241E] text-white p-7 rounded-[32px] flex flex-col justify-between cursor-pointer group shadow-lg shadow-black/10 active:scale-[0.98] transition-all min-h-[160px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#E67E22]">
                    <DollarSign className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif font-bold mb-1">Registrar Cobro</h4>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest font-sans">Administración de Pagos</p>
                  </div>
                </motion.div>

                <motion.div 
                  variants={itemVariants}
                  whileHover={{ x: 5 }}
                  onClick={() => window.location.href='/alumnos/nuevo'}
                  className="flex-1 bg-card border border-border/50 p-7 rounded-[32px] flex flex-col justify-between cursor-pointer group shadow-sm hover:border-[#E67E22]/30 active:scale-[0.98] transition-all min-h-[160px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#E67E22]/10 flex items-center justify-center text-[#E67E22]">
                    <Plus className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif font-bold text-foreground mb-1 text-[#2D241E]">Nuevo Alumno</h4>
                    <p className="text-[10px] text-secondary/40 font-black uppercase tracking-widest font-sans">Inscripción rápida</p>
                  </div>
                </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Footer Minimal */}
        <footer className="mt-auto py-6 text-center shrink-0 border-t border-border/10 hidden lg:block">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary/30">
               © 2026 {academyInfo.name} • El arte de gestionar
            </p>
        </footer>
      </div>
    </DashboardShell>
  );
}
