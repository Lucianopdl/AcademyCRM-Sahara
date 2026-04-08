"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  LayoutDashboard, 
  ClipboardCheck, 
  Wallet,
  Menu,
  Settings,
  CreditCard,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const mobileItems = [
  { name: "Inicio", href: "/", icon: LayoutDashboard },
  { name: "Alumnos", href: "/alumnos", icon: Users },
  { name: "Asistencias", href: "/asistencias", icon: ClipboardCheck },
  { name: "Finanzas", href: "/finanzas", icon: Wallet },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 bg-transparent pointer-events-none">
      <nav className="glass rounded-[32px] h-20 shadow-2xl flex items-center justify-around px-2 pointer-events-auto border-white/20">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href;
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
        <button className="relative flex flex-col items-center justify-center w-16 h-16 group tap-highlight-none text-secondary">
          <div className="p-2 rounded-2xl group-active:bg-primary/5 transition-colors">
            <Menu className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold mt-1 opacity-60">Más</span>
        </button>
      </nav>
      {/* Safe Area Spacer for iOS */}
      <div className="h-safe-bottom" />
    </div>
  );
}
