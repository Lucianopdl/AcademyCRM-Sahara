"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  IdCard,
  MapPin,
  CalendarDays,
  Cake,
  DollarSign,
  Wallet,
  Pencil,
  Archive,
  ArchiveRestore,
  Ticket,
  AlertCircle,
  Tag,
  Calculator,
  Gift,
  User,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  birthdate: string | null;
  age: number | null;
  address: string | null;
  status: 'active' | 'inactive' | 'on_hold';
  enrollment_date: string;
  category_id: string | null;
  discount_value: number;
  discount_type: 'percentage' | 'fixed';
}

interface Category {
  id: string;
  name: string;
  price: number;
}

interface Payment {
  id: string;
  student_id: string;
  period_month: number;
  period_year: number;
}

export default function AlumnosPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [hasPromo, setHasPromo] = useState(false);
  
  // Student Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    dni: "",
    birthdate: "",
    age: "",
    address: "",
    category_id: "",
    discount_value: "0",
    discount_type: "percentage"
  });

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "cash",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ""
  });

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (studentsData) setStudents(studentsData);

    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (catData) setCategories(catData);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const { data: payData } = await supabase
      .from('payments')
      .select('id, student_id, period_month, period_year')
      .eq('period_month', currentMonth)
      .eq('period_year', currentYear);
    
    if (payData) setPayments(payData);

    setLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      full_name: formData.full_name, 
      email: formData.email || null, 
      phone: formData.phone || null,
      dni: formData.dni || null,
      birthdate: formData.birthdate || null,
      age: formData.age ? parseInt(formData.age) : null,
      address: formData.address || null,
      category_id: formData.category_id || null,
      discount_value: hasPromo ? (parseFloat(formData.discount_value) || 0) : 0,
      discount_type: formData.discount_type,
      status: 'active'
    };

    let error;
    if (editingStudent) {
      const res = await supabase.from('students').update(payload).eq('id', editingStudent.id);
      error = res.error;
    } else {
      const res = await supabase.from('students').insert([payload]);
      error = res.error;
    }
    
    if (!error) {
      setFormData({
        full_name: "", email: "", phone: "", dni: "", birthdate: "", age: "", address: "", category_id: "", discount_value: "0", discount_type: "percentage"
      });
      setHasPromo(false);
      setEditingStudent(null);
      setShowAddForm(false);
      fetchInitialData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('payments')
      .insert([
        {
          student_id: selectedStudent.id,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.method,
          period_month: paymentData.month,
          period_year: paymentData.year,
          notes: paymentData.notes || null,
          payment_date: new Date().toISOString()
        }
      ]);
    
    if (!error) {
      setShowPaymentPanel(false);
      setSelectedStudent(null);
      fetchInitialData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  };

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'inactive') => {
    const { error } = await supabase.from('students').update({ status: newStatus }).eq('id', studentId);
    if (!error) fetchInitialData();
  };

  const calculateFinalPrice = () => {
    const category = categories.find(c => c.id === formData.category_id);
    if (!category) return null;
    
    let price = category.price;
    if (hasPromo) {
      const val = parseFloat(formData.discount_value) || 0;
      if (formData.discount_type === 'percentage') {
        price = price * (1 - val / 100);
      } else {
        price = Math.max(0, price - val);
      }
    }
    return price;
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setHasPromo(student.discount_value > 0);
    setFormData({
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      dni: student.dni || "",
      birthdate: student.birthdate || "",
      age: student.age?.toString() || "",
      address: student.address || "",
      category_id: student.category_id || "",
      discount_value: student.discount_value?.toString() || "0",
      discount_type: student.discount_type || "percentage"
    });
    setShowAddForm(true);
  };

  const openPayment = (student: Student) => {
    setSelectedStudent(student);
    const category = categories.find(c => c.id === student.category_id);
    let amount = category ? category.price : 0;
    if (student.discount_value > 0) {
      if (student.discount_type === 'percentage') amount *= (1 - student.discount_value / 100);
      else amount = Math.max(0, amount - student.discount_value);
    }
    setPaymentData({...paymentData, amount: amount.toFixed(2), month: new Date().getMonth() + 1, year: new Date().getFullYear()});
    setShowPaymentPanel(true);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || 
                         (s.dni?.includes(search));
    const matchesStatus = s.status === activeTab;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex bg-[#FDFCFB] min-h-screen text-[#2D241E] font-sans selection:bg-primary/20">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#2D241E] tracking-tight">Gestión de Alumnos</h1>
            <p className="text-[#847365] font-medium opacity-80 mt-1">Legajos individuales y control administrativo.</p>
          </div>
          <Button 
            onClick={() => {
              if (showAddForm) {
                setEditingStudent(null);
                setHasPromo(false);
                setFormData({ full_name: "", email: "", phone: "", dni: "", birthdate: "", age: "", address: "", category_id: "", discount_value: "0", discount_type: "percentage" });
              }
              setShowAddForm(!showAddForm);
            }}
            className={cn("gap-2 px-8 h-14 rounded-3xl font-bold transition-all shadow-lg active:scale-95", showAddForm ? "bg-[#847365] text-white" : "bg-[#E67E22] hover:bg-[#D35400] text-white shadow-[#E67E22]/20")}
          >
            {showAddForm ? "Cerrar Panel" : <><Plus className="w-5 h-5" /> Inscribir Alumno</>}
          </Button>
        </header>

        <AnimatePresence>
          {showPaymentPanel && selectedStudent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D241E]/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#F5F1EE] w-full max-w-xl rounded-[40px] shadow-2xl p-10 border border-white/40">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#E67E22] text-white flex items-center justify-center font-serif font-bold text-xl shadow-lg ring-4 ring-white/20">{selectedStudent.full_name.charAt(0)}</div>
                      <div>
                        <h3 className="text-2xl font-serif font-bold text-[#2D241E]">Cobrar Cuota</h3>
                        <p className="text-[#847365] font-medium text-sm opacity-80">{selectedStudent.full_name}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowPaymentPanel(false)}><XCircle className="w-6 h-6 text-[#847365]/40 hover:text-[#E74C3C]" /></button>
                  </div>
                  <form onSubmit={handleSavePayment} className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2"><label className="text-[10px] font-bold uppercase tracking-widest text-[#847365]/60">Monto a Cobrar ($)</label>
                      <input type="number" required value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} className="w-full h-16 bg-white border-none rounded-3xl px-6 text-2xl font-black text-[#2D241E] focus:ring-4 focus:ring-[#E67E22]/10 shadow-inner" />
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-widest text-[#847365]/60">Periodo</label>
                      <select value={paymentData.month} onChange={(e) => setPaymentData({...paymentData, month: parseInt(e.target.value)})} className="w-full h-14 bg-white border-none rounded-2xl px-5 font-bold">{months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-widest text-[#847365]/60">Método</label>
                      <select value={paymentData.method} onChange={(e) => setPaymentData({...paymentData, method: e.target.value})} className="w-full h-14 bg-white border-none rounded-2xl px-5 font-bold"><option value="cash">Efectivo</option><option value="transfer">Transferencia</option></select>
                    </div>
                    <Button disabled={saving} type="submit" className="col-span-2 w-full bg-[#E67E22] text-white h-16 rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-all">Confirmar Pago</Button>
                  </form>
              </motion.div>
            </motion.div>
          )}

          {showAddForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white border border-[#847365]/10 p-10 rounded-[48px] shadow-warm mb-10">
              <div className="flex items-center gap-4 mb-10 border-b border-[#847365]/5 pb-6">
                <div className="w-12 h-12 bg-[#2D241E] rounded-2xl flex items-center justify-center text-white"><User className="w-6 h-6" /></div>
                <div>
                    <h3 className="text-2xl font-serif font-bold">{editingStudent ? `Editar Legajo: ${editingStudent.full_name}` : "Ficha de Inscripción"}</h3>
                    <p className="text-xs text-[#847365] font-medium opacity-60">Completá todos los campos para el legajo oficial.</p>
                </div>
              </div>
              
              <form onSubmit={handleAddStudent} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {/* Bloque 1: Identidad */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2"><IdCard className="w-4 h-4 text-[#E67E22]" /><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]">Identidad</h4></div>
                    <div className="space-y-3">
                        <input required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#E67E22]/20 font-bold" placeholder="Nombre y Apellido" />
                        <div className="grid grid-cols-2 gap-3">
                           <input required value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-xl px-4 py-3 font-medium placeholder:text-[#847365]/40" placeholder="DNI" />
                           <input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-xl px-4 py-3 font-medium text-center placeholder:text-[#847365]/40" placeholder="Edad" />
                        </div>
                        <div className="relative">
                            <CalendarDays className="absolute right-4 top-4 w-4 h-4 text-[#847365]/30 pointer-events-none" />
                            <input type="date" value={formData.birthdate} onChange={(e) => setFormData({...formData, birthdate: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-xl px-4 py-3 font-medium text-[#2D241E]" />
                        </div>
                    </div>
                  </div>

                  {/* Bloque 2: Contacto */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2"><Mail className="w-4 h-4 text-[#E67E22]" /><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]">Contacto & Ubicación</h4></div>
                    <div className="space-y-3">
                        <div className="relative">
                           <Phone className="absolute left-4 top-4 w-4 h-4 text-[#847365]/30" />
                           <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-xl pl-12 pr-4 py-3 font-medium" placeholder="Teléfono / WhatsApp" />
                        </div>
                        <input value={formData.email} type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-xl px-4 py-3 font-medium" placeholder="Correo Electrónico" />
                        <div className="relative">
                            <MapPin className="absolute left-4 top-4 w-4 h-4 text-[#847365]/30" />
                            <input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-[#F5F1EE]/50 border-none rounded-xl pl-12 pr-4 py-3 font-medium" placeholder="Dirección / Barrio" />
                        </div>
                    </div>
                  </div>

                  {/* Bloque 3: Administrativo */}
                  <div className="bg-[#F5F1EE] p-8 rounded-[40px] border-2 border-transparent transition-all space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-[#E67E22]" /><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]">Config de Cuota</h4></div>
                        <select required value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full bg-white border-none rounded-2xl px-5 py-4 font-black shadow-sm mb-4">
                            <option value="">Elegir Disciplina...</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name} (${cat.price})</option>)}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-[#847365]/5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-[#847365]">¿Aplicar Beca / Promo?</span>
                            <button type="button" onClick={() => setHasPromo(!hasPromo)} className={cn("w-10 h-5 rounded-full relative transition-all", hasPromo ? "bg-[#E67E22]" : "bg-[#847365]/20")}><div className={cn("w-3 h-3 bg-white rounded-full absolute top-1 transition-all", hasPromo ? "right-1" : "left-1")} /></button>
                        </div>
                        {hasPromo && (
                           <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                               <div className="flex gap-2">
                                  <input type="number" value={formData.discount_value} onChange={(e) => setFormData({...formData, discount_value: e.target.value})} className="w-2/3 bg-white border-none rounded-xl px-4 py-3 font-bold" />
                                  <select value={formData.discount_type} onChange={(e) => setFormData({...formData, discount_type: e.target.value as any})} className="w-1/3 bg-white border-none rounded-xl px-2 py-3 text-[10px] font-black uppercase tracking-widest"><option value="percentage">%</option><option value="fixed">$</option></select>
                               </div>
                               <div className="p-4 bg-white rounded-2xl flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 leading-none">Precio Final</span>
                                  <span className="text-xl font-black text-[#2D241E] leading-none">${calculateFinalPrice()?.toLocaleString()}</span>
                               </div>
                           </div>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                   <Button disabled={saving} type="submit" className="bg-[#2D241E] hover:bg-[#E67E22] text-white px-16 h-18 rounded-[32px] font-black text-lg shadow-xl transition-all active:scale-95 py-6">
                      {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingStudent ? "Guardar Cambios" : "Confirmar Alta de Alumno")}
                   </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listado Principal */}
        <div className="bg-white rounded-[48px] border border-[#847365]/5 shadow-sm overflow-hidden pb-10">
          <div className="flex flex-col md:flex-row border-b border-[#847365]/5">
            <div className="flex p-4 gap-2">
              <button onClick={() => setActiveTab('active')} className={cn("px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'active' ? "bg-[#2D241E] text-white shadow-xl" : "text-[#847365]/60 hover:bg-[#F5F1EE]")}>Activos</button>
              <button onClick={() => setActiveTab('inactive')} className={cn("px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'inactive' ? "bg-[#847365] text-white shadow-xl" : "text-[#847365]/60 hover:bg-[#F5F1EE]")}>Archivados</button>
            </div>
            <div className="flex-1 p-4 flex items-center gap-5 bg-[#F5F1EE]/20 border-l border-[#847365]/5">
              <Search className="w-5 h-5 text-[#847365]/30" />
              <input placeholder="Buscar por nombre o DNI..." className="bg-transparent border-none focus:outline-none w-full text-[#2D241E] font-medium text-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F1EE]/30"><th className="pl-14 py-6 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Alumno / Clase</th><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Estado de Cuenta</th><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Beneficio</th><th className="pr-14 py-6 text-[10px] font-black uppercase tracking-widest text-[#847365]/40 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-[#847365]/5">
              {loading ? (<tr><td colSpan={4} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#E67E22] mx-auto opacity-40" /></td></tr>) : filteredStudents.map((s) => {
                const isPaid = payments.some(p => p.student_id === s.id);
                return (
                  <tr key={s.id} className="group hover:bg-[#F5F1EE]/30 transition-all">
                    <td className="pl-14 py-8">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-[20px] bg-[#E67E22] text-white flex items-center justify-center font-serif font-bold text-xl">{s.full_name.charAt(0)}</div>
                          <div>
                            <p className="font-serif font-bold text-xl text-[#2D241E]">{s.full_name}</p>
                            <p className="text-[10px] font-black text-[#847365]/40 uppercase tracking-widest">{categories.find(c => c.id === s.category_id)?.name || 'Sin Clase'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       {isPaid ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-green-100"><CheckCircle2 className="w-4 h-4" /> Pagado</span>
                       ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-orange-100"><AlertCircle className="w-4 h-4" /> Pendiente {months[new Date().getMonth()]}</span>
                       )}
                    </td>
                    <td className="px-10 py-8">
                       {s.discount_value > 0 ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100"><Ticket className="w-4 h-4" /> Promo: -{s.discount_value}{s.discount_type === 'percentage' ? '%' : '$'}</div>
                       ) : <span className="text-[10px] font-bold text-[#847365]/20 uppercase tracking-widest">Sin Promo</span>}
                    </td>
                    <td className="pr-14 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                          {s.status === 'active' && <Button onClick={() => openPayment(s)} className="bg-[#2D241E] hover:bg-[#E67E22] text-white h-11 px-6 rounded-2xl font-bold text-[10px] uppercase shadow-lg active:scale-95 transition-all">Cobrar</Button>}
                          <button onClick={() => openEdit(s)} className="w-11 h-11 rounded-2xl border border-[#847365]/10 flex items-center justify-center hover:bg-white text-[#847365]"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleStatusChange(s.id, s.status === 'active' ? 'inactive' : 'active')} className="w-11 h-11 rounded-2xl border border-[#847365]/10 flex items-center justify-center hover:bg-white text-[#847365]">
                             {s.status === 'active' ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && !loading && (
            <div className="py-24 text-center">
              <Users className="w-12 h-12 text-[#847365]/20 mx-auto mb-4" />
              <p className="text-[#847365] font-medium">No se encontraron alumnos en esta sección.</p>
            </div>
          )}
        </div>
      </main>
      <style jsx global>{`
        .shadow-warm { box-shadow: 0 10px 40px -10px rgba(132, 115, 101, 0.12); }
      `}</style>
    </div>
  );
}
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
