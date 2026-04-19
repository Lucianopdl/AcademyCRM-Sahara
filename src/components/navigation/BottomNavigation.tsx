"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarCheck, DollarSign, UserCircle2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export function BottomNavigation() {
  const pathname = usePathname();

  const [hasSeenFeature, setHasSeenFeature] = React.useState(true);

  React.useEffect(() => {
    const seen = localStorage.getItem('hasSeenMaletinFeature');
    setHasSeenFeature(seen === 'true');
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = "/login";
    }
  };

  const navItems = [
    {
      label: "Inicio",
      icon: Home,
      href: "/",
    },
    {
      label: "Maletín",
      icon: Briefcase,
      href: "/maletin",
    },
    {
      label: "Alumnos",
      icon: Users,
      href: "/alumnos",
    },
    {
      label: "Pagos",
      icon: DollarSign,
      href: "/pagos",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-card/80 backdrop-blur-xl border-t border-border px-4 pb-6 pt-3 flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (item.label === "Maletín") {
                localStorage.setItem('hasSeenMaletinFeature', 'true');
                setHasSeenFeature(true);
              }
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90",
              isActive ? "text-primary" : "text-foreground/40"
            )}
          >
            <div
              className={cn(
                "p-2 rounded-2xl transition-all duration-300 relative",
                isActive ? "bg-primary/20 shadow-sm" : "bg-transparent"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              {item.label === "Maletín" && !hasSeenFeature && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
              )}
            </div>
            <span
              className={cn(
                "text-[8px] font-black uppercase tracking-[0.1em] leading-none text-center",
                isActive ? "opacity-100" : "opacity-40"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        onClick={handleSignOut}
        className="flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90 text-foreground/40"
      >
        <div className="p-2 rounded-2xl bg-transparent">
          <UserCircle2 className="w-6 h-6 stroke-2" />
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.1em] leading-none opacity-40">
          Salir
        </span>
      </button>
    </nav>
  );
}
