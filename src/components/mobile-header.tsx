"use client";

import React, { useEffect, useState } from "react";
import { School, Bell, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import Link from "next/link";

export function MobileHeader() {
  const [academyName, setAcademyName] = useState("Sahara");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('settings')
        .select('academy_name, logo_url')
        .single();
      
      if (data && !error) {
        setAcademyName(data.academy_name || "Sahara");
        setLogoUrl(data.logo_url);
      }
    }
    fetchSettings();
  }, []);

  return (
    <header className="lg:hidden flex items-center justify-between px-6 h-20 bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary overflow-hidden border border-primary/20">
          {logoUrl ? (
            <img src={logoUrl} alt={academyName} className="w-full h-full object-cover" />
          ) : (
            <School className="w-6 h-6" />
          )}
        </div>
        <div>
          <h1 className="font-serif font-bold text-lg text-foreground leading-tight">{academyName}</h1>
          <p className="text-[10px] text-secondary/60 uppercase tracking-widest font-bold">Admin Panel</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => alert("No hay notificaciones nuevas")}
          className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:bg-primary/5 active:scale-95 transition-all"
        >
          <Bell className="w-5 h-5" />
        </button>
        <Link 
          href="/config"
          className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold active:scale-95 transition-all overflow-hidden"
        >
          {logoUrl ? (
             <span className="text-xs">LM</span>
          ) : (
            <span className="text-xs">LM</span>
          )}
        </Link>
      </div>
    </header>
  );
}
