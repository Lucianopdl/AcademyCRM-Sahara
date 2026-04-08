"use client";

import React, { useEffect, useState } from "react";
import { School, Bell, Search, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export function MobileHeader() {
  const [academyName, setAcademyName] = useState("Sahara");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('settings')
        .select('academy_name, logo_url')
        .maybeSingle();
      
      if (data) {
        setAcademyName(data.academy_name || "Sahara");
        setLogoUrl(data.logo_url);
      }
    }
    fetchSettings();
  }, []);

  return (
    <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b border-border/50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={academyName} className="w-full h-full object-cover" />
          ) : (
            <School className="w-5 h-5 text-primary" />
          )}
        </div>
        <h1 className="text-xl font-serif font-bold text-foreground tracking-tight truncate max-w-[150px]">
          {academyName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 text-secondary hover:text-primary transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <button className="p-2 text-secondary hover:text-primary transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#2D241E] flex items-center justify-center text-white text-[10px] font-bold ml-1">
          LM
        </div>
      </div>
    </header>
  );
}
