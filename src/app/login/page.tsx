"use client";

import React, { useState } from "react";
import { School, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Cliente de Navegador (SSR) que maneja cookies automáticamente
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Usuario o contraseña incorrectos.");
        }
        throw authError;
      }

      // Éxito - Refrescamos para que el proxy vea las cookies
      router.refresh();
      router.replace("/");
    } catch (err: any) {
      console.error("Login detail:", err);
      setError(err.message || "Error al intentar iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-on-primary shadow-warm mb-6">
            <School className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Bienvenido a Sahara</h1>
          <p className="text-secondary/60 font-medium text-center text-sm">Panel de Gestión Académica</p>
        </div>

        <div className="sahara-card p-8 lg:p-10 backdrop-blur-xl bg-white/70 border-white/40 shadow-2xl rounded-[32px]">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-secondary/30 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-tertiary/10 border-transparent rounded-[18px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white transition-all font-medium text-foreground"
                  placeholder="admin@tuacademia.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">
                  Contraseña
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-secondary/30 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-4 bg-tertiary/10 border-transparent rounded-[18px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white transition-all font-medium text-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary/30 hover:text-secondary group-focus-within:text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-red-50 text-red-600 rounded-2xl text-[13px] font-medium flex items-start gap-2 border border-red-100"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              className="w-full bg-[#2D2825] text-white py-4 rounded-[18px] font-bold text-sm hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="h-4 w-4 text-primary" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[13px] text-secondary/50 font-medium">
          ¿No tienes cuenta todavía?{" "}
          <button className="text-primary font-bold hover:underline">Contactar soporte</button>
        </p>
      </motion.div>
    </div>
  );
}
