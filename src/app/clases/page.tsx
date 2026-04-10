"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAcademy } from "@/hooks/use-academy";
import { 
  Music, 
  Plus, 
  PlusCircle, 
  Loader2, 
  Trash2, 
  Calendar,
  Layers,
  Users,
  DollarSign,
  CheckCircle2,
  History,
  Info,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  price: number;
}

interface ClassItem {
  id: string;
  name: string;
  teacher_name: string | null;
  schedule: string | null;
  category_id: string | null;
}

export default function ClasesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'categories' | 'classes'>('categories');
   const [search, setSearch] = useState("");
   const [filterCatId, setFilterCatId] = useState("all");
   const [currency, setCurrency] = useState("$");
  
  // Modal/Form States
  const [showCatForm, setShowCatForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  
  const [newCatName, setNewCatName] = useState("");
  const [newCatPrice, setNewCatPrice] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("");
  const [newClassSchedule, setNewClassSchedule] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Use unified academy context
  const { academyId, userId, loading: contextLoading } = useAcademy();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const fetchData = async () => {
    if (!academyId || contextLoading) return;
    setLoading(true);
    try {
      const { data: catData } = await supabase.from('categories').select('*').eq('academy_id', academyId).order('name');
      const { data: classData } = await supabase.from('classes').select('*').eq('academy_id', academyId).order('name');
      const { data: settingsData } = await supabase.from('settings').select('currency').eq('academy_id', academyId).single();
      
      if (catData) setCategories(catData);
      if (classData) setClasses(classData);
      if (settingsData?.currency) setCurrency(settingsData.currency);
    } catch (err) {
      console.error("Error fetching clases data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                         c.teacher_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCatId === "all" || c.category_id === filterCatId;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (academyId && !contextLoading) {
      fetchData();
    }
  }, [academyId, contextLoading]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name: newCatName,
      price: parseFloat(newCatPrice) || 0,
      academy_id: academyId
    };

    let error;
    if (editingCategory) {
      const res = await supabase.from('categories').update(payload).eq('id', editingCategory.id);
      error = res.error;
    } else {
      const res = await supabase.from('categories').insert([payload]);
      error = res.error;
    }

    if (!error) {
      setNewCatName("");
      setNewCatPrice("");
      setEditingCategory(null);
      setShowCatForm(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name: newClassName, 
      teacher_name: newClassTeacher,
      schedule: newClassSchedule,
      category_id: selectedCatId || null,
      academy_id: academyId
    };

    let error;
    if (editingClass) {
      const res = await supabase.from('classes').update(payload).eq('id', editingClass.id);
      error = res.error;
    } else {
      const res = await supabase.from('classes').insert([payload]);
      error = res.error;
    }

    if (!error) {
      setNewClassName("");
      setNewClassTeacher("");
      setNewClassSchedule("");
      setSelectedCatId("");
      setEditingClass(null);
      setShowClassForm(false);
      fetchData();
    }
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (confirm("¿Borrar categoría? También podrías afectar a las clases asignadas.")) {
      await supabase.from('categories').delete().eq('id', id);
      fetchData();
    }
  };

  const deleteClass = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta clase? Se perderá el historial de inscripciones.")) {
      await supabase.from('classes').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <DashboardShell>
      <div className="p-4 lg:p-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#E67E22] font-bold text-[9px] uppercase tracking-[0.2em] bg-[#E67E22]/10 px-2.5 py-1 rounded-full border border-[#E67E22]/5">
                <Music className="w-2.5 h-2.5 inline mr-1" /> Oferta Académica
              </span>
            </div>
            <h1 className="text-4xl font-serif font-black text-foreground tracking-tight">Clases y Disciplinas</h1>
            <p className="text-foreground/60 font-medium mt-1">Configura tus categorías de enseñanza y precios mensuales.</p>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => {
                setEditingCategory(null);
                setNewCatName("");
                setNewCatPrice("");
                setShowCatForm(!showCatForm);
                setShowClassForm(false);
              }}
              className={cn(
                "gap-2 h-12 px-6 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
                showCatForm ? "bg-secondary text-foreground" : "bg-card text-foreground border border-border hover:bg-secondary/20"
              )}
            >
              <Layers className="w-4 h-4" /> Nueva Categoría
            </Button>
            <Button 
              onClick={() => {
                setEditingClass(null);
                setNewClassName("");
                setNewClassTeacher("");
                setNewClassSchedule("");
                setSelectedCatId("");
                setShowClassForm(!showClassForm);
                setShowCatForm(false);
              }}
              className="gap-2 h-12 px-6 rounded-2xl bg-[#E67E22] hover:bg-[#D35400] text-white font-bold transition-all shadow-lg shadow-[#E67E22]/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Crear Clase
            </Button>
          </div>
        </header>

        {/* Forms Section */}
        <div className="space-y-6 mb-10">
          <AnimatePresence>
            {showCatForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-card p-8 rounded-[32px] shadow-warm border border-border overflow-hidden"
              >
                <h3 className="text-2xl font-serif font-bold mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Layers className="w-6 h-6 text-[#E67E22]" /> 
                     {editingCategory ? "Editar Categoría" : "Configurar Nueva Categoría"}
                  </div>
                </h3>
                <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Nombre de la Categoría</label>
                    <input 
                      required placeholder="Ej: Piano / Yoga / Danza"
                      value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:opacity-30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Precio Mensual ({currency})</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">$</span>
                      <input 
                        type="number"
                        required placeholder="0.00"
                        value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)}
                        className="w-full bg-background border border-border rounded-2xl pl-10 pr-5 py-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={saving} type="submit" className="flex-1 h-14 rounded-2xl bg-primary text-white font-bold gap-2">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar"}
                    </Button>
                    <Button type="button" onClick={() => setShowCatForm(false)} className="h-14 w-14 rounded-2xl bg-card border border-border text-foreground p-0"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </form>
              </motion.div>
            )}

            {showClassForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-card p-8 rounded-[32px] shadow-warm border border-border overflow-hidden"
              >
                <h3 className="text-2xl font-serif font-bold mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Music className="w-6 h-6 text-[#E67E22]" /> 
                    {editingClass ? `Editando: ${editingClass.name}` : "Nueva Clase / Taller"}
                  </div>
                </h3>
                <form onSubmit={handleAddClass} className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Nombre de Clase</label>
                    <input 
                      required placeholder="Clase de Piano I"
                      value={newClassName} onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Profesor</label>
                    <input 
                      placeholder="Prof. García"
                      value={newClassTeacher} onChange={(e) => setNewClassTeacher(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Horario</label>
                    <input 
                      placeholder="Lunes y Miércoles 18hs"
                      value={newClassSchedule} onChange={(e) => setNewClassSchedule(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Categoría</label>
                    <select 
                      required
                      className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 outline-none h-[51px] appearance-none cursor-pointer"
                      value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23847365' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-3">
                    <Button type="button" onClick={() => setShowClassForm(false)} className="bg-card border border-border text-foreground hover:bg-secondary/20 px-8 h-14 rounded-2xl font-bold transition-all shadow-sm">Cancelar</Button>
                    <Button disabled={saving} type="submit" className="bg-foreground text-background hover:brightness-110 px-10 h-14 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingClass ? "Guardar Cambios" : "Crear Clase"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Lists */}
        {/* Categories Section (Now at Top) */}
        <section className="mb-12 bg-card/30 p-8 rounded-[32px] border border-border">
           <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60 mb-6 flex items-center gap-2">
             <Layers className="w-3 h-3 text-primary" /> Gestión de Categorías ({categories.length})
           </h4>
           <div className="flex flex-wrap gap-4">
             {categories.length === 0 && !loading && <p className="text-[#847365]/40 italic text-sm ml-1">No hay categorías configuradas.</p>}
             {categories.map(cat => (
               <div 
                 key={cat.id} 
                 className={cn(
                   "group transition-all shadow-sm flex items-center px-6 py-4 gap-5 rounded-[24px] border-2",
                   filterCatId === cat.id 
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-secondary/10 border-border hover:border-primary/50 hover:shadow-md"
                 )}
               >
                  <div 
                    className="cursor-pointer flex flex-col min-w-[100px]"
                    onClick={() => setFilterCatId(filterCatId === cat.id ? 'all' : cat.id)}
                  >
                    <span className={cn(
                      "font-bold text-sm block leading-tight mb-0.5 transition-colors",
                      filterCatId === cat.id ? "text-white" : "text-foreground"
                    )}>{cat.name}</span>
                    <span className={cn(
                      "font-black text-xs transition-colors",
                      filterCatId === cat.id ? "text-white/80" : "text-primary"
                    )}>{currency} {cat.price.toLocaleString()}</span>
                  </div>
                  <div className={cn(
                    "flex gap-1 border-l pl-3 transition-colors",
                    filterCatId === cat.id ? "border-white/20" : "border-border"
                  )}>
                    <button 
                      onClick={() => {
                        setEditingCategory(cat);
                        setNewCatName(cat.name);
                        setNewCatPrice(cat.price.toString());
                        setShowCatForm(true);
                        setShowClassForm(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        filterCatId === cat.id ? "text-white hover:bg-white/10" : "text-primary hover:bg-primary/5"
                      )}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteCategory(cat.id)} 
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        filterCatId === cat.id ? "text-white hover:bg-white/10" : "text-red-500 hover:bg-red-500/5"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>
             ))}
           </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-t border-border pt-10">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 flex items-center gap-2">
              <Music className="w-3" /> Académico ({filteredClasses.length})
            </h4>
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex-1 md:w-80 relative">
                <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                <input 
                  placeholder="Buscar clase o profesor..." 
                  className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button 
                variant="outline"
                onClick={() => setFilterCatId('all')}
                className={cn(
                  "rounded-2xl text-[10px] font-black uppercase tracking-widest h-12 px-6",
                  filterCatId === 'all' && "bg-foreground text-background hover:brightness-110"
                )}
              >
                Todas las Clases
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 opacity-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#E67E22] mb-4" />
              <p className="font-serif italic">Sincronizando academia...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="bg-card/50 p-20 rounded-[40px] border-2 border-dashed border-border text-center">
               <Music className="w-12 h-12 text-foreground/5 mx-auto mb-4" />
               <p className="text-foreground/40 font-serif italic text-lg">{search || filterCatId !== 'all' ? "No se encontraron clases con esos filtros." : "Todavía no has creado ninguna clase."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
              {filteredClasses.map(cls => (
                <motion.div 
                  layout
                  key={cls.id} 
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-primary p-7 rounded-[40px] group relative overflow-hidden shadow-warm-lg transition-all duration-500 border border-white/20"
                >
                  {/* Decorative Sparkle Background */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-white border border-white/30">
                      <Layers className="w-3 h-3" /> {categories.find(c => c.id === cls.category_id)?.name || 'Sin Categoría'}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingClass(cls);
                          setNewClassName(cls.name);
                          setNewClassTeacher(cls.teacher_name || "");
                          setNewClassSchedule(cls.schedule || "");
                          setSelectedCatId(cls.category_id || "");
                          setShowClassForm(true);
                          setShowCatForm(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-primary transition-all transform hover:rotate-12"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteClass(cls.id)}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-red-500 transition-all transform hover:-rotate-12"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 min-h-[64px] mb-8">
                    <h3 className="text-2xl font-serif font-bold text-white leading-tight">{cls.name}</h3>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 group-hover:bg-white/20 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-lg">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">Profesor</p>
                        <span className="text-sm font-bold text-white truncate block">{cls.teacher_name || 'Sin asignar'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 group-hover:bg-white/20 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">Horario</p>
                        <span className="text-sm font-medium text-white/90 truncate block italic">{cls.schedule || 'A confirmar'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Background musical note decoration */}
                  <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-125">
                    <Music className="w-32 h-32 text-white" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

