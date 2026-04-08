"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
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

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setUserFirstName(user.user_metadata.full_name.split(' ')[0]);
      } else if (user?.email) {
        setUserFirstName(user.email.split('@')[0]);
      }

      const { data: settings } = await supabase
        .from('settings')
        .select('academy_name, category')
        .maybeSingle();
      
      if (settings) {
        setAcademyInfo({ name: settings.academy_name, rubro: settings.category });
      }

      const [studentsRes, classesRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount'),
      ]);

      setStats({
        studentsCount: studentsRes.count || 0,
        classesCount: classesRes.count || 0,
        paymentsTotal: paymentsRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
      });
      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 120, damping: 20 } }
  };

  return (
    <div className="flex bg-[#FDFCFB] h-screen text-[#2D241E] overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 flex flex-col h-full overflow-hidden">
        
        {/* Header Compacto */}
        <motion.header 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-6 shrink-0"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#E67E22] font-bold text-[9px] uppercase tracking-[0.2em] bg-[#E67E22]/10 px-2 py-0.5 rounded-full border border-[#E67E22]/5">
                <Sparkles className="w-2.5 h-2.5 inline mr-1" /> General
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">
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

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col gap-6 overflow-hidden"
        >
          {/* Stats Row - Compacta */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            {[
              { label: "Estudiantes", value: stats.studentsCount, icon: Users, color: "bg-[#E67E22]", accent: "text-[#E67E22]" },
              { label: "Ingresos", value: `$${stats.paymentsTotal.toLocaleString()}`, icon: TrendingUp, color: "bg-[#27AE60]", accent: "text-[#27AE60]" },
              { label: "Clases", value: stats.classesCount, icon: GraduationCap, color: "bg-[#2D241E]", accent: "text-[#2D241E]" }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                whileHover={{ y: -3 }}
                className="bg-[#F5F1EE] border border-[#847365]/5 p-5 rounded-[24px] shadow-sm flex items-center gap-5 group"
              >
                <div className={cn("p-3.5 rounded-xl shadow-md text-white transition-transform group-hover:scale-105", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#847365]/60 mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    {loading ? (
                      <div className="h-6 w-12 bg-black/5 animate-pulse rounded" />
                    ) : (
                      <h3 className="text-2xl font-serif font-bold tracking-tighter">{stat.value}</h3>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#847365]/20 group-hover:text-primary transition-colors" />
              </motion.div>
            ))}
          </section>

          {/* Body Content - Todo en una pantalla */}
          <div className="flex-1 grid md:grid-cols-12 gap-6 overflow-hidden pb-4">
            
            {/* Banner Principal - Ajustado al alto */}
            <motion.div 
                variants={itemVariants}
                className="md:col-span-8 relative bg-gradient-to-br from-[#D35400] to-[#E67E22] p-8 rounded-[32px] shadow-lg shadow-[#E67E22]/10 overflow-hidden flex flex-col justify-center min-h-[300px]"
            >
                <School className="absolute bottom-[-15%] right-[-5%] w-48 h-48 opacity-20 rotate-12" />
                
                <div className="relative z-10">
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full w-fit text-white text-[8px] font-bold uppercase tracking-widest mb-4 border border-white/20">
                    Sistemas Norte
                  </div>
                  <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 tracking-tight max-w-md leading-tight">
                    Gestión Académica de Vanguardia.
                  </h3>
                  <p className="text-white/80 text-sm max-w-sm font-medium leading-relaxed mb-8 opacity-90">
                    Administra tus clases y cobros con la elegancia que tu academia merece.
                  </p>
                  <Button 
                    onClick={() => window.location.href='/clases'} 
                    className="bg-white text-[#D35400] hover:bg-neutral-50 px-6 h-12 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all"
                  >
                    Ver Clases
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
            </motion.div>

            {/* Quick Actions Vertical */}
            <div className="md:col-span-4 flex flex-col gap-6">
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ x: 5 }}
                  onClick={() => window.location.href='/pagos'}
                  className="flex-1 bg-[#2D241E] text-white p-6 rounded-[28px] flex flex-col justify-between cursor-pointer group shadow-lg shadow-black/10"
                >
                  <DollarSign className="w-6 h-6 text-[#E67E22]" />
                  <div>
                    <h4 className="text-lg font-serif font-bold mb-1">Registrar Cobro</h4>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest font-sans">Finanzas</p>
                  </div>
                </motion.div>

                <motion.div 
                  variants={itemVariants}
                  whileHover={{ x: 5 }}
                  onClick={() => window.location.href='/alumnos/nuevo'}
                  className="flex-1 bg-[#F5F1EE] border border-[#847365]/10 p-6 rounded-[28px] flex flex-col justify-between cursor-pointer group shadow-sm hover:border-[#E67E22]/30 transition-all"
                >
                  <Plus className="w-6 h-6 text-[#E67E22]" />
                  <div>
                    <h4 className="text-lg font-serif font-bold text-[#2D241E] mb-1">Nuevo Alumno</h4>
                    <p className="text-[9px] text-[#847365]/50 font-bold uppercase tracking-widest font-sans">Inscripción</p>
                  </div>
                </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Footer Minimal - Sin scroll */}
        <footer className="mt-auto py-4 text-center shrink-0 border-t border-[#847365]/5">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#847365]/30">
               © 2026 {academyInfo.name} • El arte de gestionar
            </p>
        </footer>

      </main>
    </div>
  );
}
