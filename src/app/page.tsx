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
  Sparkles,
  FileText,
  Award,
  ShieldCheck,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { NewFeatureModal } from "@/components/modals/NewFeatureModal";

export default function Dashboard() {
  const [academyInfo, setAcademyInfo] = useState({ name: 'Tu Academia', rubro: 'Gestión' });
  const [userFirstName, setUserFirstName] = useState("Director");
  const [stats, setStats] = useState({
    studentsCount: 0,
    classesCount: 0,
    paymentsTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [showNotificationDot, setShowNotificationDot] = useState(false); 


  const { academyId, userId, loading: contextLoading } = useAcademy();

  useEffect(() => {
    const seen = localStorage.getItem('hasSeenMaletinFeature');
    setShowNotificationDot(seen !== 'true');

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
      <div className="p-4 md:p-6 lg:px-10 lg:py-6 flex flex-col min-h-screen lg:h-screen lg:max-h-screen gap-4 md:gap-6 relative overflow-hidden bg-background">
        {/* Decorative Background Elements */}
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header Section - Sahara Audit Style - More Compact */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 relative z-20"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Inteligencia de Gestión</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tighter text-foreground leading-[1.1]">
              ¡Hola, <span className="text-primary italic font-normal">{userFirstName}</span>!
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 ml-1">Dashboard v3.0 • Sahara Audit</p>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
             <div className="relative group hidden md:block">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-primary transition-all" />
                <input 
                 placeholder="Explorar..." 
                 className="bg-card/50 border border-border/40 rounded-2xl pl-12 pr-6 py-3 h-12 text-[10px] font-medium focus:ring-4 focus:ring-primary/5 w-56 shadow-sm outline-none transition-all"
               />
             </div>
             <div className="flex items-center gap-3 ml-auto md:ml-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    localStorage.setItem('hasSeenMaletinFeature', 'true');
                    setShowNotificationDot(false);
                  }}
                  className="rounded-full h-12 w-12 bg-card border-border/40 text-muted-foreground hover:bg-white hover:text-primary transition-all shadow-sm relative group"
                >
                  <Bell className="w-4 h-4 transition-transform group-hover:rotate-12" />
                  {showNotificationDot && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-background animate-pulse" />
                  )}
                </Button>
             </div>
          </div>
        </motion.header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col gap-6 overflow-y-auto lg:overflow-hidden scrollbar-none pr-1"
        >
          {/* Metrics Intelligence Palette - More Compact Padding */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shrink-0">
            {[
              { label: "Comunidad", value: stats.studentsCount, icon: Users, accent: "primary" },
              { label: "Recaudación", value: `$${stats.paymentsTotal.toLocaleString()}`, icon: TrendingUp, accent: "emerald" },
              { label: "Carga Académica", value: stats.classesCount, icon: FileText, accent: "slate" }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-[32px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] flex items-center gap-6 group transition-all duration-700 active:scale-[0.98]"
              >
                <div className={cn(
                   "w-12 h-12 rounded-xl shadow-2xl flex items-center justify-center text-white transition-all duration-700 group-hover:rotate-6",
                   stat.accent === 'primary' ? 'bg-primary shadow-primary/20' : 
                   stat.accent === 'emerald' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-900 shadow-slate-200'
                )}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-1 truncate">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    {loading ? (
                      <div className="h-6 w-20 bg-muted animate-pulse rounded-lg" />
                    ) : (
                      <h3 className="text-2xl md:text-3xl font-serif font-black tracking-tighter text-foreground truncate">{stat.value}</h3>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </section>

          {/* Core Content Grid - Balanced heights */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-20 lg:pb-0 overflow-visible">
            
            {/* Editorial Brand Banner - Scaled Down */}
            <motion.div 
                variants={itemVariants}
                className="lg:col-span-12 xl:col-span-8 relative bg-slate-900 p-8 md:p-10 rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col justify-center min-h-[240px] lg:min-h-0 group border border-white/5"
            >
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
                   <Award className="w-64 h-64 rotate-12" />
                </div>
                
                <div className="relative z-10 max-w-xl">
                  <div className="bg-primary px-3 py-1 rounded-lg w-fit text-primary-foreground text-[8px] font-black uppercase tracking-[0.4em] mb-4 shadow-lg">
                    Propiedad Intelectual: {academyInfo.name}
                  </div>
                  <h3 className="text-3xl md:text-5xl font-serif font-black text-white mb-4 tracking-tighter leading-[0.95]">
                    Gestión <span className="text-primary italic font-normal">Auditiva</span> de Alto Desempeño.
                  </h3>
                  <p className="text-white/40 text-[10px] md:text-xs font-medium leading-relaxed mb-6 uppercase tracking-[0.2em] max-w-md">
                    Excelencia operativa para instituciones que transforman el talento en arte.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => window.location.href='/clases'} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-serif font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      Explorar Clases
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => window.location.href='/alumnos'} 
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                    >
                      Censo de Alumnos
                    </button>
                  </div>
                </div>
            </motion.div>

            {/* Tactical Fast Lanes */}
            <div className="lg:col-span-12 xl:col-span-4 flex flex-col sm:grid sm:grid-cols-2 xl:flex xl:flex-col gap-4 md:gap-6">
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => window.location.href='/pagos'}
                  className="flex-1 bg-card/60 backdrop-blur-xl border border-primary/20 p-6 rounded-[32px] flex flex-col justify-between cursor-pointer group shadow-lg active:scale-[0.98] transition-all min-h-[140px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif font-black mb-1 tracking-tighter">Registrar <span className="text-primary italic font-normal">Cobro</span></h4>
                    <p className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-[0.4em]">Tesorería</p>
                  </div>
                </motion.div>

                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => window.location.href='/alumnos/nuevo'}
                  className="flex-1 bg-muted/20 border border-border/50 p-6 rounded-[32px] flex flex-col justify-between cursor-pointer group shadow-inner active:scale-[0.98] transition-all min-h-[140px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif font-black text-foreground mb-1 tracking-tighter">Nueva <span className="text-slate-400 italic font-normal">Inscripción</span></h4>
                    <p className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-[0.4em]">Censo</p>
                  </div>
                </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Audit Certification Footer */}
        <footer className="mt-auto py-6 flex items-center justify-between border-t border-border/10 shrink-0 relative z-10 px-4">
            <div className="flex items-center gap-3">
               <ShieldCheck className="w-3.5 h-3.5 text-primary/40" />
               <p className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                 Sahara Security System • {academyInfo.name}
               </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
               <p className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground/20 italic">
                  Digitalizado por Sistemas Norte
               </p>
            </div>
        </footer>
        <NewFeatureModal />
      </div>

    </DashboardShell>
  );
}
