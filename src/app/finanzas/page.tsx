"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const generateReportPdf = async () => {
    if (!reportRef.current) return;
    
    setGeneratingPdf(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Informe_${format(selectedMonth, 'MMMM_yyyy', { locale: es })}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  return (
    <DashboardShell>
      <div className="min-h-screen bg-[#FDFCFB]/50 selection:bg-[#D4AF37]/20">
        <div className="space-y-12 pb-24 max-w-7xl mx-auto px-4 sm:px-8 pt-10">
          
          {/* Header Section: Premium & Balanced */}
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-[2px] bg-[#D4AF37]" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#847365]/60">Gestión Financiera</span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-[#1A1614] leading-tight">
                Balance <span className="text-[#D4AF37] italic font-normal">&</span><br/>
                Flujos de Caja
              </h1>
              <p className="text-[#847365] font-medium text-lg leading-relaxed max-w-xl opacity-70">
                Monitoreo de liquidez y administración de activos en tiempo real.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              {/* Period Selector: Elegant Precision */}
              <div className="flex items-center bg-white border border-[#E8E2DC] shadow-[0_10px_30px_-10px_rgba(26,22,20,0.05)] rounded-[40px] p-2 transition-all duration-500 hover:border-[#D4AF37]/30 group/selector">
                <button 
                  onClick={() => {
                    const d = new Date(selectedMonth);
                    d.setMonth(d.getMonth() - 1);
                    setSelectedMonth(d);
                  }} 
                  className="w-12 h-12 flex items-center justify-center hover:bg-[#1A1614] hover:text-white rounded-full text-[#1A1614] transition-all duration-300 active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="px-8 flex flex-col items-center min-w-[200px]">
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#D4AF37] mb-1">Periodo Actual</span>
                  <span className="font-serif font-black text-xl text-[#1A1614] capitalize tracking-tighter">
                    {format(selectedMonth, 'MMMM yyyy', { locale: es })}
                  </span>
                </div>
                
                <button 
                  onClick={() => {
                    const d = new Date(selectedMonth);
                    d.setMonth(d.getMonth() + 1);
                    setSelectedMonth(d);
                  }} 
                  className="w-12 h-12 flex items-center justify-center hover:bg-[#1A1614] hover:text-white rounded-full text-[#1A1614] transition-all duration-300 active:scale-90"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <Button 
                onClick={() => setShowExpenseModal(true)} 
                className="bg-[#1A1614] hover:bg-black text-white h-16 px-10 rounded-[28px] gap-4 shadow-xl shadow-[#1A1614]/10 font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all duration-500"
              >
                <Plus className="w-5 h-5 text-[#D4AF37]" />
                <span>Nuevo Registro</span>
              </Button>
            </div>
          </header>

          {/* Status Dashboard: 3 Balanced Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Income Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[40px] border border-[#E8E2DC]/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] relative overflow-hidden group"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/5 rounded-full blur-[40px]" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center border border-green-100/50 shadow-sm">
                    <ArrowUpRight className="w-7 h-7" />
                  </div>
                  <div className="text-right">
                    <p className="text-[#847365]/60 font-black text-[9px] uppercase tracking-[0.2em] mb-1">Entradas</p>
                    <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                      Ingresos
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#D4AF37]">$</span>
                    <span className="text-4xl font-serif font-black text-[#1A1614] tabular-nums tracking-tighter">
                      {totalIncome.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-[#847365]/40 uppercase tracking-widest">Recaudación Mensual</p>
                </div>
              </div>
            </motion.div>

            {/* Expenses Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[40px] border border-[#E8E2DC]/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] relative overflow-hidden group"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/5 rounded-full blur-[40px]" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100/50 shadow-sm">
                    <ArrowDownRight className="w-7 h-7" />
                  </div>
                  <div className="text-right">
                    <p className="text-[#847365]/60 font-black text-[9px] uppercase tracking-[0.2em] mb-1">{expenses.length} Transacciones</p>
                    <div className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      Egresos
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-red-500">-$</span>
                    <span className="text-4xl font-serif font-black text-[#1A1614] tabular-nums tracking-tighter">
                      {totalExpenses.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-[#847365]/40 uppercase tracking-widest">Gastos Operativos</p>
                </div>
              </div>
            </motion.div>

            {/* Balance Card: The Luxury Accent */}
            <motion.div 
              whileHover={{ y: -5 }}
              className={cn(
                "p-8 rounded-[40px] border shadow-[0_30px_70px_-20px] relative overflow-hidden group transition-all duration-500",
                balance >= 0 
                  ? "bg-[#1A1614] text-white border-[#D4AF37]/30 shadow-[#1A1614]/30" 
                  : "bg-red-800 text-white border-white/20 shadow-red-800/30"
              )}
            >
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-[50px]" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                      <Wallet className="w-7 h-7 text-[#D4AF37]" />
                    </div>
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      balance >= 0 ? "bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]" : "bg-black/40 border-white/10 text-white"
                    )}>
                      {balance >= 0 ? "Excedente" : "Déficit"}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-serif font-black tabular-nums tracking-tighter">
                      {balance.toLocaleString('es-AR')}
                    </span>
                    <span className="text-lg font-bold opacity-40">$</span>
                  </div>
                </div>
                
                <div className="mt-8 space-y-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: balance >= 0 ? "100%" : "30%" }}
                      className={cn("h-full rounded-full", balance >= 0 ? "bg-[#D4AF37]" : "bg-white")}
                    />
                  </div>
                  <div className="flex items-center justify-between opacity-30 text-[8px] font-black uppercase tracking-[0.3em]">
                    <span>Performance Operativa</span>
                    <span>100% Auditado</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Movement Ledger */}
            <div className="lg:col-span-8 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-8 bg-[#D4AF37] rounded-full" />
                    <h2 className="text-2xl font-serif font-black text-[#1A1614] tracking-tighter">Actividad Reciente</h2>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/50 ml-5.5">Historial de egresos liquidados</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E8E2DC] shadow-sm">
                  <button className="p-2.5 bg-[#1A1614] rounded-xl text-white shadow-lg"><List className="w-4 h-4" /></button>
                  <button className="p-2.5 text-[#847365]/30 hover:text-[#1A1614] transition-all"><LayoutGrid className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white/50 rounded-[40px] border border-[#E8E2DC] border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Cargando Libro Mayor...</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-24 bg-white/50 rounded-[40px] border border-[#E8E2DC] border-dashed">
                    <TrendingDown className="w-12 h-12 text-[#847365]/10 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40">No hay movimientos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expenses.map((expense, idx) => (
                      <motion.div 
                        key={expense.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white border border-[#E8E2DC]/80 rounded-[32px] hover:shadow-xl hover:border-[#D4AF37]/30 transition-all duration-500"
                      >
                        <div className="flex items-center gap-6">
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2 border-white" 
                            style={{ backgroundColor: `${expense.expense_categories?.color || '#F5F1EE'}15`, color: expense.expense_categories?.color || '#1A1614' }}
                          >
                            <ArrowDownRight className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-serif font-black text-[#1A1614] text-xl truncate tracking-tight">{expense.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#847365]/60 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 opacity-30" />
                                {format(new Date(expense.date), 'dd MMM, yyyy', { locale: es })}
                              </span>
                              <div 
                                className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest"
                                style={{ backgroundColor: `${expense.expense_categories?.color || '#847365'}10`, color: expense.expense_categories?.color || '#847365' }}
                              >
                                {expense.expense_categories?.name || 'Varios'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-10 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0 border-[#F5F1EE]">
                          <div className="text-left sm:text-right">
                            <p className="font-serif font-black text-3xl text-red-600 tracking-tighter">
                              <span className="text-sm mr-1.5 opacity-30">$</span>
                              {expense.amount.toLocaleString('es-AR')}
                            </p>
                            <p className="text-[8px] font-black text-[#847365]/30 uppercase tracking-[0.2em]">{expense.payment_method}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)} 
                            className="p-3 text-[#847365]/20 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Intelligence */}
            <div className="lg:col-span-4 space-y-10 lg:sticky lg:top-10">
              
              {/* Allocation Section */}
              <section className="bg-[#1A1614] rounded-[48px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-[40px]" />
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-[0.6em] text-[#D4AF37] opacity-60">Insight</span>
                      <h2 className="text-2xl font-serif font-black tracking-tighter">Distribución</h2>
                    </div>
                    <PieChart className="w-8 h-8 text-[#D4AF37] opacity-30" />
                  </div>

                  <div className="space-y-6">
                    {categories.map(cat => {
                        const amount = expenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0);
                        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                        if (amount === 0) return null;

                        return (
                          <div key={cat.id} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">{cat.name}</span>
                              </div>
                              <span className="text-lg font-serif font-black tracking-tighter">${amount.toLocaleString('es-AR')}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${percentage}%` }} 
                                  className="h-full rounded-full" 
                                  style={{ backgroundColor: cat.color }} 
                               />
                            </div>
                          </div>
                        )
                    })}
                  </div>
                </div>
              </section>

              {/* Tools Section */}
              <section className="bg-white rounded-[48px] border border-[#E8E2DC] p-8 space-y-6">
                 <h2 className="text-xl font-serif font-black text-[#1A1614] tracking-tighter border-b border-[#F5F1EE] pb-4">Estrategia</h2>
                 
                 <div className="space-y-3">
                    <button 
                      onClick={() => setShowCategoryModal(true)} 
                      className="w-full flex items-center justify-between p-4 bg-[#F5F1EE]/50 hover:bg-[#1A1614] group rounded-2xl transition-all duration-300"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center group-hover:bg-[#D4AF37] transition-all">
                             <Tag className="w-5 h-5 text-[#1A1614]" />
                          </div>
                          <span className="text-sm font-black text-[#1A1614] group-hover:text-white transition-colors">Categorías</span>
                       </div>
                       <ChevronRight className="w-5 h-5 text-[#847365] group-hover:text-white" />
                    </button>
                    
                    <button 
                      onClick={() => setShowReportModal(true)} 
                      className="w-full flex items-center justify-between p-4 bg-[#D4AF37]/5 hover:bg-[#D4AF37] group rounded-2xl transition-all duration-300"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                             <FileText className="w-5 h-5 text-[#D4AF37]" />
                          </div>
                          <span className="text-sm font-black text-[#1A1614]">Generar PDF</span>
                       </div>
                       <ArrowUpRight className="w-5 h-5 text-[#D4AF37] group-hover:text-[#1A1614]" />
                    </button>
                 </div>
              </section>
            </div>
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
                  <Button disabled={generatingPdf} onClick={generateReportPdf} variant="outline" className="hidden sm:flex rounded-xl gap-2 border-[#E8E2DC]">
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    Exportar PDF
                  </Button>
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
                <div ref={reportRef} className="bg-white shadow-xl rounded-[24px] md:rounded-[32px] p-6 md:p-12 max-w-2xl mx-auto border border-[#847365]/5 min-h-[80vh] flex flex-col font-sans">
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

      {/* Expense Modal: Premium Dark Blur */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpenseModal(false)} className="absolute inset-0 bg-[#2D241E]/60 backdrop-blur-xl" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              className="relative bg-[#FDFCFB] w-full max-w-xl rounded-t-[48px] md:rounded-[56px] shadow-3xl p-10 md:p-14 overflow-hidden border-t-4 border-[#D4AF37]"
            >
               <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-3xl font-serif font-black text-[#2D241E]">Registrar Egreso</h3>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#847365]/60 mt-2">Completa los detalles de la transacción</p>
                  </div>
                  <button onClick={() => setShowExpenseModal(false)} className="w-12 h-12 flex items-center justify-center hover:bg-red-50 rounded-full text-[#847365]/40 hover:text-red-500 transition-all">
                    <XCircle className="w-8 h-8" />
                  </button>
               </div>

               <form onSubmit={handleAddExpense} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#847365]/60 ml-5">Concepto del Gasto</label>
                    <div className="relative">
                      <input required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full h-18 bg-white border-2 border-[#E8E2DC]/50 rounded-[28px] px-8 font-black text-lg focus:border-[#D4AF37] focus:ring-8 focus:ring-[#D4AF37]/5 shadow-sm transition-all outline-none placeholder:text-[#847365]/20" placeholder="Ej: Insumos de oficina" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#847365]/60 ml-5">Importe ($)</label>
                      <input type="number" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full h-18 bg-white border-2 border-[#E8E2DC]/50 rounded-[28px] px-8 font-black text-xl focus:border-[#D4AF37] focus:ring-8 focus:ring-[#D4AF37]/5 shadow-sm outline-none" placeholder="0.00" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#847365]/60 ml-5">Fecha</label>
                      <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full h-18 bg-white border-2 border-[#E8E2DC]/50 rounded-[28px] px-8 font-black focus:border-[#D4AF37] outline-none shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#847365]/60 ml-5">Categoría Estratégica</label>
                    <select value={expenseForm.category_id} onChange={e => setExpenseForm({...expenseForm, category_id: e.target.value})} className="w-full h-18 bg-white border-2 border-[#E8E2DC]/50 rounded-[28px] px-8 font-black text-[#2D241E] focus:border-[#D4AF37] outline-none shadow-sm appearance-none">
                       <option value="">Clasificación General</option>
                       {categories.map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                       ))}
                    </select>
                  </div>

                  <Button disabled={saving} type="submit" className="w-full bg-[#2D241E] hover:bg-black text-white h-20 rounded-[32px] font-black text-xl shadow-2xl shadow-[#2D241E]/20 active:scale-95 transition-all mt-6 uppercase tracking-[0.2em]">
                    {saving ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D4AF37]" /> : "Confirmar Movimiento"}
                  </Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal: Minimalist Focus */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-[#2D241E]/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-[#FDFCFB] w-full max-w-md rounded-[56px] shadow-3xl p-12 overflow-hidden border border-[#D4AF37]/20"
            >
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-serif font-black text-[#2D241E]">Nueva Categoría</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full text-[#847365]/20 hover:text-red-500 transition-all"><XCircle className="w-7 h-7" /></button>
               </div>

               <form onSubmit={handleAddCategory} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#847365]/60 ml-5">Nombre Identificador</label>
                    <input required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full h-16 bg-white border-2 border-[#E8E2DC]/50 rounded-[28px] px-8 font-black focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Ej: Publicidad Digital" />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#847365]/60 ml-5">Código de Color</label>
                    <div className="flex flex-wrap gap-4 p-2">
                       {["#E67E22", "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6", "#F1C40F", "#2D241E", "#D4AF37"].map(c => (
                         <button key={c} type="button" onClick={() => setCategoryForm({...categoryForm, color: c})} className={cn("w-10 h-10 rounded-2xl border-2 transition-all duration-300 transform", categoryForm.color === c ? "border-[#D4AF37] scale-125 shadow-xl ring-4 ring-[#D4AF37]/10" : "border-transparent opacity-40 hover:opacity-100 hover:scale-110")} style={{ backgroundColor: c }} />
                       ))}
                    </div>
                  </div>

                  <Button disabled={saving} type="submit" className="w-full bg-[#2D241E] text-white h-16 rounded-[28px] font-black text-sm uppercase tracking-[0.3em] shadow-xl hover:shadow-[#D4AF37]/10 active:scale-95 transition-all">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37]" /> : "Crear Clasificación"}
                  </Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
