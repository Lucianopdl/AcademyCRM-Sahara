"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Search, 
  Filter, 
  TrendingUp, 
  History, 
  Loader2,
  DollarSign,
  Download,
  Calendar,
  XCircle,
  Users,
  Wallet,
  Info,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  category_id: string | null;
  discount_value: number;
  discount_type: 'percentage' | 'fixed';
}

interface Category {
  id: string;
  name: string;
  price: number;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_method: string;
  notes: string | null;
  student_id: string;
  students: {
    full_name: string;
  } | null;
}

export default function PagosPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ""
  });

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch payments
    const { data: payData } = await supabase
      .from('payments')
      .select(`
        *,
        students (
          full_name
        )
      `)
      .order('payment_date', { ascending: false });

    if (payData) {
      setPayments(payData as unknown as PaymentTransaction[]);
      
      const now = new Date();
      const currentMonth = payData.filter(p => {
        const d = new Date(p.payment_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const total = currentMonth.reduce((acc, curr) => acc + Number(curr.amount), 0);
      setMonthlyTotal(total);
    }

    // Fetch students and categories for the modal
    const { data: stuData } = await supabase.from('students').select('*').eq('status', 'active');
    if (stuData) setStudents(stuData);

    const { data: catData } = await supabase.from('categories').select('*');
    if (catData) setCategories(catData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudentId(student.id);
    
    // Auto-calculate amount based on category and discount
    const category = categories.find(c => c.id === student.category_id);
    let amount = category ? category.price : 0;
    
    if (student.discount_value > 0) {
      if (student.discount_type === 'percentage') {
        amount = amount * (1 - student.discount_value / 100);
      } else {
        amount = Math.max(0, amount - student.discount_value);
      }
    }
    
    setPaymentForm(prev => ({
      ...prev,
      amount: amount.toString()
    }));
    setStudentSearch("");
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !paymentForm.amount) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('payments')
      .insert([{
        student_id: selectedStudentId,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        period_month: paymentForm.month,
        period_year: paymentForm.year,
        notes: paymentForm.notes || null,
        payment_date: new Date().toISOString()
      }]);
    
    if (!error) {
      setShowPaymentModal(false);
      setSelectedStudentId("");
      setPaymentForm({
        amount: "",
        method: "cash",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        notes: ""
      });
      fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  };

  const exportToCSV = () => {
    const headers = ["ID", "Alumno", "Monto", "Fecha", "Periodo", "Metodo", "Notas"];
    const rows = payments.map(p => [
      p.id,
      p.students?.full_name || "N/A",
      p.amount,
      p.payment_date,
      `${p.period_month}/${p.period_year}`,
      p.payment_method,
      p.notes || ""
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pagos_academia_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = payments.filter(p => 
    p.students?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="flex bg-[#FDFCFB] min-h-screen text-[#2D241E]">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#2D241E] mb-2 tracking-tight">Finanzas y Cobros</h1>
            <p className="text-[#847365] font-medium opacity-80">Control integral de ingresos y auditoría de transacciones.</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={exportToCSV} variant="outline" className="h-12 px-6 rounded-2xl border-[#847365]/20 text-[#847365] hover:bg-white gap-2 font-bold shadow-sm">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button onClick={() => setShowPaymentModal(true)} className="h-12 px-8 rounded-2xl bg-[#E67E22] hover:bg-[#D35400] text-white gap-2 font-bold shadow-lg shadow-[#E67E22]/20 transition-all active:scale-95">
              <CreditCard className="w-4 h-4" /> Registrar Cobro
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#E67E22] p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Recaudación Mensual</span>
              </div>
              <h2 className="text-6xl font-serif font-bold mb-4 tracking-tighter">${monthlyTotal.toLocaleString('es-AR')}</h2>
              <div className="flex items-center gap-2 opacity-80 text-sm font-bold bg-black/5 w-fit px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4" /> Periodo: {months[new Date().getMonth()]} {new Date().getFullYear()}
              </div>
            </div>
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <DollarSign className="w-40 h-40 translate-x-10 -translate-y-10" />
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white p-10 rounded-[40px] border border-[#847365]/10 shadow-xl flex flex-col justify-center relative overflow-hidden group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#847365]/5 text-[#847365] rounded-2xl transition-colors group-hover:bg-[#E67E22]/10 group-hover:text-[#E67E22]">
                <History className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#847365]/40 uppercase tracking-[0.2em] text-[10px]">Transacciones del mes</h3>
            </div>
            <p className="text-4xl font-serif font-bold text-[#2D241E] mb-2 px-1">
              {payments.filter(p => new Date(p.payment_date).getMonth() === new Date().getMonth()).length} operaciones
            </p>
            <p className="text-sm text-[#847365] font-medium opacity-80 px-1">Registradas y validadas en el libro diario.</p>
          </motion.div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-[48px] border border-[#847365]/5 shadow-sm overflow-hidden pb-10">
          <div className="p-10 border-b border-[#847365]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-1.5 h-8 bg-[#E67E22] rounded-full" />
               <h3 className="text-2xl font-serif font-bold text-[#2D241E]">Últimos Movimientos</h3>
            </div>
            <div className="relative max-w-xs w-full">
               <Search className="w-4 h-4 text-[#847365]/40 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por alumno..." 
                  className="w-full bg-[#F5F1EE]/50 border-none rounded-2xl pl-12 pr-6 py-3.5 text-sm focus:ring-2 focus:ring-[#E67E22]/20 font-medium transition-all"
               />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/40 px-10">
                  <th className="pl-14 py-6">Alumno</th>
                  <th className="px-8 py-6 text-right">Monto</th>
                  <th className="px-8 py-6">Fecha</th>
                  <th className="px-8 py-6">Periodo</th>
                  <th className="pr-14 py-6">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#847365]/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-[#E67E22]" />
                        <span className="text-sm font-bold text-[#847365]/40 uppercase tracking-widest italic">Consolidando datos financieros...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-[#847365]/40 italic font-serif text-xl">
                      No hay transacciones que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="group hover:bg-[#F5F1EE]/30 transition-all">
                      <td className="pl-14 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#847365]/5 flex items-center justify-center font-serif font-bold text-[#847365]">
                            {payment.students?.full_name.charAt(0)}
                          </div>
                          <span className="font-serif font-bold text-lg text-[#2D241E] group-hover:text-[#E67E22] transition-colors">
                            {payment.students?.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right font-serif font-bold text-xl text-[#2D241E]">
                        ${payment.amount.toLocaleString('es-AR')}
                      </td>
                      <td className="px-8 py-8 text-sm text-[#847365] font-bold">
                        {new Date(payment.payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-8 py-8">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-[#F5F1EE] px-3 py-1.5 rounded-lg text-[#847365]">
                          Mes {payment.period_month} / {payment.period_year}
                        </span>
                      </td>
                      <td className="pr-14 py-8">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            payment.payment_method === 'cash' ? 'bg-green-400' : 'bg-[#E67E22]'
                          )} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60">
                             {payment.payment_method === 'cash' ? 'Efectivo' : 
                              payment.payment_method === 'transfer' ? 'Transferencia' : 
                              payment.payment_method === 'card' ? 'Tarjeta' : 'Otro'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#2D241E]/40 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-[#F5F1EE] w-full max-w-4xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-auto"
              >
                {/* Left: Selection */}
                <div className="w-full md:w-[40%] bg-white p-10 border-r border-[#847365]/5 overflow-y-auto">
                    <div className="mb-8">
                      <h3 className="text-2xl font-serif font-bold mb-1">Seleccionar Alumno</h3>
                      <p className="text-xs text-[#847365] font-bold uppercase tracking-widest opacity-60">Paso 1: Quién realiza el pago</p>
                    </div>

                    <div className="relative mb-6">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#847365]/40" />
                      <input 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="w-full bg-[#F5F1EE] border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:ring-2 focus:ring-[#E67E22]/20"
                      />
                    </div>

                    <div className="space-y-3">
                      {students
                        .filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .slice(0, 5)
                        .map(student => (
                          <button
                            key={student.id}
                            onClick={() => handleStudentSelect(student)}
                            className={cn(
                              "w-full text-left p-5 rounded-[24px] flex items-center justify-between group transition-all",
                              selectedStudentId === student.id 
                                ? "bg-[#E67E22] text-white shadow-xl shadow-[#E67E22]/20" 
                                : "bg-[#F5F1EE]/50 hover:bg-[#F5F1EE] text-[#2D241E]"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold",
                                selectedStudentId === student.id ? "bg-white/20" : "bg-white shadow-sm text-[#847365]"
                              )}>
                                {student.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{student.full_name}</p>
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  selectedStudentId === student.id ? "text-white/60" : "text-[#847365]/40"
                                )}>
                                  {categories.find(c => c.id === student.category_id)?.name || 'Sin Categoría'}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 opacity-0 transition-all", selectedStudentId === student.id ? "opacity-100 translate-x-1" : "group-hover:opacity-40 translate-x-1")} />
                          </button>
                        ))
                      }
                      {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                        <p className="text-center py-10 text-[#847365]/40 italic text-sm">No se encontraron alumnos.</p>
                      )}
                    </div>
                </div>

                {/* Right: Form */}
                <div className="flex-1 p-10 md:p-14 overflow-y-auto bg-warm-light relative">
                  <header className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-3xl font-serif font-bold">Detalles del Cobro</h3>
                      <p className="text-xs text-[#847365] font-bold uppercase tracking-widest opacity-60">Paso 2: Completar transacción</p>
                    </div>
                    <button onClick={() => setShowPaymentModal(false)} className="w-12 h-12 rounded-full hover:bg-white flex items-center justify-center transition-all group">
                       <XCircle className="w-8 h-8 text-[#847365]/20 group-hover:text-[#E74C3C]/60" />
                    </button>
                  </header>

                  <form onSubmit={handleSavePayment} className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/60 ml-2">Monto a Percibir</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-serif font-bold text-[#E67E22]">$</span>
                        <input 
                          required
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                          className="w-full h-20 bg-white border-none rounded-[32px] pl-12 pr-8 text-4xl font-serif font-black focus:ring-4 focus:ring-[#E67E22]/10 transition-all shadow-inner"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/60 ml-2">Mes</label>
                      <select 
                        value={paymentForm.month}
                        onChange={(e) => setPaymentForm({...paymentForm, month: parseInt(e.target.value)})}
                        className="w-full h-14 bg-white border-none rounded-2xl px-6 font-bold text-[#2D241E] focus:ring-4 focus:ring-[#E67E22]/10"
                      >
                        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/60 ml-2">Método</label>
                      <select 
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                        className="w-full h-14 bg-white border-none rounded-2xl px-6 font-bold text-[#2D241E] focus:ring-4 focus:ring-[#E67E22]/10"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="card">Tarjeta</option>
                      </select>
                    </div>

                    <div className="col-span-2 space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/60 ml-2">Notas Especiales</label>
                      <input 
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                        placeholder="Ej: Promo familiar aplicada..."
                        className="w-full h-16 bg-white border-none rounded-2xl px-6 font-medium focus:ring-4 focus:ring-[#E67E22]/10 shadow-sm"
                      />
                    </div>

                    <div className="col-span-2 pt-6">
                      <Button 
                        disabled={saving || !selectedStudentId || !paymentForm.amount}
                        className="w-full h-20 bg-[#2D241E] hover:bg-[#E67E22] text-white rounded-[32px] font-serif font-bold text-xl transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Confirmar y Registrar"}
                      </Button>
                      <p className="text-center mt-6 text-[10px] font-black uppercase tracking-widest text-[#847365]/40 flex items-center justify-center gap-2">
                        <Info className="w-3.5 h-3.5" /> La transacción impactará en el balance mensual
                      </p>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
