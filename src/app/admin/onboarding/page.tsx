"use client";

import React, { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { 
  ShieldCheck, 
  UserPlus, 
  Building2, 
  KeyRound, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Fingerprint,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Pencil,
  Save,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin"; // Warning: only for logic if we move this to a server action
import { 
  createNewAcademyAction, 
  toggleAcademyStatusAction,
  updateAcademyNameAction,
  deleteAcademyAction,
  getAcademiesWithEmailsAction
} from "./actions";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, credentials?: { email: string, password: string } } | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [managedAcademies, setManagedAcademies] = useState<any[]>([]);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Cargar academias para gestión
  async function fetchAcademies() {
    setLoadingAcademies(true);
    const res = await getAcademiesWithEmailsAction();
    console.log("Academias cargadas:", res);
    if (res.success && res.data) {
      setManagedAcademies(res.data);
    }
    setLoadingAcademies(false);
  }

  // Seguridad: Verificamos que seas vos
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'lucianopdl2401@gmail.com') {
        setIsAuthorized(true);
        fetchAcademies();
      } else {
        setIsAuthorized(false);
      }
    }
    checkAuth();
  }, []);

  async function handleToggleStatus(academyId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await toggleAcademyStatusAction(academyId, newStatus);
    if (res.success) {
      fetchAcademies();
    } else {
      alert("Error: " + res.message);
    }
  }

  async function handleUpdateName(id: string) {
    if (!editName.trim()) return;
    const res = await updateAcademyNameAction(id, editName);
    if (res.success) {
      setEditingId(null);
      fetchAcademies();
    } else {
      alert("Error: " + res.message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (window.confirm(`¿Estás SEGURO de eliminar la academia '${name}'? Esta acción borrará TODOS los datos asociados y no se puede deshacer.`)) {
      const res = await deleteAcademyAction(id);
      if (res.success) {
        fetchAcademies();
      } else {
        alert("Error: " + res.message);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    const result = await createNewAcademyAction(formData);

    if (result.success) {
      setStatus({ 
        type: 'success', 
        message: result.message,
        credentials: result.credentials
      });
      (e.target as HTMLFormElement).reset();
      fetchAcademies(); // Recargar lista
    } else {
      setStatus({ type: 'error', message: result.message });
    }
    setLoading(false);
  }

  if (isAuthorized === false) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F1EE] p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-3xl font-serif font-bold text-[#2D241E]">Acceso Denegado</h1>
          <p className="text-[#847365]">Esta sección es exclusiva para el Administrador Central de Sistemas Norte.</p>
          <Button onClick={() => window.location.href = '/'} className="bg-[#2D241E] text-white rounded-2xl px-10 h-14">Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isAuthorized === null) return null;

  return (
    <DashboardShell>
      <div className="p-4 lg:p-12 max-w-5xl mx-auto min-h-screen flex flex-col justify-center">
        <header className="mb-12 text-center lg:text-left flex flex-col lg:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-[#E67E22]/10 rounded-2xl flex items-center justify-center text-[#E67E22] shadow-sm">
            <Fingerprint className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#E67E22]" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#847365]">Super Admin Panel</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-serif font-bold text-[#111]">Alta de Nueva Academia</h1>
            <p className="text-[#847365] font-medium mt-2">Provisionamiento automatizado de infraestructura SaaS para nuevos clientes.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-white p-10 rounded-[48px] shadow-warm border border-[#847365]/5"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 pl-2 flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Nombre de la Academia
                  </label>
                  <input 
                    name="academyName"
                    required
                    placeholder="Ej: Sahara Danzas, Academia Central..."
                    className="w-full h-16 bg-[#F5F1EE]/50 border-none rounded-3xl px-6 text-lg font-bold focus:ring-4 focus:ring-[#E67E22]/10 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 pl-2 flex items-center gap-2">
                      <UserPlus className="w-3 h-3" /> Email del Administrador
                    </label>
                    <input 
                      name="adminEmail"
                      type="email"
                      required
                      placeholder="email@cliente.com"
                      className="w-full h-14 bg-[#F5F1EE]/50 border-none rounded-2xl px-6 font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 pl-2 flex items-center gap-2">
                      <KeyRound className="w-3 h-3" /> Contraseña Temporal
                    </label>
                    <input 
                      name="adminPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full h-14 bg-[#F5F1EE]/50 border-none rounded-2xl px-6 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 pl-2">Categoría / Rubro</label>
                  <select name="category" className="w-full h-14 bg-[#F5F1EE]/50 border-none rounded-2xl px-6 font-bold outline-none appearance-none cursor-pointer">
                    <option value="Danzas">Escuela de Danzas</option>
                    <option value="Gimnasio">Gimnasio o Fitness</option>
                    <option value="Idiomas">Instituto de Idiomas</option>
                    <option value="Musica">Escuela de Música</option>
                    <option value="General">Gestión General</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  disabled={loading}
                  type="submit"
                  className="w-full h-18 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-[32px] font-black text-lg shadow-xl shadow-[#E67E22]/20 active:scale-95 transition-all py-8 flex items-center gap-3"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-6 h-6" /> <span>CREAR INFRAESTRUCTURA</span></>}
                </Button>
              </div>

              <AnimatePresence>
                {status && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "p-8 rounded-[32px] border transition-all duration-500 shadow-xl",
                      status.type === 'success' 
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 backdrop-blur-sm" 
                        : "bg-red-50 border-red-200 text-red-800"
                    )}
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        status.type === 'success' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                      )}>
                        {status.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-lg tracking-tight leading-tight">{status.message}</p>
                        <p className="text-sm opacity-60 font-medium">Provisionamiento completado correctamente.</p>
                      </div>
                    </div>

                    {status.type === 'success' && status.credentials && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/80 border border-emerald-200 rounded-3xl p-6 space-y-4 shadow-inner"
                      >
                        <div className="flex items-center gap-3 border-b border-emerald-100 pb-3">
                          <KeyRound className="w-5 h-5 text-emerald-600" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700">Credenciales de Acceso</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-tighter text-emerald-800/40 ml-1">Usuario / Email</label>
                            <div className="bg-emerald-50 px-4 py-3 rounded-xl font-mono text-sm font-bold flex items-center justify-between border border-emerald-100/50">
                              <span className="truncate mr-2">{status.credentials.email}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(status.credentials?.email || '');
                                  alert("Email copiado");
                                }}
                                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-tighter text-emerald-800/40 ml-1">Contraseña</label>
                            <div className="bg-emerald-50 px-4 py-3 rounded-xl font-mono text-sm font-bold flex items-center justify-between border border-emerald-100/50">
                              <span>{status.credentials.password}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(status.credentials?.password || '');
                                  alert("Contraseña copiada");
                                }}
                                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-500/10 p-3 rounded-xl flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <p className="text-[10px] font-bold text-emerald-700 leading-tight">
                            Asegurate de guardar estos datos. Por seguridad, no se volverán a mostrar.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#2D241E] p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-serif font-bold mb-4">¿Qué pasará al crear?</h3>
                <ul className="space-y-4 text-sm text-white/70">
                  <li className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">1</div> Se crea el usuario en Auth con bypass de verificación.</li>
                  <li className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">2</div> Se reserva un nuevo ID único de academia.</li>
                  <li className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">3</div>Se inyecta la llave RLS en el perfil para aislamiento absoluto.</li>
                  <li className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">4</div> El cliente verá su nombre y rubro al entrar.</li>
                </ul>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            </div>
            
            <div className="bg-[#E67E22]/5 p-8 rounded-[40px] border border-[#E67E22]/10 transition-all hover:bg-[#E67E22]/10 group">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#E67E22] mb-2">Consejo de Venta</h4>
              <p className="text-sm text-[#847365] font-medium leading-relaxed">Podes cobrar el "derecho de piso" o "configuración inicial", ya que este proceso provisiona un espacio 100% privado en tu servidor.</p>
            </div>
          </div>
        </div>

        {/* LISTADO DE ACADEMIAS EXISTENTES */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 bg-white rounded-[48px] shadow-warm border border-[#847365]/5 p-10"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#111]">Cartera de Clientes</h2>
              <p className="text-[#847365] text-sm">Gestioná el acceso y estado de tus academias activas.</p>
            </div>
            <div className="bg-[#F5F1EE] px-6 py-3 rounded-2xl">
              <span className="text-xl font-black text-[#2D241E]">{managedAcademies.length}</span>
              <span className="ml-2 text-[10px] uppercase font-bold text-[#847365]">Academias Totales</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F5F1EE]">
                  <th className="pb-4 text-left text-[10px] font-black uppercase text-[#847365]/50 px-4">Academia</th>
                  <th className="pb-4 text-left text-[10px] font-black uppercase text-[#847365]/50 px-4">Admin Email</th>
                  <th className="pb-4 text-left text-[10px] font-black uppercase text-[#847365]/50 px-4">Estado</th>
                  <th className="pb-4 text-left text-[10px] font-black uppercase text-[#847365]/50 px-4">Fecha Alta</th>
                  <th className="pb-4 text-right text-[10px] font-black uppercase text-[#847365]/50 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F1EE]">
                {loadingAcademies ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E67E22]" /></td></tr>
                ) : managedAcademies.map((academy) => (
                  <tr key={academy.id} className="group transition-colors hover:bg-[#F5F1EE]/30">
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm",
                          academy.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        )}>
                          {academy.name.charAt(0)}
                        </div>
                        {editingId === academy.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-[#F5F1EE] border-none rounded-lg px-3 py-2 text-sm font-bold w-48 outline-none ring-2 ring-[#E67E22]"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateName(academy.id)} className="text-emerald-600 hover:text-emerald-700"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-500"><XCircle className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <span className="font-bold text-[#2D241E]">{academy.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <span className="text-xs font-bold text-[#847365] break-all">{academy.adminEmail}</span>
                    </td>
                    <td className="py-6 px-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        academy.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", academy.status === 'active' ? "bg-emerald-500" : "bg-red-500")} />
                        {academy.status === 'active' ? 'Activa' : 'Suspendida'}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <span className="text-xs text-[#847365] font-medium">
                        {new Date(academy.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId !== academy.id && (
                          <button 
                            onClick={() => { setEditingId(academy.id); setEditName(academy.name); }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar nombre"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <Button
                          onClick={() => handleToggleStatus(academy.id, academy.status)}
                          className={cn(
                            "h-9 px-3 rounded-xl font-bold text-[11px] transition-all flex items-center gap-2 shadow-sm",
                            academy.status === 'active' 
                              ? "bg-white border border-red-200 text-red-500 hover:bg-red-50" 
                              : "bg-[#2D241E] text-white hover:bg-black"
                          )}
                        >
                          {academy.status === 'active' ? <><Lock className="w-3 h-3" /> Suspender</> : <><Unlock className="w-3 h-3" /> Activar</>}
                        </Button>
                        <button 
                          onClick={() => handleDelete(academy.id, academy.name)}
                          className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors ml-1"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
