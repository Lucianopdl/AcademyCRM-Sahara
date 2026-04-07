"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
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
import { motion } from "framer-motion";

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
  const [currency, setCurrency] = useState("$");
  
  // Modal/Form States
  const [showCatForm, setShowCatForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatPrice, setNewCatPrice] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("");
  const [newClassSchedule, setNewClassSchedule] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from('categories').select('*').order('name');
    const { data: classData } = await supabase.from('classes').select('*').order('name');
    const { data: settingsData } = await supabase.from('settings').select('currency').single();
    
    if (catData) setCategories(catData);
    if (classData) setClasses(classData);
    if (settingsData?.currency) setCurrency(settingsData.currency);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name: newCatName,
      price: parseFloat(newCatPrice) || 0
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
    const { error } = await supabase.from('classes').insert([{ 
      name: newClassName, 
      teacher_name: newClassTeacher,
      schedule: newClassSchedule,
      category_id: selectedCatId || null
    }]);
    if (!error) {
      setNewClassName("");
      setNewClassTeacher("");
      setNewClassSchedule("");
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

  return (
    <div className="flex bg-[#FDFCFB] min-h-screen text-[#2D241E]">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#E67E22] font-bold text-[9px] uppercase tracking-[0.2em] bg-[#E67E22]/10 px-2.5 py-1 rounded-full border border-[#E67E22]/5">
                <Music className="w-2.5 h-2.5 inline mr-1" /> Oferta Académica
              </span>
            </div>
            <h1 className="text-4xl font-serif font-bold text-[#2D241E] tracking-tight">Clases y Disciplinas</h1>
            <p className="text-[#847365] font-medium opacity-80 mt-1">Configura tus categorías de enseñanza y precios mensuales.</p>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => {
                setEditingCategory(null);
                setNewCatName("");
                setNewCatPrice("");
                setShowCatForm(!showCatForm);
              }}
              className={cn(
                "gap-2 h-12 px-6 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
                showCatForm ? "bg-[#847365] text-white" : "bg-white text-[#847365] border border-[#847365]/10 hover:bg-[#F5F1EE]"
              )}
            >
              <Layers className="w-4 h-4" /> Nueva Categoría
            </Button>
            <Button 
              onClick={() => setShowClassForm(!showClassForm)}
              className="gap-2 h-12 px-6 rounded-2xl bg-[#E67E22] hover:bg-[#D35400] text-white font-bold transition-all shadow-lg shadow-[#E67E22]/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Crear Clase
            </Button>
          </div>
        </header>

        {/* Forms Section */}
        <div className="space-y-6 mb-10">
          {showCatForm && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#F5F1EE] p-8 rounded-[32px] shadow-warm border border-[#847365]/5"
            >
              <h3 className="text-2xl font-serif font-bold mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Layers className="w-6 h-6 text-[#E67E22]" /> 
                   {editingCategory ? "Editar Categoría" : "Configurar Nueva Categoría"}
                </div>
                {editingCategory && (
                  <button 
                    onClick={() => {
                      setEditingCategory(null);
                      setNewCatName("");
                      setNewCatPrice("");
                      setShowCatForm(false);
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#E74C3C] hover:underline"
                  >
                    Cancelar Edición
                  </button>
                )}
              </h3>
              <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#847365] ml-1">Nombre de la Categoría</label>
                  <input 
                    required placeholder="Ej: Piano / Yoga / Danza"
                    value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#E67E22]/20 outline-none transition-all placeholder:opacity-30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#847365] ml-1">Precio Mensual ({currency})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#E67E22]">$</span>
                    <input 
                      type="number"
                      required placeholder="0.00"
                      value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)}
                      className="w-full bg-white rounded-2xl pl-10 pr-5 py-4 focus:ring-2 focus:ring-[#E67E22]/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <Button disabled={saving} type="submit" className="w-full h-14 rounded-2xl bg-[#2D241E] hover:bg-black text-white font-bold gap-2">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Guardar</>}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {showClassForm && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#F5F1EE] p-8 rounded-[32px] shadow-warm border border-[#847365]/5"
            >
              <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3">
                <Music className="w-6 h-6 text-[#E67E22]" /> Nueva Clase / Taller
              </h3>
              <form onSubmit={handleAddClass} className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#847365] ml-1">Nombre de Clase</label>
                  <input 
                    required placeholder="Clase de Piano I"
                    value={newClassName} onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full bg-white rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#E67E22]/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#847365] ml-1">Profesor</label>
                  <input 
                    placeholder="Prof. García"
                    value={newClassTeacher} onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full bg-white rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#E67E22]/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#847365] ml-1">Horario</label>
                  <input 
                    placeholder="Lunes y Miércoles 18hs"
                    value={newClassSchedule} onChange={(e) => setNewClassSchedule(e.target.value)}
                    className="w-full bg-white rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#E67E22]/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#847365] ml-1">Categoría</label>
                  <select 
                    required
                    className="w-full bg-white rounded-2xl px-5 py-3.5 outline-none h-[51px] appearance-none cursor-pointer"
                    value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23847365' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                  >
                    <option value="">Seleccionar Categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button disabled={saving} type="submit" className="bg-[#2D241E] hover:bg-black text-white px-10 h-14 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear Clase"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        {/* Content Lists */}
        <div className="grid lg:grid-cols-4 gap-10">
          {/* Categories Sidebar List */}
          <div className="lg:col-span-1 space-y-4">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#847365]/60 mb-6 flex items-center gap-2">
               <Layers className="w-3" /> Categorías y Precios ({categories.length})
             </h4>
             {categories.length === 0 && !loading && <p className="text-[#847365]/40 italic text-sm ml-1">No hay categorías configuradas.</p>}
             {categories.map(cat => (
               <div key={cat.id} className="bg-white border border-[#847365]/5 p-5 rounded-[24px] group hover:border-[#E67E22]/20 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-serif font-bold text-[#2D241E] text-lg block">{cat.name}</span>
                      <span className="text-[#E67E22] font-black text-sm">{currency} {cat.price.toLocaleString()} <span className="text-[10px] text-[#847365]/40 uppercase tracking-widest">/ mes</span></span>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCatName(cat.name);
                          setNewCatPrice(cat.price.toString());
                          setShowCatForm(true);
                        }} 
                        className="text-[#847365] p-2 hover:bg-[#F5F1EE] rounded-xl transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteCategory(cat.id)} 
                        className="text-[#E74C3C] p-2 hover:bg-[#E74C3C]/5 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
               </div>
             ))}
          </div>

          {/* Classes Grid */}
          <div className="lg:col-span-3 space-y-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#847365]/60 mb-6 flex items-center gap-2">
               <Music className="w-3" /> Listado de Clases Actuales ({classes.length})
             </h4>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 opacity-20">
                <Loader2 className="w-10 h-10 animate-spin text-[#E67E22] mb-4" />
                <p className="font-serif italic">Sincronizando academia...</p>
              </div>
            ) : classes.length === 0 ? (
              <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-[#847365]/10 text-center">
                 <Music className="w-12 h-12 text-[#847365]/10 mx-auto mb-4" />
                 <p className="text-[#847365]/40 font-serif italic text-lg">Todavía no has creado ninguna clase.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {classes.map(cls => (
                  <div key={cls.id} className="bg-white p-8 rounded-[32px] border border-[#847365]/5 group relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform">
                      <Music className="w-20 h-20" />
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5F1EE] rounded-lg text-[9px] font-bold uppercase tracking-widest text-[#847365] mb-4">
                      <Layers className="w-3 h-3" /> {categories.find(c => c.id === cls.category_id)?.name || 'Sin Categoría'}
                    </div>

                    <h3 className="text-2xl font-serif font-bold text-[#2D241E] mb-6">{cls.name}</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E67E22]/5 flex items-center justify-center text-[#E67E22]">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-[#2D241E] uppercase tracking-wider">{cls.teacher_name || 'Sin docente'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#847365]/5 flex items-center justify-center text-[#847365]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-[#847365]">{cls.schedule || 'Horario a definir'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .shadow-warm {
          box-shadow: 0 10px 40px -10px rgba(132, 115, 101, 0.15);
        }
      `}</style>
    </div>
  );
}
