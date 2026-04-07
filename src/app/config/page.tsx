"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Settings, Shield, User, Globe, Save, Loader2, CheckCircle2, PlusCircle, Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    academy_name: "",
    category: "",
    currency: "USD",
    logo_url: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (data) {
        setFormData({
          academy_name: data.academy_name || "",
          category: data.category || "",
          currency: data.currency || "USD",
          logo_url: data.logo_url || ""
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás logueado.");

      // Objeto a guardar
      const updatePayload = {
        academy_name: formData.academy_name,
        category: formData.category,
        currency: formData.currency,
        logo_url: formData.logo_url,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      console.log("Intentando guardar:", updatePayload);

      // Usamos upsert: si existe lo actualiza, si no lo crea.
      // Usamos el user_id como clave única para esta operación.
      const { error } = await supabase
        .from('settings')
        .upsert(updatePayload, { onConflict: 'user_id' });

      if (error) {
        console.error("Error detallado de Supabase:", error);
        throw error;
      }
      
      setMessage({ type: 'success', text: "¡Configuración guardada!" });
      setTimeout(() => {
        setMessage(null);
        window.location.reload(); // Recargamos después de un tiempo para que el usuario vea el éxito
      }, 1500);

    } catch (err: any) {
      console.error("Fallo total en handleSave:", err);
      // Intentamos mostrar el mensaje de error mas descriptivo posible
      const errorMsg = err.message || err.details || "Error desconocido al guardar";
      setMessage({ type: 'error', text: `${errorMsg}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Configuración</h1>
          <p className="text-secondary font-medium">Personaliza el entorno de tu academia.</p>
        </header>

        <div className="max-w-3xl space-y-8">
          {/* Academia Settings */}
          <div className="sahara-card hover:scale-100 cursor-default p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-foreground">Identidad de la Academia</h3>
                <p className="text-sm text-secondary">Define el nombre y rubro que verán tus usuarios.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-secondary/60 uppercase tracking-widest mb-2 ml-1">
                    Nombre de la Institución
                  </label>
                  <input
                    type="text"
                    value={formData.academy_name}
                    onChange={(e) => setFormData({ ...formData, academy_name: e.target.value })}
                    className="w-full bg-tertiary/5 border border-secondary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-serif italic text-lg"
                    placeholder="Ej: Academia Superior de Artes"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-secondary/60 uppercase tracking-widest mb-2 ml-1">
                      Rubro / Especialidad
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-tertiary/5 border border-secondary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-sm"
                      placeholder="Ej: Danzas, Música, Deportes"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-secondary/60 uppercase tracking-widest mb-2 ml-1">
                      Moneda Predeterminada
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full bg-tertiary/5 border border-secondary/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-sm appearance-none"
                    >
                      <option value="USD">USD - Dólares</option>
                      <option value="ARS">ARS - Pesos Argentinos</option>
                      <option value="EUR">EUR - Euros</option>
                      <option value="MXN">MXN - Pesos Mexicanos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-secondary/60 uppercase tracking-widest mb-2 ml-1">
                    Logo de la Academia
                  </label>
                  <div className="flex gap-6 items-center">
                    <div className="relative group">
                      <div className={cn(
                        "w-24 h-24 rounded-2xl border-2 border-dashed border-secondary/20 bg-primary/5 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary/50 shadow-inner",
                        formData.logo_url && "border-solid border-primary/20"
                      )}>
                        {formData.logo_url ? (
                          <img 
                            src={formData.logo_url} 
                            alt="Logo" 
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <PlusCircle className="w-8 h-8 text-secondary/40 group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            setSaving(true);
                            setMessage({ type: 'success', text: "Subiendo imagen..." });
                            
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                            const filePath = `logos/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                              .from('logos')
                              .upload(filePath, file);

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                              .from('logos')
                              .getPublicUrl(filePath);

                            setFormData({ ...formData, logo_url: publicUrl });
                            setMessage({ type: 'success', text: "¡Imagen subida! No olvides guardar." });
                          } catch (err) {
                            console.error("Upload error:", err);
                            setMessage({ type: 'error', text: "Error al subir la imagen." });
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-1">Click para subir foto</p>
                      <p className="text-[10px] text-secondary leading-relaxed max-w-[200px]">
                        Recomendado: PNG sin fondo o JPG alta calidad. Máximo 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <AnimatePresence mode="wait">
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`text-sm font-medium flex items-center gap-2 ${
                          message.type === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="ml-auto bg-foreground text-background px-8 py-3 rounded-xl font-bold text-sm hover:bg-foreground/80 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile - Future enhancement placeholder following Sahara style */}
          <div className="sahara-card hover:scale-100 cursor-default opacity-50 grayscale-[50%] transition-all hover:opacity-100 hover:grayscale-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-foreground">Perfil de Luciano</h3>
                <p className="text-sm text-secondary">Administrador del sistema.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
