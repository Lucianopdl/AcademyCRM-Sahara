"use client";

import React, { useState } from "react";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";

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
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
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

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 18 },
    },
  };

  const brandVariants: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring" as const, stiffness: 80, damping: 20, delay: 0.3 },
    },
  };

  return (
    <div className="min-h-screen flex bg-[#0F0C0A] relative overflow-hidden">
      {/* ============ LEFT PANEL — Immersive Brand ============ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A0F08] via-[#2A1509] to-[#0F0C0A]" />

        {/* Animated warm glow orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#E67E22]/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#D35400]/15 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[60%] left-[50%] w-[300px] h-[300px] rounded-full bg-[#F39C12]/10 blur-[80px]"
        />

        {/* Geometric grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(230,126,34,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(230,126,34,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Diagonal decorative lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="0"
            y1="100%"
            x2="100%"
            y2="0"
            stroke="#E67E22"
            strokeWidth="1"
          />
          <line
            x1="20%"
            y1="100%"
            x2="100%"
            y2="20%"
            stroke="#E67E22"
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="80%"
            x2="80%"
            y2="0"
            stroke="#E67E22"
            strokeWidth="0.5"
          />
        </svg>

        {/* Brand content */}
        <motion.div
          variants={brandVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full"
        >
          {/* Top: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/sahara_logo.png" alt="Sahara" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <span className="text-white/60 font-bold text-m tracking-wider uppercase">
              Sahara
            </span>
          </div>

          {/* Center: Hero text */}
          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <p className="text-[#E67E22] text-[10px] font-bold uppercase tracking-[0.3em] mb-5">
                Panel de Gestión
              </p>
              <h1 className="text-5xl xl:text-6xl font-serif font-bold text-white leading-[1.1] tracking-tight mb-6">
                El arte de
                <br />
                <span className="bg-gradient-to-r from-[#E67E22] to-[#F5A623] bg-clip-text text-transparent">
                  gestionar.
                </span>
              </h1>
              <p className="text-white/40 text-base leading-relaxed max-w-sm font-medium">
                Administra clases, alumnos y finanzas con la elegancia que tu
                academia merece.
              </p>
            </motion.div>
          </div>

          {/* Bottom: Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              {[
                "bg-[#E67E22]",
                "bg-[#27AE60]",
                "bg-[#3498DB]",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${bg} border-2 border-[#0F0C0A] flex items-center justify-center`}
                >
                  <span className="text-white text-[8px] font-bold">
                    {["NS", "AC", "PR"][i]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-white/30 text-xs font-medium">
              Desarrollado por{" "}
              <span className="text-white/50">Norte Sistemas</span>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ============ RIGHT PANEL — Login Form (Silver Gray + White Text) ============ */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden p-6 lg:p-12">
        {/* Silver/slate gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2B2D31] via-[#35373C] to-[#1E1F22]" />

        {/* Animated silver glow orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] right-[15%] w-[280px] h-[280px] rounded-full bg-[#E67E22]/15 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[5%] left-[10%] w-[250px] h-[250px] rounded-full bg-[#9CA3AF]/10 blur-[80px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[50%] left-[50%] w-[200px] h-[200px] rounded-full bg-[#F39C12]/10 blur-[70px] -translate-x-1/2 -translate-y-1/2"
        />

        {/* Floating decorative geometric shapes */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-[8%] left-[8%] w-16 h-16 border border-white/[0.04] rounded-xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[12%] right-[12%] w-20 h-20 border border-white/[0.03] rounded-full"
        />
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] right-[5%] w-3 h-3 bg-[#E67E22]/15 rounded-full"
        />
        <motion.div
          animate={{ y: [5, -5, 5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[35%] left-[5%] w-2 h-2 bg-white/10 rounded-full"
        />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: "36px 36px",
          }}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile Logo (hidden on lg+) */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 mb-10 lg:hidden"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/sahara_logo.png" alt="Sahara" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <span className="text-white font-bold text-sm tracking-wider uppercase">
              Sahara
            </span>
          </motion.div>

          {/* Header with accent */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-[3px] rounded-full bg-gradient-to-r from-[#E67E22] to-[#F5A623]" />
              <span className="text-[10px] font-bold text-[#E67E22] uppercase tracking-[0.2em]">Acceso</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-white tracking-tight mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-white/50 text-sm font-medium">
              Ingresa tus credenciales para acceder al panel
            </p>
          </motion.div>

          {/* Form Card — Dark glassmorphism */}
          <motion.div
            variants={itemVariants}
            className="relative bg-[#404249] backdrop-blur-2xl border border-white/[0.05] rounded-[28px] p-7 lg:p-9 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
          >
            {/* Left accent bar */}
            <div className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full bg-gradient-to-b from-[#E67E22] via-[#F5A623] to-[#E67E22]/20" />

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-1">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-[15px] w-[15px] text-gray-400 group-focus-within:text-[#E67E22] transition-colors duration-300" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E67E22]/50 focus:border-[#E67E22] transition-all duration-300 font-medium text-[#2D2D2D] text-sm placeholder:text-gray-400"
                    placeholder="admin@tuacademia.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] ml-1">
                  Contraseña
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-[15px] w-[15px] text-gray-400 group-focus-within:text-[#E67E22] transition-colors duration-300" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-white border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E67E22]/50 focus:border-[#E67E22] transition-all duration-300 font-medium text-[#2D2D2D] text-sm placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 group-focus-within:text-[#E67E22] transition-colors duration-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="p-3.5 bg-red-500/15 text-red-300 rounded-xl text-[13px] font-medium flex items-start gap-2.5 border border-red-500/20 backdrop-blur-sm"
                  >
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button — Vibrant orange gradient */}
              <button
                id="login-submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#D35400] via-[#E67E22] to-[#F39C12] text-white py-4 rounded-2xl font-bold text-sm hover:from-[#C0490A] hover:via-[#D35400] hover:to-[#E67E22] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg shadow-[#E67E22]/20 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />

                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span className="relative">Iniciar Sesión</span>
                    <ArrowRight className="h-4 w-4 text-white/80 relative group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Footer text */}
          <motion.p
            variants={itemVariants}
            className="mt-8 text-center text-[13px] text-white/35 font-medium"
          >
            ¿No tienes cuenta todavía?{" "}
            <button className="text-[#E67E22] font-bold hover:underline underline-offset-2 transition-all">
              Contactar soporte
            </button>
          </motion.p>

          {/* Bottom branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="hidden lg:flex items-center justify-center mt-12 gap-2"
          >
            <div className="w-5 h-[2px] rounded-full bg-white/10" />
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/20">
              © 2026 Norte Sistemas
            </p>
            <div className="w-5 h-[2px] rounded-full bg-white/10" />
          </motion.div>
        </motion.div>
      </div>

      {/* ============ 3D FLOATING ACADEMY OBJECTS ============ */}
      {/* Mix-blend-screen removes the black background from the 3D renders */}
      <motion.div
        animate={{ y: [15, -15, 15], rotate: [-5, 5, -5, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[10%] left-[30%] w-[180px] 2xl:w-[240px] opacity-[0.75] pointer-events-none mix-blend-screen hidden lg:block z-50"
      >
        <img src="/3d/gradcap.png" alt="3D Graduation Cap" className="w-full h-auto drop-shadow-2xl" />
      </motion.div>

      <motion.div
        animate={{ y: [-15, 15, -15], x: [-10, 10, -10], rotate: [0, -10, 5, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[40%] left-[32%] w-[150px] 2xl:w-[190px] opacity-[0.8] pointer-events-none mix-blend-screen hidden lg:block z-50"
      >
        <img src="/3d/pencil.png" alt="3D Pencil" className="w-full h-auto drop-shadow-2xl" />
      </motion.div>
    </div>
  );
}