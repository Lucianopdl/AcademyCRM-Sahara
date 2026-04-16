"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarCheck, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Inicio",
      icon: Home,
      href: "/",
    },
    {
      label: "Alumnos",
      icon: Users,
      href: "/alumnos",
    },
    {
      label: "Asistencias",
      icon: CalendarCheck,
      href: "/asistencias",
    },
    {
      label: "Pagos",
      icon: DollarSign,
      href: "/pagos",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-card/80 backdrop-blur-xl border-t border-border px-6 pb-6 pt-3 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90",
              isActive ? "text-primary" : "text-foreground/40 hover:text-foreground/60"
            )}
          >
            <div
              className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-primary/10 shadow-sm" : "bg-transparent"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-widest leading-none",
                isActive ? "opacity-100" : "opacity-40"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
