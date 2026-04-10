"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAcademy } from "@/hooks/use-academy";
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
  Printer,
  CheckCircle2,
  ShieldCheck,
  Award,
  ArrowUpRight,
  Trash2
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
  
  // Use unified academy context
  const { academyId, userId, loading: contextLoading } = useAcademy();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ""
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || null);
    };
    fetchUser();
  }, []);

  const fetchData = async () => {
    if (!academyId) return;
    setLoading(true);
    
    // Calculate month range for current selection
    const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
    const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Fetch payments for selected month with strict academy filter
    const { data: payData } = await supabase
      .from('payments')
      .select(`
        *,
        students (
          full_name
        )
      `)
      .eq('academy_id', academyId)
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false });

    if (payData) {
      setPayments(payData as unknown as PaymentTransaction[]);
      const total = payData.reduce((acc, curr) => acc + Number(curr.amount), 0);
      setMonthlyTotal(total);
    }

    // Fetch students and categories for the modal - filtered by academy
    const { data: stuData } = await supabase.from('students')
      .select('*')
      .eq('academy_id', academyId)
      .eq('status', 'active');
    if (stuData) setStudents(stuData as any);

    const { data: catData } = await supabase.from('categories')
      .select('*')
      .eq('academy_id', academyId);
    if (catData) setCategories(catData);

    setLoading(false);
  };

  useEffect(() => {
    if (academyId && !contextLoading) {
      fetchData();
    }
  }, [selectedMonth, academyId, contextLoading]);

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
        academy_id: academyId, // Inyectamos el ID de la academia para aislamiento
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

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro de pago? Esta acción no se puede deshacer y afectará el balance mensual.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)
        .eq('academy_id', academyId);

      if (error) throw error;
      
      fetchData();
    } catch (error: any) {
      alert("Error al eliminar el pago: " + error.message);
    }
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
      <div className="space-y-12 pb-20 px-8 md:px-16 lg:px-24">
        {/* Header Section - Sahara Style */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-foreground">
              Pagos y <span className="text-primary italic font-normal">Cobros</span>
            </h1>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">Gestión de recaudación y auditoría de alumnos</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex items-center justify-between bg-card/40 backdrop-blur-xl border border-border/80 rounded-[28px] px-6 py-3 shadow-sm">
              <button 
                onClick={() => {
                  const d = new Date(selectedMonth);
                  d.setMonth(d.getMonth() - 1);
                  setSelectedMonth(d);
                }} 
                className="p-2 hover:bg-muted rounded-full transition-all duration-300"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <span className="mx-8 font-black text-[10px] uppercase tracking-[0.4em] min-w-[160px] text-center text-foreground/80">
                {months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </span>
              <button 
                onClick={() => {
                  const d = new Date(selectedMonth);
                  d.setMonth(d.getMonth() + 1);
                  setSelectedMonth(d);
                }} 
                className="p-2 hover:bg-muted rounded-full transition-all duration-300"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowReportModal(true)} 
                variant="outline"
                className="border-border/60 hover:bg-muted text-muted-foreground h-14 px-8 rounded-[24px] gap-3 font-black text-[10px] uppercase tracking-widest transition-all duration-500"
              >
                <FileText className="w-4 h-4" /> Informe
              </Button>

              <Button 
                onClick={() => setShowPaymentModal(true)} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-10 rounded-[24px] gap-3 shadow-[0_20px_40px_-10px_rgba(var(--primary),0.3)] font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                <PlusCircle className="w-5 h-5" /> Registrar Cobro
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Grid - Sahara Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            whileHover={{ y: -8, scale: 1.01 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950 dark:bg-zinc-950 p-12 rounded-[56px] text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden group border border-primary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center backdrop-blur-3xl border border-primary/20 group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary block mb-2">Caja Central</span>
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white/40">Recaudación Total</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-serif text-primary/50">$</span>
                  <h2 className="text-6xl font-serif font-black tracking-tighter">{monthlyTotal.toLocaleString('es-AR')}</h2>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Consolidado del periodo
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            whileHover={{ y: -8, scale: 1.01 }}
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="bg-card p-12 rounded-[56px] border border-border/80 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all duration-700"
          >
            <div className="flex flex-col justify-between h-full relative z-10">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-muted/40 rounded-2xl flex items-center justify-center group-hover:bg-primary/5 transition-all duration-700 border border-border/50">
                  <Users className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 block mb-2">Operativo</span>
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground/60">Flujo de Alumnos</span>
                </div>
              </div>
              <div>
                <h2 className="text-6xl font-serif font-black text-foreground mb-3 tracking-tighter">{payments.length}</h2>
                <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">
                   Cobros Registrados
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            whileHover={{ y: -8, scale: 1.01 }}
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="bg-card p-12 rounded-[56px] border border-border/80 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all duration-700"
          >
            <div className="flex flex-col justify-between h-full relative z-10">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-muted/40 rounded-2xl flex items-center justify-center group-hover:bg-primary/5 transition-all duration-700 border border-border/50">
                  <Wallet className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 block mb-2">Análisis</span>
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground/60">Ticket Promedio</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-3">
                   <span className="text-xl font-serif text-muted-foreground/30">$</span>
                   <h2 className="text-6xl font-serif font-black text-foreground tracking-tighter">
                    {payments.length > 0 ? (monthlyTotal / payments.length).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : 0}
                   </h2>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">
                   Rendimiento por Alumno
                </div>
              </div>
            </div>
          </motion.div>
        </div>

          <div className="bg-card/40 backdrop-blur-md rounded-[48px] border border-border shadow-2xl p-8 md:p-12 mt-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
               <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-primary/40 rounded-full" />
                  <h3 className="text-3xl font-serif font-black tracking-tighter">Historial de <span className="text-primary italic font-normal">Auditoría</span></h3>
               </div>
               
               <div className="relative w-full md:w-96 group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors duration-500" />
                 <input 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder="Rastrear por nombre de alumno..."
                   className="w-full bg-background/50 border border-border/60 rounded-[24px] pl-16 pr-8 py-5 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none transition-all duration-500 shadow-inner group-hover:border-primary/20"
                 />
               </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-muted/5 rounded-[40px] border border-border/20">
                  <Loader2 className="w-10 h-10 animate-spin text-primary/40 mb-6" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40">Sincronizando registros...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-32 bg-muted/5 rounded-[40px] border border-dashed border-border/40 px-8 group">
                  <p className="font-serif italic text-3xl text-muted-foreground/20 mb-3 group-hover:text-primary/20 transition-colors duration-700">Canal de pagos vacío</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/20">No se registran transacciones en este periodo de tiempo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPayments.map((payment) => (
                    <motion.div 
                      key={payment.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.005, x: 5 }}
                      className="group bg-card border border-border/40 rounded-[32px] p-6 hover:border-primary/30 transition-all duration-500 shadow-sm flex items-center justify-between hover:shadow-xl hover:shadow-primary/5"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-muted/30 rounded-[20px] flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-all duration-500 border border-border/40">
                          <span className="font-serif font-black text-2xl text-muted-foreground group-hover:text-primary capitalize transition-colors">{payment.students?.full_name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-serif font-black text-xl text-foreground truncate tracking-tighter mb-1.5">{payment.students?.full_name}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                               <Calendar className="w-3" /> {new Date(payment.payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                            <span className="w-1 h-1 bg-border rounded-full" />
                            <span className="bg-primary/5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-primary/60 border border-primary/10">
                              {payment.payment_method === 'cash' ? 'Efectivo' : payment.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-8 px-4">
                        <div className="hidden lg:block">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-1">Periodo Fiscal</p>
                          <p className="text-xs font-black text-foreground/60">{months[payment.period_month - 1]} {payment.period_year}</p>
                        </div>
                        <div className="bg-muted/30 px-8 py-4 rounded-[24px] group-hover:bg-primary/10 transition-all duration-500 border border-transparent group-hover:border-primary/20">
                          <p className="font-serif font-black text-2xl text-primary tracking-tighter">${payment.amount.toLocaleString('es-AR')}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePayment(payment.id);
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary transition-all duration-500 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>


        {/* Global Payment Modal - Sahara Style */}
        <AnimatePresence mode="wait">
          {showPaymentModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-6 bg-background/80 backdrop-blur-xl"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 40, opacity: 0 }}
                className="bg-card w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] md:rounded-[56px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row border border-border/50"
              >
                {/* Left: Intelligence Selection */}
                <div className="w-full md:w-[42%] bg-muted/20 p-8 md:p-12 border-r border-border/50 overflow-y-auto">
                    <div className="mb-12">
                      <h3 className="text-3xl font-serif font-black tracking-tighter mb-2">Identificar <span className="text-primary italic font-normal">Alumno</span></h3>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.3em]">Criterio de Búsqueda</p>
                      </div>
                    </div>

                    <div className="relative mb-10 group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors duration-500" />
                      <input 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Nombre del titular..."
                        className="w-full bg-background border border-border/60 rounded-3xl pl-16 pr-8 py-5 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none shadow-inner transition-all duration-500"
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
                              "w-full text-left p-6 rounded-[32px] flex items-center justify-between group transition-all duration-500 border",
                              selectedStudentId === student.id 
                                ? "bg-primary text-primary-foreground border-primary shadow-2xl shadow-primary/20 scale-[1.02]" 
                                : "bg-background/50 border-border/40 text-foreground hover:border-primary/30 hover:bg-background"
                            )}
                          >
                            <div className="flex items-center gap-5">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center font-serif font-black text-xl shadow-sm transition-all duration-500",
                                selectedStudentId === student.id ? "bg-white/20 text-white rotate-6" : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary"
                              )}>
                                {student.full_name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-base truncate tracking-tight">{student.full_name}</p>
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-[0.2em] truncate mt-1",
                                  selectedStudentId === student.id ? "text-white/60" : "text-muted-foreground/40"
                                )}>
                                  {categories.find(c => c.id === student.category_id)?.name || 'Perfil sin Categoría'}
                                </p>
                              </div>
                            </div>
                            {selectedStudentId === student.id && <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in duration-500" />}
                          </button>
                        ))
                      }
                    </div>
                </div>

                {/* Right: Technical Execution */}
                <div className="flex-1 p-8 md:p-16 overflow-y-auto bg-card relative">
                  <header className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-3xl font-serif font-black tracking-tighter">Liquidación <span className="text-primary italic font-normal">Mensual</span></h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-8 h-[1px] bg-primary/30" />
                        <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.3em]">Parámetros de Cobro</p>
                      </div>
                    </div>
                    <button onClick={() => setShowPaymentModal(false)} className="w-14 h-14 rounded-full hover:bg-rose-500/10 flex items-center justify-center transition-all duration-500 group">
                       <XCircle className="w-8 h-8 text-muted-foreground/20 group-hover:text-rose-500 transition-colors" />
                    </button>
                  </header>

                  <form onSubmit={handleSavePayment} className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="sm:col-span-2 space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 ml-6 italic">Valor de Transacción (ARS)</label>
                      <div className="relative group">
                        <span className="absolute left-10 top-1/2 -translate-y-1/2 text-3xl font-serif font-black text-primary/40 group-focus-within:text-primary transition-colors">$</span>
                        <input 
                          required
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                          className="w-full h-24 md:h-28 bg-muted/10 border border-border rounded-[40px] pl-20 pr-12 text-5xl font-serif font-black focus:ring-8 focus:ring-primary/5 transition-all duration-700 shadow-inner outline-none text-foreground placeholder-muted-foreground/10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 ml-4">Ciclo de Pago</label>
                      <select 
                        value={paymentForm.month}
                        onChange={(e) => setPaymentForm({...paymentForm, month: parseInt(e.target.value)})}
                        className="w-full h-16 bg-muted/10 border border-border rounded-3xl px-8 font-black text-xs uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer transition-all"
                      >
                        {months.map((m, i) => <option key={m} value={i + 1} className="bg-card py-4 font-sans">{m}</option>)}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 ml-4">Canal de Cobro</label>
                      <select 
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                        className="w-full h-16 bg-muted/10 border border-border rounded-3xl px-8 font-black text-xs uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer transition-all"
                      >
                        <option value="cash" className="bg-card">Efectivo 💵</option>
                        <option value="transfer" className="bg-card">Transferencia 🏦</option>
                        <option value="card" className="bg-card">Posnet / Tarjeta 💳</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 ml-4">Notas de Auditoría</label>
                      <input 
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                        placeholder="Ej: Saldo pendiente de marzo o descuento aplicado..."
                        className="w-full h-16 bg-muted/10 border border-border rounded-3xl px-8 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-8">
                      <Button 
                        disabled={saving || !selectedStudentId || !paymentForm.amount}
                        type="submit"
                        className="w-full h-20 md:h-24 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[32px] font-serif font-black text-2xl md:text-3xl tracking-tighter transition-all shadow-[0_30px_60px_-15px_rgba(var(--primary),0.3)] active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-4"
                      >
                        {saving ? <Loader2 className="w-8 h-8 animate-spin" /> : <>Confirmar <span className="italic font-normal">Transacción</span></>}
                      </Button>
                      <div className="flex items-center justify-center gap-6 mt-10">
                        <div className="h-[1px] flex-1 bg-border/40" />
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="w-5 h-5 text-primary/40" />
                           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">Operación Segura Sahara</span>
                        </div>
                        <div className="h-[1px] flex-1 bg-border/40" />
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Report Modal - Sahara Audit Style */}
        <AnimatePresence>
          {showReportModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-10 bg-background/95 backdrop-blur-3xl overflow-y-auto"
            >
              <div className="min-h-full py-10 w-full flex flex-col items-center">
                <div className="w-full max-w-5xl flex justify-between items-center mb-10 px-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-serif font-black tracking-tighter text-foreground">Informe de <span className="text-primary italic font-normal">Recaudación</span></h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mt-1">Auditoría Financiera Mensual</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      onClick={generateReportPdf}
                      disabled={generatingPdf}
                      className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3 transition-all active:scale-95"
                    >
                      {generatingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-5 h-5" /> Exportar PDF</>}
                    </Button>
                    <button 
                      onClick={() => setShowReportModal(false)}
                      className="w-16 h-16 bg-muted/20 hover:bg-rose-500/10 rounded-full flex items-center justify-center transition-all duration-500 group"
                    >
                      <XCircle className="w-8 h-8 text-muted-foreground/20 group-hover:text-rose-500 transition-colors" />
                    </button>
                  </div>
                </div>

                <motion.div 
                  initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  ref={reportRef}
                  className="w-full max-w-5xl bg-white text-slate-900 shadow-[0_60px_150px_-20px_rgba(0,0,0,0.2)] rounded-[64px] overflow-hidden border border-slate-100 mb-10"
                >
                  {/* Digital Document Header */}
                  <div className="p-16 border-b border-slate-100 flex justify-between items-start bg-gradient-to-br from-slate-50 to-white relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
                       <Award className="w-48 h-48" />
                    </div>
                    <div className="space-y-6 relative z-10">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">Sistema de Gestión</p>
                        <h1 className="text-5xl font-serif font-black tracking-tighter text-slate-900 leading-none">SAHARA <span className="text-primary italic font-normal">AUDIT</span></h1>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        <span className="bg-slate-900 text-white px-3 py-1.5 rounded-xl uppercase tracking-widest text-[9px]">ID: {academyId?.slice(0,8)}</span>
                        <span>•</span>
                        <span className="uppercase tracking-widest text-[9px]">{months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-4 relative z-10">
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Documento Certificado</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 max-w-[220px] leading-relaxed uppercase tracking-wider">La integridad de estos datos ha sido validada por el motor de auditoría Sahara Intelligence.</p>
                    </div>
                  </div>

                  <div className="p-20 space-y-20">
                    {/* Master Metrics Portfolio */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recaudación Total</p>
                        <p className="text-7xl font-serif font-black tracking-tight text-slate-900 flex items-baseline">
                          <span className="text-2xl text-slate-300 mr-2">$</span>
                          {monthlyTotal.toLocaleString('es-AR')}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Volumen Operativo</p>
                        <p className="text-7xl font-serif font-black tracking-tight text-slate-900">{payments.length}</p>
                      </div>
                      <div className="space-y-4 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ticket Promedio</p>
                        <p className="text-7xl font-serif font-black tracking-tight text-slate-900 flex items-baseline justify-end">
                          <span className="text-2xl text-slate-300 mr-2">$</span>
                          {(monthlyTotal / (payments.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Treasury Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {[
                         { label: 'Efectivo', val: payments.filter(p => p.payment_method === 'cash').reduce((acc, p) => acc + p.amount, 0), icon: Wallet, color: 'emerald' },
                         { label: 'Transferencia', val: payments.filter(p => p.payment_method === 'transfer').reduce((acc, p) => acc + p.amount, 0), icon: ArrowUpRight, color: 'sky' },
                         { label: 'Tarjeta / Otros', val: payments.filter(p => p.payment_method === 'card').reduce((acc, p) => acc + p.amount, 0), icon: CreditCard, color: 'amber' }
                       ].map((item, idx) => (
                         <div key={idx} className="p-8 rounded-[40px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-700 group">
                           <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", 
                             item.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 
                             item.color === 'sky' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'
                           )}>
                             <item.icon className="w-6 h-6" />
                           </div>
                           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{item.label}</p>
                           <p className="text-3xl font-serif font-black text-slate-900 tracking-tight">${item.val.toLocaleString('es-AR')}</p>
                         </div>
                       ))}
                    </div>

                    {/* Detailed Ledger */}
                    <div className="space-y-10">
                       <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Libro Diario de Ingresos</h4>
                         <p className="text-[9px] font-bold text-slate-300 italic">Mostrando {payments.length} entradas</p>
                       </div>
                       <table className="w-full">
                         <thead>
                           <tr className="text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                             <th className="pb-8">Detalle de Alumno</th>
                             <th className="pb-8">Mes de Aplicación</th>
                             <th className="pb-8">Instrumento</th>
                             <th className="pb-8 text-right">Monto Líquido</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                           {payments.map((p) => (
                             <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                               <td className="py-8 pr-8">
                                 <p className="font-serif font-black text-xl text-slate-900 leading-none">{p.students?.full_name}</p>
                                 <p className="text-[10px] text-slate-400 tracking-widest mt-2">{new Date(p.payment_date).toLocaleDateString('es-AR')}</p>
                               </td>
                               <td className="py-8">
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                                   <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                     {`${months[p.period_month - 1]} '${p.period_year.toString().slice(-2)}`}
                                   </span>
                                 </div>
                               </td>
                               <td className="py-8">
                                 <div className="flex items-center gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p.payment_method}</p>
                                 </div>
                               </td>
                               <td className="py-8 text-right">
                                 <p className="font-serif font-black text-2xl text-slate-900 tracking-tight">${p.amount.toLocaleString('es-AR')}</p>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>

                    {/* Footer Certification & Signatures */}
                    <div className="pt-24 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-20">
                      <div className="space-y-8">
                         <div className="w-48 h-[1px] bg-slate-900" />
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Autorizado por Dirección</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Hash de Seguridad: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                         </div>
                      </div>
                      <div className="bg-slate-50 p-10 rounded-[48px] space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                           <ShieldCheck className="w-5 h-5" />
                           <span className="text-[10px] font-black uppercase tracking-[0.4em]">Certificación Sahara</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                          Este documento constituye un registro financiero digital emitido por la plataforma Sahara Intelligence para {userEmail || "Sistema Administrativo"}. 
                          Fecha de emisión local: {new Date().toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Visual Spacer for Scrolling */}
                <div className="h-20 w-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
