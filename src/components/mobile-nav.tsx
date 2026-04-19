"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Users, 
  LayoutDashboard, 
  ClipboardCheck, 
  Wallet,
  Menu,
  Settings,
  CreditCard,
  GraduationCap,
  LogOut,
  X,
  Bell,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

const mobileItems = [
  { name: "Inicio", href: "/", icon: LayoutDashboard },
  { name: "Alumnos", href: "/alumnos", icon: Users },
  { name: "Asistencias", href: "/asistencias", icon: ClipboardCheck },
  { name: "Finanzas", href: "/finanzas", icon: Wallet },
];

const extraItems = [
  { name: "Clases y Talleres", href: "/clases", icon: GraduationCap },
  { name: "Cuotas y Pagos", href: "/pagos", icon: CreditCard },
  { name: "Notificaciones", href: "#", icon: Bell, disabled: true },
  { name: "Maletín del Profe", href: "/maletin", icon: Briefcase },
  { name: "Configuración", href: "/config", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasSeenFeature, setHasSeenFeature] = useState(true);

  React.useEffect(() => {
    const seen = localStorage.getItem('hasSeenMaletinFeature');
    setHasSeenFeature(seen === 'true');

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || null);
    }
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 bg-transparent pointer-events-none">
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto z-[-1]"
            />
            
            {/* Menu Drawer */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-24 left-4 right-4 bg-card glass border border-white/20 rounded-[32px] p-6 shadow-2xl pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-serif font-bold text-foreground">Menu Principal</h3>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-primary/5 rounded-full transition-colors text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {extraItems.map((item) => {
                  const isMaletin = item.href === "/maletin";
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => {
                        if (!item.disabled) {
                          if (isMaletin) {
                            localStorage.setItem('hasSeenMaletinFeature', 'true');
                            setHasSeenFeature(true);
                          }
                          setIsMenuOpen(false);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 border border-transparent relative",
                        pathname === item.href 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-background/50 text-secondary hover:bg-primary/5"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-semibold">{item.name}</span>
                      {isMaletin && !hasSeenFeature && (
                        <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                      )}
                    </Link>
                  );
                })}

                {/* SUPER ADMIN MOBILE LINK */}
                {userEmail === 'lucianopdl2401@gmail.com' && (
                  <Link
                    href="/admin/onboarding"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "col-span-2 flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold border",
                      pathname === "/admin/onboarding"
                        ? "bg-[#E67E22]/20 text-[#E67E22] border-[#E67E22]/30"
                        : "bg-[#E67E22]/5 text-[#E67E22] border-[#E67E22]/10"
                    )}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Panel Super Admin
                  </Link>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-bold border border-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="glass rounded-[32px] h-20 shadow-2xl flex items-center justify-around px-2 pointer-events-auto border-white/20">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href && !isMenuOpen;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-16 h-16 group tap-highlight-none"
            >
              <motion.div
                initial={false}
                animate={{
                  y: isActive ? -4 : 0,
                  scale: isActive ? 1.1 : 1,
                }}
                className={cn(
                  "p-2 rounded-2xl transition-colors duration-300",
                  isActive ? "text-primary bg-primary/10 shadow-sm" : "text-secondary"
                )}
              >
                <item.icon className="w-6 h-6" />
              </motion.div>
              <span className={cn(
                "text-[10px] font-bold mt-1 transition-all duration-300",
                isActive ? "text-primary opacity-100" : "text-secondary opacity-60"
              )}>
                {item.name}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabMobile"
                  className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
        
        {/* Botón de Menú/Más */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "relative flex flex-col items-center justify-center w-16 h-16 group tap-highlight-none transition-colors duration-300",
            isMenuOpen ? "text-primary" : "text-secondary"
          )}
        >
          <div className={cn(
            "p-2 rounded-2xl transition-colors duration-300",
            isMenuOpen ? "bg-primary/10" : "group-active:bg-primary/5"
          )}>
            <Menu className="w-6 h-6" />
          </div>
          <span className={cn(
            "text-[10px] font-bold mt-1 transition-opacity",
            isMenuOpen ? "opacity-100" : "opacity-60"
          )}>
            Más
          </span>
        </button>
      </nav>
      {/* Safe Area Spacer for iOS */}
      <div className="h-safe-bottom" />
    </div>
  );
}

