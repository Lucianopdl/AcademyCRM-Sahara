"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAcademy } from "@/hooks/use-academy";
import { 
  Settings, 
  Shield, 
  User, 
  Globe, 
  Save, 
  Loader2, 
  CheckCircle2, 
  PlusCircle, 
  Upload, 
  Image as ImageIcon,
  ChevronRight,
  Bell,
  HardDrive,
  CreditCard,
  Building2,
  Trash2,
  Camera,
  Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ConfigPage() {
  const { academyId, settings, loading: contextLoading } = useAcademy();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  const [formData, setFormData] = useState({
    academy_name: "",
    category: "",
    currency: "USD",
    logo_url: ""
  });

  useEffect(() => {
    if (!contextLoading) {
      if (settings) {
        setFormData({
          academy_name: settings.academy_name || "",
          category: settings.category || "",
          currency: (settings as any).currency || "USD",
          logo_url: settings.logo_url || ""
        });
      }
      setLoading(false);
    }
  }, [contextLoading, settings]);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás logueado.");

      const updatePayload = {
        academy_name: formData.academy_name,
        category: formData.category,
        currency: formData.currency,
        logo_url: formData.logo_url,
        user_id: user.id,
        academy_id: academyId, // Vinculamos a la academia
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('settings')
        .upsert(updatePayload, { onConflict: 'user_id' }); // El conflicto es por user_id debido al constraint único en bd
      
      setMessage({ type: 'success', text: "¡Configuración guardada correctamente!" });
      setTimeout(() => setMessage(null), 3000);

    } catch (err: any) {
      const errorMsg = err.message || "Error al guardar";
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'general', label: 'Academia', icon: Building2 },
    { id: 'billing', label: 'Pagos y Moneda', icon: Coins },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="flex bg-[#FDFCFB] min-h-screen text-[#2D241E] font-sans">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3 mb-2 text-[#847365]/60">
             <Settings className="w-5 h-5 shadow-sm" />
             <span className="text-[11px] font-black uppercase tracking-[0.2em]">Configuración del Sistema</span>
          </div>
          <h1 className="text-5xl font-serif font-black text-[#2D241E] tracking-tight">Tu Academia</h1>
          <p className="text-[#847365] font-medium opacity-70 max-w-lg mt-2 leading-relaxed">Personaliza el motor de tu institución. Estos cambios se reflejarán en todos tus recibos y paneles.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start max-w-6xl">
          {/* Navegación Lateral de Config */}
          <nav className="w-full lg:w-64 space-y-2 shrink-0">
             {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all group",
                    activeTab === tab.id 
                      ? "bg-white text-[#2D241E] shadow-warm border border-[#847365]/5" 
                      : "text-[#847365]/60 hover:bg-[#F5F1EE] hover:text-[#2D241E]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-[#E67E22]" : "text-[#847365]/40 group-hover:text-[#E67E22]/60")} />
                    <span className="text-sm tracking-tight">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 opacity-40" />}
                </button>
             ))}
          </nav>

          {/* Panel Principal */}
          <div className="flex-1 w-full animate-in fade-in slide-in-from-right-4 duration-700">
             <div className="bg-white rounded-[48px] border border-[#847365]/5 p-8 lg:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Settings className="w-32 h-32 rotate-12" />
                </div>

                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin text-[#E67E22]" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Cargando Preferencias...</p>
                    </motion.div>
                  ) : activeTab === 'general' ? (
                    <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                       <section className="grid lg:grid-cols-2 gap-12">
                          <div className="space-y-8">
                             <div className="flex items-center gap-4 border-b border-[#847365]/5 pb-6">
                                <div className="w-10 h-10 bg-[#E67E22]/10 rounded-xl flex items-center justify-center text-[#E67E22]"><Building2 className="w-5 h-5" /></div>
                                <h3 className="text-2xl font-serif font-black text-[#2D241E]">Identidad Visual</h3>
                             </div>

                             <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365] ml-1">Nombre Oficial</label>
                                  <input 
                                    type="text"
                                    value={formData.academy_name}
                                    onChange={(e) => setFormData({ ...formData, academy_name: e.target.value })}
                                    className="w-full bg-[#F5F1EE]/50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-[#E67E22]/10 font-serif italic text-2xl" 
                                    placeholder="Nombre de la Institución" 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365] ml-1">Rubro Académico</label>
                                  <input 
                                    type="text" 
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-[#F5F1EE]/50 border-none rounded-2xl px-6 py-4 font-bold tracking-tight" 
                                    placeholder="Danzas, Arte, Idiomas..." 
                                  />
                                </div>
                             </div>
                          </div>

                          <div className="space-y-8">
                             <div className="flex items-center gap-4 border-b border-[#847365]/5 pb-6">
                                <div className="w-10 h-10 bg-[#2D241E]/5 rounded-xl flex items-center justify-center text-[#2D241E]"><Camera className="w-5 h-5" /></div>
                                <h3 className="text-2xl font-serif font-black text-[#2D241E]">Logo</h3>
                             </div>

                             <div className="flex flex-col sm:flex-row gap-8 items-center bg-[#F5F1EE]/20 p-8 rounded-[32px] border border-dashed border-[#847365]/10">
                                <div className="relative group">
                                  <div className={cn(
                                    "w-32 h-32 rounded-[32px] bg-white shadow-xl flex items-center justify-center p-4 transition-all duration-500 overflow-hidden",
                                    !formData.logo_url && "border-2 border-dashed border-[#847365]/20"
                                  )}>
                                    {formData.logo_url ? (
                                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                      <ImageIcon className="w-10 h-10 text-[#847365]/20" />
                                    )}
                                  </div>
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        setSaving(true);
                                        const formDataToUpload = new FormData();
                                        formDataToUpload.append("file", file);
                                        
                                        const { uploadLogoAction } = await import('@/app/actions/upload-logo');
                                        const result = await uploadLogoAction(formDataToUpload);
                                        
                                        if (!result.success || !result.url) throw new Error(result.error || "No se obtuvo una URL");
                                        setFormData({ ...formData, logo_url: result.url });
                                      } catch (err: any) { 
                                        console.error(err);
                                        setMessage({ type: 'error', text: err.message || 'Error al subir el logo' });
                                      } finally { 
                                        setSaving(false); 
                                      }
                                    }}
                                  />
                                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#E67E22] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#E67E22]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Upload className="w-4 h-4" />
                                  </div>
                                </div>
                                <div className="space-y-1 text-center sm:text-left">
                                   <p className="font-black text-sm tracking-tight">Cambiar Imagen</p>
                                   <p className="text-[10px] font-bold text-[#847365]/50 leading-relaxed max-w-[180px]">Formatos recomendados: PNG Transparente o SVG para máxima nitidez.</p>
                                   {formData.logo_url && <button onClick={() => setFormData({...formData, logo_url: ""})} className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors mt-2 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Quitar Logo</button>}
                                </div>
                             </div>
                          </div>
                       </section>

                       <section className="pt-8 border-t border-[#847365]/5 flex items-center justify-between">
                          <AnimatePresence>
                             {message && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className={cn("flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest", message.type === 'success' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                                   <CheckCircle2 className="w-4 h-4" /> {message.text}
                                </motion.div>
                             )}
                          </AnimatePresence>
                          <Button onClick={handleSave} disabled={saving} className="bg-[#2D241E] hover:bg-[#E67E22] text-white px-12 h-16 rounded-[24px] font-black text-lg shadow-xl shadow-black/5 active:scale-95 transition-all flex border-none focus:outline-none">
                             {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-3" /> Guardar Todo</>}
                          </Button>
                       </section>
                    </motion.div>
                  ) : activeTab === 'billing' ? (
                    <motion.div key="billing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                       <div className="flex items-center gap-4 border-b border-[#847365]/5 pb-6">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Coins className="w-5 h-5" /></div>
                          <h3 className="text-2xl font-serif font-black text-[#2D241E]">Configuración Financiera</h3>
                       </div>
                       
                       <div className="max-w-md space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365] ml-1">Moneda del Sistema</label>
                          <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full bg-[#F5F1EE]/50 border-none h-16 rounded-2xl px-6 font-bold text-[#2D241E] appearance-none focus:ring-4 focus:ring-indigo-100"
                          >
                            <option value="USD">USD - Dólares</option>
                            <option value="ARS">ARS - Pesos Argentinos</option>
                            <option value="EUR">EUR - Euros</option>
                            <option value="MXN">MXN - Pesos Mexicanos</option>
                          </select>
                          <p className="text-[10px] text-[#847365]/60 font-medium p-2">Esto afectará cómo se muestran los precios en todo el sistema.</p>
                       </div>

                       <div className="p-8 bg-blue-50/30 rounded-[32px] border border-blue-100 flex gap-6 items-start">
                          <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20"><Bell className="w-6 h-6" /></div>
                          <div>
                            <p className="font-black text-sm mb-1 uppercase tracking-tight">Recordatorios Automáticos</p>
                            <p className="text-xs text-[#847365] leading-relaxed">Próximamente: Envía avisos automáticos por WhatsApp cuando un alumno pase a estado "Pendiente".</p>
                          </div>
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div key="coming-soon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
                       <div className="w-20 h-20 bg-[#F5F1EE] rounded-[32px] flex items-center justify-center mb-6"><Settings className="w-10 h-10 text-[#847365]/20 animate-pulse" /></div>
                       <h3 className="text-xl font-serif font-bold opacity-30">Módulo en Desarrollo</h3>
                       <p className="text-xs text-[#847365]/40 mt-1 uppercase font-black tracking-widest">Sahara OS v1.2</p>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      </main>
      <style jsx global>{`
        .shadow-warm { box-shadow: 0 10px 40px -10px rgba(132, 115, 101, 0.12); }
      `}</style>
    </div>
  );
}
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
