"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  Calendar, 
  Filter, 
  Download,
  Loader2,
  Trash2,
  Tag,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  XCircle,
  CheckCircle2,
  Printer,
  FileText,
  PieChart,
  LayoutGrid,
  List,
  ChevronLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category_id: string;
  payment_method: string;
  expense_categories?: {
    name: string;
    color: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
}

export default function FinanzasPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    category_id: "",
    payment_method: "cash"
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: "#E67E22"
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    const start = startOfMonth(selectedMonth).toISOString();
    const end = endOfMonth(selectedMonth).toISOString();

    try {
      // 1. Fetch Categories
      const { data: catData } = await supabase.from('expense_categories').select('*').order('name');
      if (catData) setCategories(catData);

      // 2. Fetch Expenses for month
      const { data: expData } = await supabase
        .from('expenses')
        .select('*, expense_categories(name, color)')
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0])
        .order('date', { ascending: false });
      if (expData) setExpenses(expData as any);

      // 3. Fetch Payments (Income) for month
      const { data: payData } = await supabase
        .from('payments')
        .select('id, amount, payment_date')
        .gte('payment_date', start)
        .lte('payment_date', end);
      if (payData) setPayments(payData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('expenses').insert([{
      user_id: user.id,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      category_id: expenseForm.category_id || null,
      payment_method: expenseForm.payment_method
    }]);

    if (!error) {
      setShowExpenseModal(false);
      setExpenseForm({
        description: "",
        amount: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        category_id: "",
        payment_method: "cash"
      });
      fetchData();
    } else {
      alert("Error guardando gasto: " + error.message);
    }
    setSaving(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('expense_categories').insert([{
      user_id: user.id,
      name: categoryForm.name,
      color: categoryForm.color
    }]);

    if (!error) {
      setShowCategoryModal(false);
      setCategoryForm({ name: "", color: "#E67E22" });
      fetchData();
    } else {
      alert("Error guardando categoría: " + error.message);
    }
    setSaving(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) fetchData();
  };

  const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  return (
    <DashboardShell>
      <div className="space-y-8 pb-20">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Finanzas</h1>
            <p className="text-[#847365] font-medium opacity-80 mt-1">Control de ingresos, gastos y balance mensual.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center justify-between bg-white border border-[#E8E2DC] rounded-2xl px-4 py-2 shadow-sm">
              <button 
                onClick={() => {
                  const d = new Date(selectedMonth);
                  d.setMonth(d.getMonth() - 1);
                  setSelectedMonth(d);
                }} 
                className="p-2 hover:text-primary transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="mx-4 font-black text-xs uppercase tracking-widest min-w-[140px] text-center">
                {format(selectedMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <button 
                onClick={() => {
                  const d = new Date(selectedMonth);
                  d.setMonth(d.getMonth() + 1);
                  setSelectedMonth(d);
                }} 
                className="p-2 hover:text-primary transition-colors"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <Button 
              onClick={() => setShowExpenseModal(true)} 
              className="bg-primary hover:bg-primary/90 text-white h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-primary/20 font-bold"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Registrar Gasto</span><span className="sm:hidden">Nuevo Gasto</span>
            </Button>
          </div>
        </section>

        {/* Stats Cards - Optimized for Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
            className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-[#847365]/5 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 text-green-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-[#847365]/60">Ingresos Totales</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-[#2D241E]">${totalIncome.toLocaleString('es-AR')}</p>
            <div className="mt-4 flex items-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-widest">
              <ArrowUpRight className="w-3 h-3" /> Cobros realizados
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-[#847365]/5 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-[#847365]/60">Gastos Totales</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-[#2D241E]">${totalExpenses.toLocaleString('es-AR')}</p>
            <div className="mt-4 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest">
              <ArrowDownRight className="w-3 h-3" /> Egresos registrados
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className={cn(
              "p-6 md:p-8 rounded-[32px] md:rounded-[40px] border shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1",
              balance >= 0 ? "bg-[#2D241E] text-white border-transparent" : "bg-red-600 text-white border-transparent"
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center">
                <Wallet className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Balance del Período</span>
            </div>
            <p className="text-2xl md:text-3xl font-black">${balance.toLocaleString('es-AR')}</p>
            <div className="mt-4 flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
               Resultado neto mensual
            </div>
          </motion.div>
        </div>

        {/* Content Tabs/Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Expenses List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg md:text-xl font-serif font-bold flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" /> Movimientos
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowCategoryModal(true)} 
                  className="hidden sm:flex text-[10px] font-black uppercase tracking-widest text-[#847365] hover:text-primary items-center gap-2 transition-colors"
                >
                  <Tag className="w-4 h-4" /> Categorías
                </button>
                <div className="bg-[#F5F1EE]/50 p-1 rounded-xl flex">
                  <button className="p-2 bg-white rounded-lg shadow-sm text-primary"><List className="w-4 h-4" /></button>
                  <button className="p-2 text-[#847365] opacity-40"><LayoutGrid className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-[#847365]/5">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/40 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-[#847365]/40">Cargando movimientos...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-20 text-[#847365]/40 font-medium bg-[#F5F1EE]/30 rounded-[32px] border border-dashed border-[#847365]/10 px-6">
                  <p className="font-serif italic text-lg mb-1">Sin registros</p>
                  <p className="text-xs font-black uppercase tracking-widest">No hay gastos para este período.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {expenses.map((expense) => (
                    <motion.div 
                      key={expense.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 md:p-5 bg-white border border-[#E8E2DC] rounded-[24px] md:rounded-3xl hover:border-primary/20 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${expense.expense_categories?.color || '#847365'}15`, color: expense.expense_categories?.color || '#847365' }}>
                          <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm md:text-base text-[#2D241E] truncate">{expense.description}</p>
                          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#847365]/60">
                            <span className="shrink-0">{format(new Date(expense.date), 'dd MMM', { locale: es })}</span>
                            <span className="w-1 h-1 bg-[#847365]/20 rounded-full shrink-0" />
                            <span style={{ color: expense.expense_categories?.color }} className="truncate">{expense.expense_categories?.name || 'Varios'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <p className="font-black text-base md:text-lg text-red-600">-${expense.amount.toLocaleString('es-AR')}</p>
                        <button 
                          onClick={() => handleDeleteExpense(expense.id)} 
                          className="p-2 text-[#847365]/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          aria-label="Eliminar gasto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area: Category Breakdown & Actions */}
          <div className="space-y-6">
            {/* By Category Section */}
            <section className="bg-[#2D241E] rounded-[32px] md:rounded-[40px] p-6 md:p-8 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-50" />
              <h3 className="relative z-10 text-lg md:text-xl font-serif font-bold mb-6 flex items-center gap-3">
                <PieChart className="w-5 h-5 text-primary" /> Distribución
              </h3>
              <div className="relative z-10 space-y-6">
                 {categories.map(cat => {
                    const catExpenses = expenses.filter(e => e.category_id === cat.id);
                    const amount = catExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                    
                    if (amount === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span style={{ color: cat.color }}>{cat.name}</span>
                          <span className="text-white/40">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${percentage}%` }} 
                              className="h-full rounded-full" 
                              style={{ backgroundColor: cat.color }} 
                           />
                        </div>
                        <div className="text-right text-xs font-bold text-white/60">
                          ${amount.toLocaleString('es-AR')}
                        </div>
                      </div>
                    )
                 })}
                 
                 {totalExpenses === 0 && (
                   <p className="text-white/30 text-[10px] font-black uppercase tracking-widest text-center py-4">
                     Sin datos para graficar
                   </p>
                 )}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-white rounded-[32px] md:rounded-[40px] border border-[#847365]/5 shadow-sm p-6 md:p-8">
               <h3 className="text-lg font-serif font-bold mb-6">Acciones</h3>
               <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setShowCategoryModal(true)} 
                    className="flex items-center gap-3 p-4 bg-[#F5F1EE]/30 hover:bg-primary/5 rounded-2xl text-[#847365] hover:text-primary transition-all group"
                  >
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <Tag className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                     </div>
                     <span className="text-sm font-bold">Gestionar Categorías</span>
                  </button>
                  <button 
                    onClick={() => setShowReportModal(true)} 
                    className="flex items-center gap-3 p-4 bg-[#F5F1EE]/30 hover:bg-primary/5 rounded-2xl text-[#847365] hover:text-primary transition-all group"
                  >
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <FileText className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                     </div>
                     <span className="text-sm font-bold">Informe Mensual</span>
                  </button>
               </div>
            </section>
          </div>
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Financial Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-[#2D241E]/80 backdrop-blur-md" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              className="relative bg-white w-full h-full md:max-w-4xl md:h-[90vh] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-[#F5F1EE] flex items-center justify-between bg-[#FDFCFB] shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowReportModal(false)} className="md:hidden p-2"><ChevronLeft /></button>
                  <div>
                    <h3 className="text-xl md:text-2xl font-serif font-bold leading-none">Informe Mensual</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 mt-1">{format(selectedMonth, 'MMMM yyyy', { locale: es })}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.print()} variant="outline" className="hidden sm:flex rounded-xl gap-2 border-[#E8E2DC]">
                    <Printer className="w-4 h-4" /> Imprimir
                  </Button>
                  <button onClick={() => setShowReportModal(false)} className="hidden md:flex p-2 hover:bg-red-50 rounded-full text-[#847365]/40 hover:text-red-500 transition-all">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Documento */}
              <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#F5F1EE]/30" id="print-area">
                <div className="bg-white shadow-xl rounded-[24px] md:rounded-[32px] p-6 md:p-12 max-w-2xl mx-auto border border-[#847365]/5 min-h-[80vh] flex flex-col font-sans">
                   <div className="flex justify-between items-start mb-12">
                      <div className="px-4 py-2 bg-[#2D241E] rounded-xl text-white font-black italic tracking-tighter">SAHARA</div>
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Generado</p>
                         <p className="text-xs font-bold">{format(new Date(), 'dd/MM/yyyy')}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                      <div className="p-6 bg-[#FDFCFB] rounded-2xl border border-[#847365]/5 text-center">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 mb-2">Ingresos</p>
                         <p className="text-2xl font-black text-green-600">${totalIncome.toLocaleString('es-AR')}</p>
                      </div>
                      <div className="p-6 bg-[#FDFCFB] rounded-2xl border border-[#847365]/5 text-center">
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 mb-2">Egresos</p>
                         <p className="text-2xl font-black text-red-600">${totalExpenses.toLocaleString('es-AR')}</p>
                      </div>
                   </div>

                   <div className="mb-12">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-4 px-2">Egresos por Categoría</h4>
                      <div className="space-y-4">
                         {categories.map(cat => {
                           const amount = expenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0);
                           if (amount === 0) return null;
                           return (
                             <div key={cat.id} className="flex justify-between items-center py-3 px-4 border-b border-[#F5F1EE]">
                                <span className="text-sm font-bold flex items-center gap-3">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.name}
                                </span>
                                <span className="text-sm font-black text-[#847365]">${amount.toLocaleString('es-AR')}</span>
                             </div>
                           )
                         })}
                      </div>
                   </div>

                   {/* Resumen Final */}
                   <div className="mt-auto pt-8 border-t border-[#847365]/10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-1">Resultado de la Gestión</p>
                      <p className={cn("text-4xl font-black", balance >= 0 ? "text-[#2D241E]" : "text-red-600")}>
                        ${balance.toLocaleString('es-AR')}
                      </p>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpenseModal(false)} className="absolute inset-0 bg-[#2D241E]/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              className="relative bg-[#FDFCFB] w-full max-w-lg rounded-t-[32px] md:rounded-[40px] shadow-2xl p-8 md:p-10 overflow-hidden"
            >
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl md:text-2xl font-serif font-bold">Registrar Gasto</h3>
                  <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-red-50 rounded-full text-[#847365]/40 hover:text-red-500 transition-all">
                    <XCircle className="w-6 h-6" />
                  </button>
               </div>

               <form onSubmit={handleAddExpense} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 ml-4">Descripción</label>
                    <input required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full h-14 bg-white border border-[#E8E2DC] rounded-2xl px-5 font-bold focus:ring-4 focus:ring-primary/10 shadow-sm transition-all" placeholder="Ej: Pago de luz, Alquiler..." />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 ml-4">Monto ($)</label>
                      <input type="number" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full h-14 bg-white border border-[#E8E2DC] rounded-2xl px-5 font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 ml-4">Fecha</label>
                      <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full h-14 bg-white border border-[#E8E2DC] rounded-2xl px-5 font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 ml-4">Categoría</label>
                    <select value={expenseForm.category_id} onChange={e => setExpenseForm({...expenseForm, category_id: e.target.value})} className="w-full h-14 bg-white border border-[#E8E2DC] rounded-2xl px-5 font-bold focus:ring-4 focus:ring-primary/10 shadow-sm">
                       <option value="">Otras Categorías</option>
                       {categories.map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                       ))}
                    </select>
                  </div>

                  <Button disabled={saving} type="submit" className="w-full bg-primary text-white h-16 rounded-[24px] font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all mt-4">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Guardar Registro"}
                  </Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-[#2D241E]/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-[#FDFCFB] w-full max-w-sm rounded-[40px] shadow-2xl p-10 overflow-hidden"
            >
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-serif font-bold">Nueva Categoría</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-red-50 rounded-full text-[#847365]/40 hover:text-red-500 transition-all"><XCircle className="w-6 h-6" /></button>
               </div>

               <form onSubmit={handleAddCategory} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 ml-4">Nombre</label>
                    <input required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full h-14 bg-white border border-[#E8E2DC] rounded-2xl px-5 font-bold focus:ring-4 focus:ring-primary/10 shadow-sm" placeholder="Ej: Sueldos, Alquiler..." />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 ml-4">Color Distintivo</label>
                    <div className="flex flex-wrap gap-2.5 p-2">
                       {["#E67E22", "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6", "#F1C40F", "#2D241E", "#34495E"].map(c => (
                         <button key={c} type="button" onClick={() => setCategoryForm({...categoryForm, color: c})} className={cn("w-9 h-9 rounded-full border-2 transition-all", categoryForm.color === c ? "border-primary scale-110 shadow-md ring-4 ring-primary/5" : "border-transparent opacity-60 hover:opacity-100")} style={{ backgroundColor: c }} />
                       ))}
                    </div>
                  </div>

                  <Button disabled={saving} type="submit" className="w-full bg-[#2D241E] text-white h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Crear Categoría"}
                  </Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
