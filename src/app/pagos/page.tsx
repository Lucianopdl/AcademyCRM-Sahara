"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Search, 
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
  ChevronRight,
  Receipt,
  PieChart,
  FileText,
  MousePointer2,
  PlusCircle,
  TrendingDown,
  Printer
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ""
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    
    // Calculate month range for current selection
    const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
    const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Fetch payments for selected month
    const { data: payData } = await supabase
      .from('payments')
      .select(`
        *,
        students (
          full_name
        )
      `)
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false });

    if (payData) {
      setPayments(payData as unknown as PaymentTransaction[]);
      const total = payData.reduce((acc, curr) => acc + Number(curr.amount), 0);
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
  }, [selectedMonth]);

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
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor, ingresa un monto válido mayor a cero.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('payments')
      .insert([{
        student_id: selectedStudentId,
        amount: amount,
        payment_method: paymentForm.method,
        period_month: paymentForm.month,
        period_year: paymentForm.year,
        notes: paymentForm.notes || null,
        payment_date: new Date().toISOString(),
        status: 'completed'
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
      pdf.save(`Informe_Pagos_${months[selectedMonth.getMonth()]}_${selectedMonth.getFullYear()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGeneratingPdf(false);
    }
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

  const currentMonthPayments = payments;

  const stats = {
    cash: payments.filter(p => p.payment_method === 'cash').reduce((acc, p) => acc + p.amount, 0),
    transfer: payments.filter(p => p.payment_method === 'transfer').reduce((acc, p) => acc + p.amount, 0),
    card: payments.filter(p => p.payment_method === 'card').reduce((acc, p) => acc + p.amount, 0),
  };

  return (
    <DashboardShell>
      <div className="space-y-8 pb-20">
        {/* Header Section - Sahara Style */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Pagos y Cobros</h1>
            <p className="text-[#847365] font-medium opacity-80 mt-1">Gestión de recaudación y auditoría de alumnos.</p>
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
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <span className="mx-4 font-black text-[10px] uppercase tracking-widest min-w-[140px] text-center">
                {months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </span>
              <button 
                onClick={() => {
                  const d = new Date(selectedMonth);
                  d.setMonth(d.getMonth() + 1);
                  setSelectedMonth(d);
                }} 
                className="p-2 hover:text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <Button 
              onClick={() => setShowReportModal(true)} 
              variant="outline"
              className="border-[#E8E2DC] hover:bg-[#F5F1EE] text-[#847365] h-12 px-6 rounded-2xl gap-2 font-bold transition-all"
            >
              <FileText className="w-4 h-4" /> Informe
            </Button>

            <Button 
              onClick={() => setShowPaymentModal(true)} 
              className="bg-primary hover:bg-primary/90 text-white h-12 px-8 rounded-2xl gap-2 shadow-lg shadow-primary/20 font-bold"
            >
              <PlusCircle className="w-4 h-4" /> Registrar Cobro
            </Button>
          </div>
        </section>

        {/* Stats Grid - Sahara Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#2D241E] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group border border-white/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Recaudación Total</span>
              </div>
              <h2 className="text-4xl font-black mb-1">${monthlyTotal.toLocaleString('es-AR')}</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Balance del periodo seleccionado</p>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <DollarSign className="w-32 h-32 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700" />
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[40px] border border-[#E8E2DC] shadow-xl shadow-black/5 relative overflow-hidden group hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#F5F1EE] rounded-2xl flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                <Users className="w-6 h-6 text-[#847365] group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/60">Operaciones</span>
            </div>
            <h2 className="text-4xl font-black text-[#2D241E] mb-1">{payments.length}</h2>
            <p className="text-[10px] font-bold text-[#847365]/40 uppercase tracking-widest">Cobros registrados</p>
          </motion.div>
[diff_block_start]
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-[40px] border border-[#E8E2DC] shadow-xl shadow-black/5 relative overflow-hidden group hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#F5F1EE] rounded-2xl flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                <Wallet className="w-6 h-6 text-[#847365] group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#847365]/60">Promedio x Alumno</span>
            </div>
            <h2 className="text-4xl font-black text-[#2D241E] mb-1">
              ${payments.length > 0 ? (monthlyTotal / payments.length).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : 0}
            </h2>
            <p className="text-[10px] font-bold text-[#847365]/40 uppercase tracking-widest">Ticket promedio mensual</p>
          </motion.div>
        </div>

        {/* Search & List Container */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
            <h3 className="text-xl font-serif font-bold flex items-center gap-3">
              <History className="w-5 h-5 text-primary" /> Historial de Movimientos
            </h3>
            
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#847365]/40 group-focus-within:text-primary transition-colors" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por alumno..."
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl pl-12 pr-6 py-3.5 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-[#847365]/5">
                <Loader2 className="w-8 h-8 animate-spin text-primary/40 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-[#847365]/40">Consolidando transacciones...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-24 bg-[#F5F1EE]/30 rounded-[40px] border border-dashed border-[#847365]/10 px-6">
                <p className="font-serif italic text-2xl text-[#847365]/40 mb-2">Sin movimientos</p>
                <p className="text-xs font-black uppercase tracking-widest text-[#847365]/30">No se encontraron pagos para este periodo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPayments.map((payment) => (
                  <motion.div 
                    key={payment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group bg-white border border-[#E8E2DC] rounded-[24px] md:rounded-[32px] p-5 md:p-6 hover:border-primary/20 transition-all shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-[#F5F1EE] rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                        <span className="font-serif font-bold text-lg text-[#847365] group-hover:text-primary capitalize">{payment.students?.full_name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif font-bold text-base md:text-lg text-[#2D241E] truncate">{payment.students?.full_name}</h4>
                        <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#847365]/60">
                          <span className="shrink-0">{new Date(payment.payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                          <span className="w-1.5 h-1.5 bg-[#E8E2DC] rounded-full shrink-0" />
                          <span className="bg-[#F5F1EE] px-2 py-0.5 rounded text-[8px]">{payment.payment_method === 'cash' ? 'Efectivo' : payment.payment_method === 'transfer' ? 'Transf.' : 'Tarjeta'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div className="hidden md:block">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#847365]/40 mb-1">Periodo</p>
                        <p className="text-[10px] font-bold text-[#847365]">Mes {payment.period_month}/{payment.period_year}</p>
                      </div>
                      <div className="bg-[#F5F1EE]/50 px-4 py-2 md:px-6 md:py-3 rounded-2xl group-hover:bg-primary/5 transition-colors">
                        <p className="font-black text-lg md:text-xl text-primary">${payment.amount.toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Payment Modal - Improved Responsiveness */}
        <AnimatePresence mode="wait">
          {showPaymentModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center lg:p-6 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="bg-card w-full max-w-4xl h-full lg:h-auto lg:max-h-[90vh] lg:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-black/20 lg:border lg:border-border"
              >
                {/* Left: Selection - Scrollable column */}
                <div className="w-full md:w-[40%] bg-background p-6 lg:p-10 border-r border-border/50 overflow-y-auto max-h-[40vh] md:max-h-none">
                    <div className="mb-8 hidden md:block">
                      <h3 className="text-2xl font-serif font-bold mb-1">Seleccionar Alumno</h3>
                      <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-widest">Paso 1: Quién realiza el pago</p>
                    </div>

                    <div className="flex items-center justify-between md:hidden mb-6">
                        <h3 className="text-xl font-serif font-bold">Alumno</h3>
                        <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-secondary/5 rounded-full"><XCircle className="w-5 h-5 text-secondary/40" /></button>
                    </div>

                    <div className="relative mb-6">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                      <input 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="w-full bg-card border border-border/50 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
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
                              "w-full text-left p-4 lg:p-5 rounded-2xl lg:rounded-[24px] flex items-center justify-between group transition-all border",
                              selectedStudentId === student.id 
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                : "bg-card border-border/50 text-foreground hover:bg-primary/5 hover:border-primary/20"
                            )}
                          >
                            <div className="flex items-center gap-3 lg:gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold shadow-sm transition-colors",
                                selectedStudentId === student.id ? "bg-white/20 text-white" : "bg-background text-secondary border border-border"
                              )}>
                                {student.full_name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{student.full_name}</p>
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-widest truncate",
                                  selectedStudentId === student.id ? "text-white/60" : "text-secondary/40"
                                )}>
                                  {categories.find(c => c.id === student.category_id)?.name || 'Sin Categoría'}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 opacity-0 transition-all hidden sm:block", selectedStudentId === student.id ? "opacity-100 translate-x-1" : "group-hover:opacity-40 translate-x-1")} />
                          </button>
                        ))
                      }
                      {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                        <p className="text-center py-10 text-secondary/40 italic text-sm">No se encontraron alumnos.</p>
                      )}
                    </div>
                </div>

                {/* Right: Form - Main interactive part */}
                <div className="flex-1 p-6 lg:p-14 overflow-y-auto bg-card relative rounded-t-[32px] md:rounded-none shadow-[0_-8px_30px_rgba(0,0,0,0.05)] md:shadow-none">
                  <header className="flex items-center justify-between mb-8 lg:mb-10">
                    <div>
                      <h3 className="text-2xl lg:text-3xl font-serif font-bold">Detalles del Cobro</h3>
                      <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-widest hidden md:block">Paso 2: Completar transacción</p>
                    </div>
                    <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full hover:bg-white flex items-center justify-center transition-all group hidden md:flex">
                       <XCircle className="w-6 h-6 lg:w-8 lg:h-8 text-secondary/20 group-hover:text-red-500/60" />
                    </button>
                  </header>

                  <form onSubmit={handleSavePayment} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                    <div className="sm:col-span-2 space-y-2 lg:space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 ml-2">Monto a Percibir</label>
                      <div className="relative">
                        <span className="absolute left-6 lg:left-8 top-1/2 -translate-y-1/2 text-xl lg:text-2xl font-serif font-bold text-primary">$</span>
                        <input 
                          required
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                          className="w-full h-16 lg:h-20 bg-background border border-border/50 rounded-2xl lg:rounded-[32px] pl-10 lg:pl-16 pr-8 text-3xl lg:text-4xl font-serif font-black focus:ring-4 focus:ring-primary/10 transition-all shadow-inner outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 lg:space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 ml-2">Mes</label>
                      <select 
                        value={paymentForm.month}
                        onChange={(e) => setPaymentForm({...paymentForm, month: parseInt(e.target.value)})}
                        className="w-full h-12 lg:h-14 bg-background border border-border/50 rounded-xl lg:rounded-2xl px-5 font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                      >
                        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2 lg:space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 ml-2">Método</label>
                      <select 
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                        className="w-full h-12 lg:h-14 bg-background border border-border/50 rounded-xl lg:rounded-2xl px-5 font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="card">Tarjeta</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-2 lg:space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40 ml-2">Notas Especiales</label>
                      <input 
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                        placeholder="Ej: Pago adelantado..."
                        className="w-full h-12 lg:h-14 bg-background border border-border/50 rounded-xl lg:rounded-2xl px-5 font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-4 lg:pt-6">
                      <Button 
                        disabled={saving || !selectedStudentId || !paymentForm.amount}
                        type="submit"
                        className="w-full h-16 lg:h-20 bg-primary hover:bg-primary/90 text-white rounded-2xl lg:rounded-[32px] font-serif font-bold text-lg lg:text-xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-white" /> : "Confirmar Pago"}
                      </Button>
                      <p className="text-center mt-6 text-[10px] font-black uppercase tracking-widest text-secondary/40 flex items-center justify-center gap-2">
                        <Info className="w-3.5 h-3.5" /> La transacción impactará en el balance mensual
                      </p>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Improved Monthly Report Modal - Sahara Style */}
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
                    <button onClick={() => setShowReportModal(false)} className="md:hidden p-2"><ChevronRight className="rotate-180" /></button>
                    <div>
                      <h3 className="text-xl md:text-2xl font-serif font-bold leading-none">Informe de Recaudación</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 mt-1">{months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={generatingPdf} onClick={generateReportPdf} variant="outline" className="hidden sm:flex rounded-xl gap-2 border-[#E8E2DC]">
                      {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                      Exportar PDF
                    </Button>
                    <button onClick={() => setShowReportModal(false)} className="hidden md:flex p-2 hover:bg-red-50 rounded-full text-[#847365]/40 hover:text-red-500 transition-all">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Document Preview */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#F5F1EE]/30">
                  <div ref={reportRef} className="bg-white shadow-xl rounded-[24px] md:rounded-[32px] p-6 md:p-12 max-w-2xl mx-auto border border-[#847365]/5 min-h-[80vh] flex flex-col font-sans">
                     <div className="flex justify-between items-start mb-12">
                        <div className="px-4 py-2 bg-[#2D241E] rounded-xl text-white font-black italic tracking-tighter">SAHARA</div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Periodo de Liquidación</p>
                           <p className="text-xs font-bold">{months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</p>
                        </div>
                     </div>

                     <div className="p-8 bg-[#FDFCFB] rounded-3xl border border-[#847365]/5 text-center mb-12">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 mb-2">Ingresos Consolidados</p>
                        <p className="text-4xl font-black text-primary">${monthlyTotal.toLocaleString('es-AR')}</p>
                     </div>

                     <div className="mb-12">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-4 px-2">Desglose por Método</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center py-3 px-4 border-b border-[#F5F1EE]">
                              <span className="text-sm font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500" />Efectivo</span>
                              <span className="text-sm font-black text-[#847365]">${stats.cash.toLocaleString('es-AR')}</span>
                           </div>
                           <div className="flex justify-between items-center py-3 px-4 border-b border-[#F5F1EE]">
                              <span className="text-sm font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500" />Transferencia</span>
                              <span className="text-sm font-black text-[#847365]">${stats.transfer.toLocaleString('es-AR')}</span>
                           </div>
                           <div className="flex justify-between items-center py-3 px-4 border-b border-[#F5F1EE]">
                              <span className="text-sm font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-orange-500" />Tarjeta</span>
                              <span className="text-sm font-black text-[#847365]">${stats.card.toLocaleString('es-AR')}</span>
                           </div>
                        </div>
                     </div>

                     <div className="mt-auto pt-8 border-t border-[#847365]/10 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-1">Total de Operaciones</p>
                        <p className="text-2xl font-black text-[#2D241E]">{payments.length} transacciones</p>
                     </div>
                  </div>
                  
                  {/* Floating Action for Mobile PDF */}
                  <div className="mt-6 md:hidden">
                    <Button disabled={generatingPdf} onClick={generateReportPdf} className="w-full h-14 rounded-2xl bg-primary text-white font-black gap-2">
                       <Download className="w-5 h-5" /> Descargar Auditoría (PDF)
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}


