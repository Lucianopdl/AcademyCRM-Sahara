"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useAcademy } from "@/hooks/use-academy";
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
  
  // Multi-tenant isolation
  // Multi-tenant isolation is handled by useAcademy hook

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

  const { academyId, userId, loading: contextLoading } = useAcademy();

  useEffect(() => {
    if (academyId && !contextLoading) {
      fetchData();
    }
  }, [selectedMonth, academyId, contextLoading]);

  const fetchData = async () => {
    if (!academyId) return;
    setLoading(true);
    const start = startOfMonth(selectedMonth).toISOString();
    const end = endOfMonth(selectedMonth).toISOString();

    try {
      // 1. Fetch Categories - filtered by academy
      const { data: catData } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('academy_id', academyId)
        .order('name');
      if (catData) setCategories(catData);

      // 2. Fetch Expenses for month - filtered by academy
      const { data: expData } = await supabase
        .from('expenses')
        .select('*, expense_categories(name, color)')
        .eq('academy_id', academyId)
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0])
        .order('date', { ascending: false });
      if (expData) setExpenses(expData as any);

      // 3. Fetch Payments (Income) for month - filtered by academy
      const { data: payData } = await supabase
        .from('payments')
        .select('id, amount, payment_date')
        .eq('academy_id', academyId)
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
      academy_id: academyId,
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
      academy_id: academyId,
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
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('academy_id', academyId);
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
      <div className="min-h-screen bg-background selection:bg-primary/20">
        <div className="space-y-12 pb-24 max-w-7xl mx-auto px-4 sm:px-8 pt-10">
          
          {/* Header Section: Premium & Balanced */}
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-[2px] bg-primary/40 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/50">Gestión de Tesorería</span>
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tighter text-foreground leading-[1.1]">
                Control de <br/>
                <span className="text-primary italic font-normal text-5xl md:text-7xl">Finanzas</span>
              </h1>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-lg opacity-80 backdrop-blur-sm">
                Monitoreo continuo de activos, egresos y proyecciones de caja en tiempo real.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              {/* Period Selector: Elegant Precision */}
              <div className="flex items-center bg-card/40 backdrop-blur-md border border-border/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-[32px] p-1.5 transition-all duration-500 hover:border-primary/20 group/selector">
                <button 
                  onClick={() => {
                    const d = new Date(selectedMonth);
                    d.setMonth(d.getMonth() - 1);
                    setSelectedMonth(d);
                  }} 
                  className="w-11 h-11 flex items-center justify-center hover:bg-primary/10 hover:text-primary rounded-full text-muted-foreground transition-all duration-300 active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="px-8 flex flex-col items-center min-w-[200px]">
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary/60 mb-1">Periodo Actual</span>
                  <span className="font-serif font-black text-xl text-foreground capitalize tracking-tighter">
                    {format(selectedMonth, 'MMMM yyyy', { locale: es })}
                  </span>
                </div>
                
                <button 
                  onClick={() => {
                    const d = new Date(selectedMonth);
                    d.setMonth(d.getMonth() + 1);
                    setSelectedMonth(d);
                  }} 
                  className="w-11 h-11 flex items-center justify-center hover:bg-primary/10 hover:text-primary rounded-full text-muted-foreground transition-all duration-300 active:scale-90"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <Button 
                onClick={() => setShowExpenseModal(true)} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-16 px-10 rounded-[24px] gap-4 shadow-2xl shadow-primary/20 font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all duration-500 border-none group"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Registrar Gasto</span>
              </Button>
            </div>
          </header>

          {/* Status Dashboard: 3 Balanced Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Income Card */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-card/50 backdrop-blur-sm p-10 rounded-[48px] border border-border/80 shadow-[0_8px_40px_-12px_rgba(16,185,129,0.08)] relative overflow-hidden group"
            >
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] group-hover:bg-emerald-500/10 transition-colors" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-[24px] flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground/50 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Entradas</p>
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-500/5 px-2.5 py-1 rounded-full">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      Caja Central
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-serif font-black text-primary/40">$</span>
                    <span className="text-5xl font-serif font-black text-foreground tabular-nums tracking-tighter">
                      {totalIncome.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest ml-1">Recaudación Mensual</p>
                </div>
              </div>
            </motion.div>

            {/* Expenses Card */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-card/50 backdrop-blur-sm p-10 rounded-[48px] border border-border/80 shadow-[0_8px_40px_-12px_rgba(244,63,94,0.08)] relative overflow-hidden group"
            >
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-rose-500/5 rounded-full blur-[60px] group-hover:bg-rose-500/10 transition-colors" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-[24px] flex items-center justify-center border border-rose-500/20 shadow-inner group-hover:-rotate-12 transition-transform duration-500">
                    <TrendingDown className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground/50 font-black text-[10px] uppercase tracking-[0.3em] mb-1">{expenses.length} Movimientos</p>
                    <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase tracking-widest bg-rose-500/5 px-2.5 py-1 rounded-full">
                      <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                      Egresos
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-serif font-black text-rose-500/40">-$</span>
                    <span className="text-5xl font-serif font-black text-foreground tabular-nums tracking-tighter">
                      {totalExpenses.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest ml-1">Gastos Operativos</p>
                </div>
              </div>
            </motion.div>

            {/* Balance Card: The Luxury Accent */}
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn(
                "p-10 rounded-[48px] border shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden group transition-all duration-700",
                balance >= 0 
                  ? "bg-card/80 border-border/80" 
                  : "bg-rose-500/10 border-rose-500/20"
              )}
            >
              <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-all duration-700" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-12">
                    <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center border border-primary/20 shadow-inner">
                      <Wallet className="w-8 h-8 text-primary" />
                    </div>
                    <div className={cn(
                      "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-colors",
                      balance >= 0 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                        : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    )}>
                      {balance >= 0 ? "Excedente" : "Déficit"}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className={cn(
                      "text-5xl font-serif font-black tabular-nums tracking-tighter",
                      balance >= 0 ? "text-foreground" : "text-rose-500"
                    )}>
                      {balance.toLocaleString('es-AR')}
                    </span>
                    <span className="text-xl font-bold text-primary">ARS</span>
                  </div>
                </div>
                
                <div className="mt-10 space-y-4">
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden p-[2px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: balance >= 0 ? "100%" : "30%" }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000", 
                        balance >= 0 ? "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.5)]" : "bg-rose-500"
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between opacity-50 text-[9px] font-black uppercase tracking-[0.3em]">
                    <span className="flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3 text-primary" />
                       Auditado
                    </span>
                    <span>Consistencia OK</span>
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
                    <div className="w-2.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
                    <h2 className="text-3xl font-serif font-black text-foreground tracking-tighter">Actividad Reciente</h2>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-5.5">Historial de movimientos financieros</p>
                </div>
                
                <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm p-1.5 rounded-2xl border border-border shadow-sm">
                  <button className="p-2.5 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20"><List className="w-4 h-4" /></button>
                  <button className="p-2.5 text-muted-foreground/30 hover:text-foreground transition-all duration-300"><LayoutGrid className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-card/50 rounded-[40px] border border-border border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Cargando Libro Mayor...</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-24 bg-card/50 rounded-[40px] border border-border border-dashed">
                    <TrendingDown className="w-12 h-12 text-muted-foreground/10 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No hay movimientos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expenses.map((expense, idx) => (
                      <motion.div 
                        key={expense.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-7 bg-card/60 backdrop-blur-sm border border-border/80 rounded-[32px] hover:shadow-2xl hover:border-primary/40 hover:bg-card transition-all duration-500 overflow-hidden"
                      >
                        {/* Shadow highlight on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        
                        <div className="flex items-center gap-6 relative z-10">
                          <div 
                            className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border-2 border-background" 
                            style={{ 
                              backgroundColor: `${expense.expense_categories?.color || 'var(--primary)'}15`, 
                              color: expense.expense_categories?.color || 'var(--primary)' 
                            }}
                          >
                            <ArrowDownRight className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div>
                            <p className="font-serif font-black text-foreground text-xl tracking-tight leading-none mb-2">{expense.description}</p>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5 bg-muted/20 px-3 py-1 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 opacity-40 text-primary" />
                                {format(new Date(expense.date), 'dd MMM, yyyy', { locale: es })}
                              </span>
                              <div 
                                className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-sm"
                                style={{ 
                                  backgroundColor: `${expense.expense_categories?.color || 'var(--muted-foreground)'}10`, 
                                  color: expense.expense_categories?.color || 'var(--muted-foreground)',
                                  border: `1px solid ${expense.expense_categories?.color || 'var(--muted-foreground)'}20`
                                }}
                              >
                                {expense.expense_categories?.name || 'Varios'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-10 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0 border-border/20 relative z-10">
                          <div className="text-left sm:text-right">
                            <p className="font-serif font-black text-3xl text-rose-500 tracking-tighter">
                              <span className="text-sm mr-1.5 opacity-40">ARS</span>
                              {expense.amount.toLocaleString('es-AR')}
                            </p>
                            <div className="flex items-center gap-2 justify-end opacity-40 mt-1">
                               <div className="w-1 h-1 rounded-full bg-rose-500" />
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{expense.payment_method}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)} 
                            className="w-12 h-12 flex items-center justify-center text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all active:scale-90 group/del"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-5 h-5 group-hover/del:scale-110 transition-transform" />
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
              <section className="bg-card/40 backdrop-blur-md rounded-[48px] p-10 border border-border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/5 rounded-full blur-[60px] group-hover:bg-primary/10 transition-colors" />
                <div className="relative z-10 space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-primary/60">Análisis</span>
                      <h2 className="text-3xl font-serif font-black tracking-tighter text-foreground mt-1">Distribución</h2>
                    </div>
                    <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10">
                       <PieChart className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-8">
                    {categories.length === 0 ? (
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 py-10">Sin datos de distribución</p>
                    ) : categories.map(cat => {
                        const amount = expenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0);
                        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                        if (amount === 0) return null;

                        return (
                          <div key={cat.id} className="space-y-3 group/item">
                            <div className="flex justify-between items-end">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] group-hover/item:scale-125 transition-transform" style={{ backgroundColor: cat.color }} />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest whitespace-nowrap">{cat.name}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xl font-serif font-black tracking-tighter text-foreground line-height-none">${amount.toLocaleString('es-AR')}</span>
                                <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest leading-none">{percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden p-[2px]">
                               <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${percentage}%` }} 
                                  className="h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-1000" 
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
              <section className="bg-card/40 backdrop-blur-md rounded-[48px] border border-border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] p-10 space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary/40 rounded-full" />
                    <h2 className="text-2xl font-serif font-black text-foreground tracking-tighter">Herramientas</h2>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => setShowCategoryModal(true)} 
                      className="w-full flex items-center justify-between p-5 bg-muted/20 hover:bg-primary group rounded-[24px] transition-all duration-500 border border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-[18px] bg-card border border-border/40 flex items-center justify-center group-hover:bg-primary-foreground transition-all shadow-sm">
                             <Tag className="w-6 h-6 text-primary group-hover:text-primary transition-all" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary-foreground/60 transition-colors block">Gestión de</span>
                            <span className="text-sm font-black text-foreground group-hover:text-primary-foreground transition-colors">Categorías</span>
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-primary-foreground/10 transition-all">
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary-foreground transition-all" />
                       </div>
                    </button>
                    
                    <button 
                      onClick={() => setShowReportModal(true)} 
                      className="w-full flex items-center justify-between p-5 bg-primary/5 hover:bg-primary group rounded-[24px] transition-all duration-500 border border-primary/5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-[18px] bg-card border border-border/40 flex items-center justify-center group-hover:bg-primary-foreground transition-all shadow-sm">
                             <FileText className="w-6 h-6 text-primary group-hover:text-primary transition-all" />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 group-hover:text-primary-foreground/60 transition-colors block">Documento de</span>
                            <span className="text-sm font-black text-foreground group-hover:text-primary-foreground transition-colors">Auditoría PDF</span>
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-primary-foreground/10 transition-all">
                          <ArrowUpRight className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-all" />
                       </div>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              className="relative bg-card w-full h-full md:max-w-4xl md:h-[90vh] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-border"
            >
              {/* Header */}
              <div className="p-8 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                  <button onClick={() => setShowReportModal(false)} className="md:hidden p-3 hover:bg-muted rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                  <div className="space-y-1">
                    <h3 className="text-2xl md:text-3xl font-serif font-black tracking-tighter text-foreground">Informe de Gestión</h3>
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">{format(selectedMonth, 'MMMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button disabled={generatingPdf} onClick={generateReportPdf} variant="outline" className="hidden sm:flex rounded-2xl gap-3 border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-500 h-12 px-6">
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    <span className="text-[10px] font-black uppercase tracking-widest">Exportar PDF</span>
                  </Button>
                  <Button onClick={() => window.print()} variant="outline" className="hidden sm:flex rounded-2xl gap-3 border-border hover:bg-muted transition-all duration-300 h-12 px-6">
                    <Printer className="w-4 h-4" /> 
                    <span className="text-[10px] font-black uppercase tracking-widest">Digitalizar</span>
                  </Button>
                  <button onClick={() => setShowReportModal(false)} className="hidden md:flex w-12 h-12 items-center justify-center hover:bg-rose-500/10 rounded-full text-muted-foreground/30 hover:text-rose-500 transition-all duration-500">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>
              </div>

              {/* Document View */}
              <div className="flex-1 overflow-y-auto p-6 md:p-16 bg-muted/20" id="print-area">
                <div ref={reportRef} className="bg-white dark:bg-zinc-950 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] rounded-[40px] p-10 md:p-20 max-w-2xl mx-auto border border-border/50 min-h-[90vh] flex flex-col font-sans relative overflow-hidden text-black dark:text-white">
                   {/* Sahara Logo / Brand Watermark for PDF */}
                   <div className="flex justify-between items-start mb-20">
                      <div className="flex flex-col">
                        <div className="px-5 py-2 bg-zinc-900 dark:bg-primary rounded-xl text-white font-black italic tracking-tighter text-xl">SAHARA</div>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] mt-2 opacity-40">Financial Intelligence</span>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-1">Corte de Auditoría</p>
                         <p className="text-sm font-black">{format(new Date(), 'dd/MM/yyyy')}</p>
                      </div>
                   </div>

                   <div className="space-y-12 mb-20">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-6 px-4">Resumen de Periodo</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="p-8 bg-muted/5 rounded-[32px] border border-border/40 group hover:border-emerald-500/20 transition-colors">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Total Ingresos</p>
                              <p className="text-3xl font-serif font-black text-emerald-600 tracking-tighter">${totalIncome.toLocaleString('es-AR')}</p>
                           </div>
                           <div className="p-8 bg-muted/5 rounded-[32px] border border-border/40 group hover:border-rose-500/20 transition-colors">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Total Egresos</p>
                              <p className="text-3xl font-serif font-black text-rose-600 tracking-tighter">-${totalExpenses.toLocaleString('es-AR')}</p>
                           </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-6 px-4">Análisis por Segmento</h4>
                        <div className="space-y-4">
                           {categories.map(cat => {
                             const amount = expenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0);
                             if (amount === 0) return null;
                             return (
                               <div key={cat.id} className="flex justify-between items-center py-5 px-6 rounded-2xl hover:bg-muted/10 transition-colors group">
                                  <span className="text-sm font-black flex items-center gap-4">
                                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                                    <span className="uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
                                  </span>
                                  <span className="text-lg font-serif font-black text-foreground tracking-tighter">${amount.toLocaleString('es-AR')}</span>
                               </div>
                             )
                           })}
                        </div>
                      </div>
                   </div>

                   {/* Resumen Final */}
                   <div className="mt-auto pt-12 border-t border-border flex flex-col items-center">
                      <div className="w-16 h-1 w-muted rounded-full mb-10 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 mb-3">Balance Proyectado</p>
                      <div className="flex items-center gap-4">
                        <span className={cn("text-6xl font-serif font-black tracking-tighter", balance >= 0 ? "text-foreground" : "text-rose-600")}>
                          ${balance.toLocaleString('es-AR')}
                        </span>
                        <span className="text-xl font-bold text-primary">ARS</span>
                      </div>
                      <div className="mt-8 flex items-center gap-2 px-4 py-1.5 bg-muted/20 rounded-full border border-border/40">
                        <CheckCircle2 className="w-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Documento Validado</span>
                      </div>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpenseModal(false)} className="absolute inset-0 bg-background/40 backdrop-blur-2xl" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              className="relative bg-card w-full max-w-xl rounded-t-[48px] md:rounded-[56px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] p-10 md:p-16 overflow-hidden border border-border/80"
            >
               <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
               
               <div className="flex items-center justify-between mb-16 relative z-10">
                  <div>
                    <h3 className="text-3xl font-serif font-black text-foreground tracking-tighter line-height-none">Registrar <span className="text-primary italic font-normal">Egreso</span></h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mt-3 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                       Nueva Transacción Saliente
                    </p>
                  </div>
                  <button onClick={() => setShowExpenseModal(false)} className="w-14 h-14 flex items-center justify-center hover:bg-rose-500/10 rounded-full text-muted-foreground/20 hover:text-rose-500 transition-all duration-500 group">
                    <XCircle className="w-9 h-9 group-hover:scale-110 transition-transform" />
                  </button>
               </div>

               <form onSubmit={handleAddExpense} className="space-y-10 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-6 flex items-center gap-2">
                       <FileText className="w-3.5 h-3.5" /> Concepto del Gasto
                    </label>
                    <div className="relative">
                      <input required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full h-20 bg-muted/20 border-2 border-border/60 hover:border-primary/20 rounded-[32px] px-10 font-black text-xl focus:border-primary focus:bg-card focus:ring-[12px] focus:ring-primary/5 shadow-inner transition-all outline-none placeholder:text-muted-foreground/20 text-foreground" placeholder="Ej: Pago de alquiler..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-6 flex items-center gap-2">
                         <span className="text-lg font-serif italic">$</span> Importe Total
                      </label>
                      <input type="number" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full h-20 bg-muted/20 border-2 border-border/60 hover:border-primary/20 rounded-[32px] px-10 font-black text-2xl focus:border-primary focus:bg-card focus:ring-[12px] focus:ring-primary/5 shadow-inner outline-none transition-all text-foreground" placeholder="0.00" />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-6 flex items-center gap-2">
                         <Calendar className="w-3.5 h-3.5" /> Fecha
                      </label>
                      <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full h-20 bg-muted/20 border-2 border-border/60 hover:border-primary/20 rounded-[32px] px-10 font-black focus:border-primary focus:bg-card focus:ring-[12px] focus:ring-primary/5 outline-none shadow-inner transition-all text-foreground" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-6 flex items-center gap-2">
                       <Tag className="w-3.5 h-3.5" /> Clasificación Segmentada
                    </label>
                    <select value={expenseForm.category_id} onChange={e => setExpenseForm({...expenseForm, category_id: e.target.value})} className="w-full h-20 bg-muted/20 border-2 border-border/60 hover:border-primary/20 rounded-[32px] px-10 font-black text-foreground focus:border-primary focus:bg-card focus:ring-[12px] focus:ring-primary/5 outline-none shadow-inner transition-all appearance-none cursor-pointer">
                       <option value="" className="bg-card">Gasto General</option>
                       {categories.map(cat => (
                         <option key={cat.id} value={cat.id} className="bg-card">{cat.name}</option>
                       ))}
                    </select>
                  </div>

                  <Button disabled={saving} type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-24 rounded-[36px] font-black text-xl shadow-[0_20px_50px_rgba(var(--primary),0.3)] active:scale-95 transition-all mt-6 uppercase tracking-[0.3em] border-none group">
                    {saving ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : (
                      <div className="flex items-center gap-4">
                        <span>Confirmar Auditoría</span>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                      </div>
                    )}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-background/40 backdrop-blur-2xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-card w-full max-w-lg rounded-[56px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] p-12 md:p-16 overflow-hidden border border-border/80"
            >
               <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
               
               <div className="flex items-center justify-between mb-12 relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-serif font-black text-foreground tracking-tighter">Nueva <span className="text-primary italic font-normal text-4xl">Categoría</span></h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Segmentación Estratégica</p>
                  </div>
                  <button onClick={() => setShowCategoryModal(false)} className="w-12 h-12 flex items-center justify-center hover:bg-rose-500/10 rounded-full text-muted-foreground/30 hover:text-rose-500 transition-all duration-500">
                    <XCircle className="w-8 h-8" />
                  </button>
               </div>

               <form onSubmit={handleAddCategory} className="space-y-10 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-6 flex items-center gap-2">
                       <Tag className="w-3.5 h-3.5" /> Nombre Identificador
                    </label>
                    <input required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full h-20 bg-muted/20 border-2 border-border/60 hover:border-primary/20 rounded-[32px] px-10 font-black text-xl focus:border-primary focus:bg-card focus:ring-[12px] focus:ring-primary/5 shadow-inner transition-all outline-none text-foreground" placeholder="Ej: Marketing Digital" />
                  </div>

                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 ml-6 flex items-center gap-2">
                       <PieChart className="w-3.5 h-3.5" /> Identidad Visual
                    </label>
                    <div className="flex flex-wrap gap-5 p-4 bg-muted/10 rounded-[32px] border border-border/40">
                       {["#E67E22", "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6", "#F1C40F", "var(--foreground)", "var(--primary)"].map(c => (
                         <button key={c} type="button" title={c} onClick={() => setCategoryForm({...categoryForm, color: c})} className={cn("w-12 h-12 rounded-[18px] border-4 transition-all duration-500 transform hover:rotate-12", categoryForm.color === c ? "border-primary scale-125 shadow-xl ring-[10px] ring-primary/10" : "border-transparent opacity-40 hover:opacity-100 hover:scale-110 shadow-sm")} style={{ backgroundColor: c }} />
                       ))}
                    </div>
                  </div>

                  <Button disabled={saving} type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-20 rounded-[32px] font-black text-sm uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(var(--primary),0.3)] active:scale-95 transition-all outline-none border-none">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Crear Segmento de Auditoría"}
                  </Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
