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
  Coins,
  Users,
  Mail,
  Lock,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getStaffAction, createStaffAction, deleteStaffAction } from "@/app/actions/staff";

export default function ConfigPage() {
  const { academyId, settings, loading: contextLoading } = useAcademy();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Estados para Personal
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });

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

  useEffect(() => {
    if (activeTab === 'staff' && academyId) {
      loadStaff();
    }
  }, [activeTab, academyId]);

  async function loadStaff() {
    if (!academyId) return;
    setLoadingStaff(true);
    const result = await getStaffAction(academyId);
    if (result.success) {
      setStaff(result.data || []);
    }
    setLoadingStaff(false);
  }

  async function handleAddStaff() {
    if (!academyId) return;
    if (!newStaff.email || !newStaff.password || !newStaff.name) {
      setMessage({ type: 'error', text: "Por favor completa todos los campos." });
      return;
    }

    setSaving(true);
    const result = await createStaffAction(academyId, newStaff.email, newStaff.password, newStaff.name);
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setShowAddModal(false);
      setNewStaff({ name: "", email: "", password: "" });
      loadStaff();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setSaving(false);
  }

  async function handleDeleteStaff(userId: string) {
    if (!confirm("¿Estás seguro de eliminar este acceso?")) return;
    setSaving(true);
    const result = await deleteStaffAction(userId);
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      loadStaff();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setSaving(false);
  }

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
        academy_id: academyId, 
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('settings')
        .upsert(updatePayload, { onConflict: 'user_id' }); 
      
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
    { id: 'staff', label: 'Personal', icon: Users },
    { id: 'billing', label: 'Pagos y Moneda', icon: Coins },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="flex bg-background min-h-screen text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 md:px-16 lg:px-24 py-12">
        <header className="mb-14">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4 text-primary"
          >
             <Settings className="w-6 h-6 animate-spin-slow" />
             <span className="text-xs font-bold uppercase tracking-[0.3em]">Configuración del Sistema</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight italic text-foreground">
              Tu Academia
            </h1>
            <p className="text-muted-foreground font-light text-xl mt-4 max-w-2xl leading-relaxed">
              Personaliza el motor de tu institución y gestiona el acceso de tus profesores.
            </p>
          </motion.div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start max-w-6xl">
          {/* Navegación Lateral de Config */}
          <motion.nav 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full lg:w-72 space-y-3 shrink-0"
          >
             {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-[24px] font-semibold transition-all duration-300 group relative overflow-hidden text-lg tracking-tight",
                    activeTab === tab.id 
                      ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]" 
                      : "text-muted-foreground bg-card/20 backdrop-blur-md border border-border/40 hover:bg-card/40 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <tab.icon className={cn("w-6 h-6", activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5 transition-all duration-500 relative z-10", 
                    activeTab === tab.id ? "opacity-100 rotate-90" : "opacity-0 -translate-x-2"
                  )} />
                </button>
             ))}
          </motion.nav>

          {/* Panel Principal */}
          <div className="flex-1 w-full relative">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="bg-card/30 backdrop-blur-2xl border border-border/40 rounded-[32px] p-8 lg:p-12 shadow-2xl shadow-black/10 overflow-hidden relative min-h-[500px]"
             >
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                   <Settings className="w-64 h-64 rotate-12" />
                </div>

                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-32 space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 className="w-14 h-14 animate-spin text-primary relative z-10" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Sincronizando Preferencias...</p>
                    </motion.div>
                  ) : activeTab === 'general' ? (
                    <motion.div 
                      key="general" 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }} 
                      className="space-y-12 relative z-10"
                    >
                       <section className="space-y-8">
                          <div className="flex items-center gap-4 border-b border-border/40 pb-6">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Building2 className="w-6 h-6" />
                             </div>
                             <h3 className="text-3xl font-serif font-medium italic text-foreground tracking-tight">Identidad Visual</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Nombre de la Institución</label>
                                <input 
                                  type="text"
                                  value={formData.academy_name}
                                  onChange={(e) => setFormData({ ...formData, academy_name: e.target.value })}
                                  className="w-full bg-card/40 border border-border/40 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-serif italic text-2xl transition-all" 
                                  placeholder="Ej: Sahara Academy" 
                                />
                             </div>
                             <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Rubro / Categoría</label>
                                <input 
                                  type="text" 
                                  value={formData.category}
                                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                  className="w-full bg-card/40 border border-border/40 rounded-2xl px-6 py-5 font-semibold text-lg focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                                  placeholder="Danzas, Arte, Idiomas..." 
                                />
                             </div>
                          </div>
                       </section>

                       <section className="space-y-8">
                          <div className="flex items-center gap-4 border-b border-border/40 pb-6">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <ImageIcon className="w-6 h-6" />
                             </div>
                             <h3 className="text-3xl font-serif font-medium italic text-foreground tracking-tight">Emblema Institucional</h3>
                          </div>

                          <div className="flex flex-col md:flex-row gap-10 items-center bg-card/20 p-10 rounded-[40px] border border-border/40">
                             <div className="relative group">
                               <div className="absolute -inset-4 bg-primary/10 rounded-[44px] blur-2xl group-hover:bg-primary/20 transition-all duration-500 opacity-0 group-hover:opacity-100" />
                               <div className={cn(
                                 "w-44 h-44 rounded-[40px] bg-background shadow-2xl flex items-center justify-center p-6 border-4 border-card relative z-10 transition-transform duration-500 group-hover:scale-[1.05]",
                                 !formData.logo_url && "border-dashed border-primary/20"
                               )}>
                                 {formData.logo_url ? (
                                   <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                 ) : (
                                   <ImageIcon className="w-16 h-16 text-muted-foreground/20" />
                                 )}
                               </div>
                               <input 
                                 type="file" 
                                 accept="image/*"
                                 className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                 onChange={async (e) => {
                                   const file = e.target.files?.[0];
                                   if (!file) return;
                                   try {
                                     setSaving(true);
                                     const fData = new FormData();
                                     fData.append("file", file);
                                     const { uploadLogoAction } = await import('@/app/actions/upload-logo');
                                     const result = await uploadLogoAction(fData);
                                     if (!result.success || !result.url) throw new Error(result.error || "Error al subir");
                                     setFormData({ ...formData, logo_url: result.url });
                                   } catch (err: any) { 
                                     setMessage({ type: 'error', text: err.message });
                                   } finally { setSaving(false); }
                                 }}
                               />
                               <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/40 z-30 pointer-events-none">
                                  <Upload className="w-5 h-5" />
                               </div>
                             </div>
                             
                             <div className="space-y-4 text-center md:text-left">
                                <h4 className="font-serif text-2xl italic">Subir nuevo logo</h4>
                                <p className="text-muted-foreground font-light leading-relaxed max-w-[280px]">
                                   Recomendamos archivos PNG con fondo transparente para unificar con el diseño del sistema.
                                </p>
                                {formData.logo_url && (
                                  <button 
                                    onClick={() => setFormData({...formData, logo_url: ""})} 
                                    className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-2 mx-auto md:mx-0"
                                  >
                                    <Trash2 className="w-4 h-4" /> Eliminar actual
                                  </button>
                                )}
                             </div>
                          </div>
                       </section>
                    </motion.div>
                  ) : activeTab === 'staff' ? (
                    <motion.div 
                      key="staff" 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }} 
                      className="space-y-8 relative z-10"
                    >
                       <div className="flex items-center justify-between border-b border-border/40 pb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Users className="w-6 h-6" />
                             </div>
                             <h3 className="text-3xl font-serif font-medium italic text-foreground tracking-tight">Gestión de Personal</h3>
                          </div>
                          <Button 
                            onClick={() => setShowAddModal(true)}
                            className="bg-primary hover:bg-primary/90 rounded-2xl px-6 h-14 font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
                          >
                             <UserPlus className="w-5 h-5" />
                             Agregar Profesor
                          </Button>
                       </div>

                       {loadingStaff ? (
                          <div className="flex flex-col items-center justify-center py-20 space-y-4">
                             <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                             <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">Cargando personal...</p>
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {staff.length === 0 ? (
                                <div className="col-span-full py-20 text-center bg-card/20 rounded-[32px] border border-dashed border-border/40">
                                   <p className="text-muted-foreground font-serif italic text-lg">No hay otros profesores registrados todavía.</p>
                                </div>
                             ) : staff.map((member) => (
                                <motion.div 
                                  key={member.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="bg-card/40 border border-border/40 p-6 rounded-[28px] flex items-center justify-between group hover:border-primary/40 transition-all duration-500 shadow-xl"
                                >
                                   <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 bg-background rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border/20 shadow-inner">
                                         <User className="w-7 h-7" />
                                      </div>
                                      <div>
                                         <h4 className="font-bold text-lg leading-tight">{member.name}</h4>
                                         <p className="text-sm text-muted-foreground font-light">{member.email}</p>
                                         <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                                            {member.role === 'admin' ? 'Administrador' : 'Profesor'}
                                         </span>
                                      </div>
                                   </div>
                                   <button 
                                      onClick={() => handleDeleteStaff(member.id)}
                                      className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center"
                                   >
                                      <Trash2 className="w-5 h-5" />
                                   </button>
                                </motion.div>
                             ))}
                          </div>
                       )}

                       {/* Modal Formulario Agregar */}
                       <AnimatePresence>
                          {showAddModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                               <motion.div 
                                 initial={{ opacity: 0 }} 
                                 animate={{ opacity: 1 }} 
                                 exit={{ opacity: 0 }}
                                 onClick={() => setShowAddModal(false)}
                                 className="absolute inset-0 bg-background/80 backdrop-blur-md" 
                               />
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                 className="bg-card border border-border/40 rounded-[40px] p-10 shadow-2xl w-full max-w-lg relative z-10"
                               >
                                  <h3 className="text-3xl font-serif font-medium italic mb-8">Nuevo Acceso</h3>
                                  <div className="space-y-6">
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre Completo</label>
                                        <div className="relative">
                                           <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                           <input 
                                             type="text" 
                                             value={newStaff.name}
                                             onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                                             className="w-full bg-background border border-border/40 rounded-2xl pl-14 pr-6 py-5 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-semibold"
                                             placeholder="Ej: Profe Lucía"
                                           />
                                        </div>
                                     </div>
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Correo Electrónico</label>
                                        <div className="relative">
                                           <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                           <input 
                                             type="email" 
                                             value={newStaff.email}
                                             onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                                             className="w-full bg-background border border-border/40 rounded-2xl pl-14 pr-6 py-5 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-semibold"
                                             placeholder="correo@ejemplo.com"
                                           />
                                        </div>
                                     </div>
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Contraseña Temporal</label>
                                        <div className="relative">
                                           <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                           <input 
                                             type="password" 
                                             value={newStaff.password}
                                             onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                                             className="w-full bg-background border border-border/40 rounded-2xl pl-14 pr-6 py-5 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-semibold tracking-widest"
                                             placeholder="••••••••"
                                           />
                                        </div>
                                     </div>
                                     
                                     <div className="pt-6 flex gap-4">
                                        <Button 
                                          onClick={() => setShowAddModal(false)}
                                          className="flex-1 bg-transparent hover:bg-card/80 text-foreground border border-border/40 h-16 rounded-2xl font-bold"
                                        >
                                           Cancelar
                                        </Button>
                                        <Button 
                                          onClick={handleAddStaff}
                                          disabled={saving}
                                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-16 rounded-2xl font-bold shadow-xl shadow-primary/20"
                                        >
                                           {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Crear Cuenta"}
                                        </Button>
                                     </div>
                                  </div>
                               </motion.div>
                            </div>
                          )}
                       </AnimatePresence>
                    </motion.div>
                  ) : activeTab === 'billing' ? (
                    <motion.div key="billing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12 relative z-10">
                       <section className="space-y-8">
                          <div className="flex items-center gap-4 border-b border-border/40 pb-6">
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Coins className="w-6 h-6" />
                             </div>
                             <h3 className="text-3xl font-serif font-medium italic text-foreground tracking-tight">Finanzas y Moneda</h3>
                          </div>
                          
                          <div className="max-w-md space-y-4">
                             <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Divisa Principal</label>
                             <div className="relative">
                                <select
                                  value={formData.currency}
                                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                  className="w-full bg-card/40 border border-border/40 h-20 rounded-2xl px-8 font-serif italic text-2xl text-foreground appearance-none focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                >
                                  <option value="USD">USD - Dólares</option>
                                  <option value="ARS">ARS - Pesos Argentinos</option>
                                  <option value="EUR">EUR - Euros</option>
                                  <option value="MXN">MXN - Pesos Mexicanos</option>
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                   <ChevronRight className="w-6 h-6 rotate-90" />
                                </div>
                             </div>
                             <p className="text-sm text-muted-foreground font-light italic px-2">Esta divisa se aplicará automáticamente a todos los nuevos pagos y reportes.</p>
                          </div>
                       </section>

                       <div className="p-8 bg-primary/5 rounded-[40px] border border-primary/20 flex flex-col sm:flex-row gap-8 items-center text-center sm:text-left">
                          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-[24px] flex items-center justify-center shrink-0 shadow-2xl shadow-primary/30">
                             <Bell className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="font-serif text-xl italic mb-1">Automatización Próxima</p>
                            <p className="text-sm text-muted-foreground font-light leading-relaxed">
                              Estamos integrando notificaciones automáticas por WhatsApp para alumnos con cuotas pendientes.
                            </p>
                          </div>
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div key="coming-soon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center">
                       <div className="w-24 h-24 bg-card/40 rounded-[40px] flex items-center justify-center mb-8 border border-border/40 shadow-inner">
                          <Settings className="w-12 h-12 text-muted-foreground/20 animate-spin-slow" />
                       </div>
                       <h3 className="text-2xl font-serif italic text-muted-foreground/40">Módulo en Desarrollo</h3>
                       <p className="text-[10px] text-muted-foreground/20 mt-4 uppercase font-black tracking-[0.4em]">Sahara OS v1.2</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer de Acciones - Flotante o Fijo al panel */}
                <div className="mt-16 pt-10 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-6 relative z-30">
                   <div className="min-h-[48px]">
                      <AnimatePresence>
                         {message && (
                            <motion.div 
                               initial={{ opacity: 0, x: -20 }} 
                               animate={{ opacity: 1, x: 0 }} 
                               exit={{ opacity: 0, x: 20 }} 
                               className={cn(
                                 "flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold tracking-tight shadow-xl", 
                                 message.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                               )}
                            >
                               <CheckCircle2 className="w-5 h-5" /> {message.text}
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                   
                   {activeTab !== 'staff' && (
                     <Button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-14 h-20 rounded-[28px] font-bold text-xl shadow-2xl shadow-primary/30 active:scale-[0.97] transition-all flex items-center gap-4 group min-w-[280px]"
                     >
                        {saving ? (
                           <Loader2 className="w-7 h-7 animate-spin" />
                        ) : (
                           <>
                             <Save className="w-6 h-6 group-hover:scale-110 transition-transform" /> 
                             Guardar Cambios
                           </>
                        )}
                     </Button>
                   )}
                </div>
             </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
