"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { 
  Users, 
  ArrowLeft, 
  CheckCircle, 
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_date: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      let academyId = user.user_metadata?.academy_id;
      if (!academyId) {
        const { data: profile } = await supabase.from('user_profiles').select('academy_id').eq('id', user.id).single();
        if (profile) academyId = profile.academy_id;
      }

      if (!academyId) throw new Error("No se pudo determinar la academia del usuario");

      const { error: insertError } = await supabase
        .from('students')
        .insert([{
          ...formData,
          academy_id: academyId,
          status: 'active',
          birthdate: formData.birth_date // Corregir nombre de columna si es necesario
        }]);
      
      if (insertError) throw insertError;

      setDone(true);
      setTimeout(() => router.push('/alumnos'), 1500);
    } catch (err: any) {
      console.error("Error creating student:", err);
      setError(err.message || "Error al crear el alumno");
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="mb-12">
          <Link href="/alumnos" className="text-secondary/60 hover:text-primary transition-colors flex items-center gap-2 mb-8 group">
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al listado
          </Link>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Ingresar Nuevo Alumno</h1>
          <p className="text-secondary font-medium tracking-tight">Completa los datos básicos para formalizar la matrícula.</p>
        </header>

        <div className="max-w-3xl">
          {done ? (
            <div className="sahara-card bg-green-50 border-green-200 text-center py-20 animate-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                 <CheckCircle className="w-10 h-10" />
               </div>
               <h2 className="text-2xl font-serif font-bold text-green-900 mb-2">¡Alumno Registrado!</h2>
               <p className="text-green-700 italic">Redirigiendo a la lista principal...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="sahara-card p-10 space-y-8 shadow-warm-lg border-none bg-card/80 backdrop-blur-md relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 scale-[3] -rotate-12">
                 <Users className="w-32 h-32" />
               </div>

               <div className="grid md:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Nombre Completo *</label>
                    <input 
                      required
                      className="w-full bg-background border-b-2 border-secondary/10 px-0 py-3 text-2xl font-serif font-bold text-foreground placeholder:text-secondary/20 focus:outline-none focus:border-primary transition-colors"
                      placeholder="Ej: Lucía Martínez"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Correo Electrónico</label>
                    <input 
                      type="email"
                      className="w-full bg-background border-b-2 border-secondary/10 px-0 py-2 text-lg font-medium text-foreground placeholder:text-secondary/20 focus:outline-none focus:border-primary transition-colors"
                      placeholder="lucia@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Teléfono de Contacto</label>
                    <input 
                      className="w-full bg-background border-b-2 border-secondary/10 px-0 py-2 text-lg font-medium text-foreground placeholder:text-secondary/20 focus:outline-none focus:border-primary transition-colors"
                      placeholder="+54 9..."
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">Fecha de Nacimiento</label>
                    <input 
                      type="date"
                      className="w-full bg-background border-b-2 border-secondary/10 px-0 py-2 text-lg font-medium text-foreground placeholder:text-secondary/20 focus:outline-none focus:border-primary transition-colors"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    />
                  </div>
               </div>

               {error && <p className="text-red-500 text-sm italic font-medium">{error}</p>}

               <div className="pt-8 border-t border-secondary/10 flex justify-between items-center">
                  <p className="text-xs text-secondary/40 font-bold uppercase tracking-widest leading-loose">* Campos obligatorios</p>
                  <Button type="submit" disabled={loading} variant="primary" className="h-14 px-12 text-lg font-serif italic shadow-warm-lg">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Matrícula"}
                  </Button>
               </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
