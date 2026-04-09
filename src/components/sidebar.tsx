"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  LayoutDashboard, 
  GraduationCap, 
  CreditCard, 
  Settings, 
  School,
  Moon,
  Sun,
  ClipboardCheck,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Alumnos", href: "/alumnos", icon: Users },
  { name: "Clases y Talleres", href: "/clases", icon: GraduationCap },
  { name: "Cuotas y Pagos", href: "/pagos", icon: CreditCard },
  { name: "Asistencias", href: "/asistencias", icon: ClipboardCheck },
  { name: "Gastos y Finanzas", href: "/finanzas", icon: Wallet },
  { name: "Configuración", href: "/config", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [academyName, setAcademyName] = useState("Sahara");
  const [rubro, setRubro] = useState("Academy Manager");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || null);
    }
    getUser();

    async function fetchSettings() {
      const { data, error } = await supabase
        .from('settings')
        .select('academy_name, category, logo_url')
        .single();
      if (data && !error) {
        setAcademyName(data.academy_name || "Sahara");
        setRubro(data.category || "Academy Manager");
        setLogoUrl(data.logo_url);
      }
    }
    fetchSettings();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <aside className="hidden lg:flex w-72 bg-card border-r border-border h-screen flex-col sticky top-0 shadow-sm">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-warm overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={academyName} className="w-full h-full object-cover" />
            ) : (
              <School className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xl font-serif font-bold text-foreground leading-none truncate whitespace-nowrap" title={academyName}>
              {academyName}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-secondary/70 font-semibold mt-1 truncate">
              {rubro}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 mt-6 space-y-1">
        <p className="px-4 text-[11px] font-bold text-secondary/50 uppercase tracking-widest mb-4">Principal</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300",
                isActive 
                  ? "bg-primary/5 text-primary" 
                  : "text-secondary hover:bg-primary/5 hover:text-primary"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-secondary group-hover:text-primary")} />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-secondary hover:bg-primary/5 hover:text-primary transition-all duration-300 mb-2 group"
        >
          {isDarkMode ? <Sun className="w-5 h-5 transition-transform" /> : <Moon className="w-5 h-5 transition-transform" />}
          <span className="font-medium text-sm">Cambiar Tema</span>
        </button>

        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="w-full"
        >
          <div className="sahara-card p-4 flex items-center gap-3 bg-background group cursor-pointer hover:border-red-500/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
              {userEmail ? userEmail.charAt(0) : 'U'}
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <p className="text-[10px] font-bold text-foreground truncate" title={userEmail || ''}>{userEmail || 'Usuario'}</p>
              <p className="text-[10px] text-secondary truncate">Cerrar Sesión</p>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
