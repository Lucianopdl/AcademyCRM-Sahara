"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { Sidebar } from "@/components/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  CreditCard, 
  History, 
  ClipboardCheck, 
  Download, 
  MessageSquare, 
  Plus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign,
  Users,
  Receipt,
  Printer,
  MessageCircle,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generateReceiptPDF } from "@/lib/utils/pdf";
import { getWhatsAppLink, createPaymentMessage } from "@/lib/utils/whatsapp";

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  birthdate: string | null;
  status: 'active' | 'inactive' | 'on_hold';
  enrollment_date: string;
  address: string | null;
  category_id: string | null;
}

interface Fee {
  id: string;
  month: number;
  year: number;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'canceled';
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  fee_id: string | null;
  receipt_number: string | null;
}

interface Enrollment {
  id: string;
  class_id: string;
  classes: {
    name: string;
    teacher_name: string;
    schedule: string;
  };
}

interface ClassOption {
  id: string;
  name: string;
  teacher_name: string;
}

interface AttendanceRecord {
  id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'justified';
  notes: string | null;
}


const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'financial' | 'attendance'>('financial');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    getSession();
  }, []);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    notes: ""
  });

  // Receipt Modal State (on-demand regeneration)
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    payment: Payment;
    fee: Fee | null;
  } | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const generatePdfBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    if (!receiptRef.current || !receiptModal || !student) return null;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const yOffset = (297 - imgHeight) / 2;
      pdf.addImage(imgData, 'PNG', 0, yOffset > 0 ? yOffset : 10, imgWidth, imgHeight);
      const receiptNum = receiptModal.payment.receipt_number || receiptModal.payment.id.split('-')[0].toUpperCase();
      const filename = `Comprobante_${receiptNum}.pdf`;
      const blob = pdf.output('blob');
      return { blob, filename };
    } catch (err) {
      console.error('Error generating PDF:', err);
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const openReceipt = (payment: Payment) => {
    const fee = fees.find(f => f.id === payment.fee_id) || null;
    setReceiptModal({ isOpen: true, payment, fee });
  };

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch Student
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (studentData) setStudent(studentData);

    // 2. Fetch Fees
    const { data: feesData } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (feesData) setFees(feesData);

    // 3. Fetch Payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', id)
      .order('payment_date', { ascending: false });
    
    if (paymentsData) setPayments(paymentsData);

    // 4. Fetch Enrollments
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('*, classes(name, teacher_name, schedule)')
      .eq('student_id', id);
    
    if (enrollData) setEnrollments(enrollData as any);

    // 5. Fetch All Classes for Selector
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, teacher_name')
      .order('name');
    
    if (classesData) setAvailableClasses(classesData);

    // 6. Fetch Attendance for Current Date
    fetchAttendance(format(new Date(), 'yyyy-MM-dd'));


    setLoading(false);
  };
  const fetchAttendance = async (date: string) => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', id)
      .eq('date', date);
    
    if (data) setAttendance(data);
  };

  const handleMarkAttendance = async (classId: string, status: 'present' | 'absent' | 'late' | 'justified') => {
    setSaving(true);
    
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          currentUserId = session.user.id;
          setUserId(session.user.id);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Sesión no válida o expirada. Por favor, refrescá la página.");
          currentUserId = user.id;
          setUserId(user.id);
        }
      }

      // Upsert logic
      const { error } = await supabase
        .from('attendance')
        .upsert({
          user_id: currentUserId,
        student_id: id,
        class_id: classId,
        date: attendanceDate,
        status: status
      }, {
        onConflict: 'student_id, class_id, date'
      });

      if (error) {
        console.error(error);
        alert("Error al registrar asistencia");
      } else {
        fetchAttendance(attendanceDate);
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al registrar asistencia");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedFee) return;

    setSaving(true);
    const amount = parseFloat(paymentForm.amount);
    
    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert([
        {
          student_id: student.id,
          fee_id: selectedFee.id,
          amount,
          payment_method: paymentForm.method,
          notes: paymentForm.notes || null,
          payment_date: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (!error && newPayment) {
      // 1. Generate PDF
      const pdfBlob = generateReceiptPDF({
        studentName: student.full_name,
        studentDni: student.dni || undefined,
        amount,
        month: months[selectedFee.month - 1],
        year: selectedFee.year,
        paymentMethod: paymentForm.method,
        receiptNumber: newPayment.id.split('-')[0].toUpperCase(),
        academyName: "Academia Sahara" // Potentially fetch from settings
      });

      // 2. Download automatically
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Recibo_${student.full_name.replace(' ', '_')}_${months[selectedFee.month - 1]}.pdf`;
      link.click();

      // 3. Close & Refresh
      setShowPaymentModal(false);
      fetchData();
      
      // 4. Offer WhatsApp
      if (student.phone) {
          const msg = createPaymentMessage(student.full_name, months[selectedFee.month - 1], selectedFee.year, amount);
          window.open(getWhatsAppLink(student.phone, msg), '_blank');
      }
    } else {
      alert("Error guardando el pago: " + (error?.message || "Unknown error"));
    }
    setSaving(false);
  };

  const handleEnroll = async (classId: string) => {
    if (enrollments.some(e => e.class_id === classId)) return;
    
    const { error } = await supabase
      .from('enrollments')
      .insert([{ student_id: id, class_id: classId }]);
    
    if (!error) fetchData();
  };

  const handleUnenroll = async (enrollmentId: string) => {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);
    
    if (!error) fetchData();
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFCFB]">
      <Loader2 className="w-10 h-10 animate-spin text-[#E67E22] opacity-40" />
    </div>
  );

  if (!student) return <div className="p-20 text-center">Alumno no encontrado.</div>;

  return (
    <div className="flex bg-[#FDFCFB] min-h-screen text-[#2D241E] font-sans">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {/* Header con navegación de vuelta */}
        <header className="mb-8">
          <Link href="/alumnos" className="inline-flex items-center gap-2 text-[#847365] hover:text-[#E67E22] transition-colors mb-6 font-medium group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al listado
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-[32px] bg-[#E67E22] text-white flex items-center justify-center font-serif font-bold text-4xl shadow-xl">
                {student.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-serif font-bold tracking-tight">{student.full_name}</h1>
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    student.status === 'active' ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                  )}>
                    {student.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-[#847365] font-medium opacity-80 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Ingresó el {format(new Date(student.enrollment_date), "PP", { locale: es })}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
               <Button onClick={() => window.open(getWhatsAppLink(student.phone || "", "Hola!"), "_blank")} className="bg-[#2D241E] text-white hover:bg-[#128C7E] h-12 px-6 rounded-2xl gap-2 shadow-lg transition-all active:scale-95">
                 <MessageSquare className="w-4 h-4" /> WhatsApp
               </Button>
            </div>
          </div>
        </header>

        {/* Tabs de Navegación Interna */}
        <nav className="flex border-b border-[#847365]/10 mb-10 gap-8">
           <button onClick={() => setActiveTab('financial')} className={cn("pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative", activeTab === 'financial' ? "text-[#E67E22]" : "text-[#847365]/40")}>
             Económico {activeTab === 'financial' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E67E22] rounded-full" />}
           </button>
           <button onClick={() => setActiveTab('info')} className={cn("pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative", activeTab === 'info' ? "text-[#E67E22]" : "text-[#847365]/40")}>
             Datos Personales {activeTab === 'info' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E67E22] rounded-full" />}
           </button>
           <button onClick={() => setActiveTab('attendance')} className={cn("pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative", activeTab === 'attendance' ? "text-[#E67E22]" : "text-[#847365]/40")}>
             Asistencia {activeTab === 'attendance' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E67E22] rounded-full" />}
           </button>
        </nav>

        {/* Contenido Dinámico */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          <div className="lg:col-span-2 space-y-10">
            {activeTab === 'financial' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                 <section className="bg-white rounded-[40px] border border-[#847365]/5 shadow-sm p-8 mb-10">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-serif font-bold flex items-center gap-3"><CreditCard className="w-5 h-5 text-[#E67E22]" /> Estado de Cuotas</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {fees.length === 0 ? (
                        <div className="text-center py-10 text-[#847365]/60 bg-[#F5F1EE]/30 rounded-3xl">No hay cuotas generadas para este alumno.</div>
                      ) : fees.map(fee => (
                          <div key={fee.id} className="flex items-center justify-between p-6 bg-[#F5F1EE]/20 rounded-3xl border border-transparent hover:border-[#E67E22]/10 transition-all">
                             <div className="flex items-center gap-5">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", 
                                  fee.status === 'paid' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
                                  {fee.status === 'paid' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                   <p className="font-bold text-lg">{months[fee.month - 1]} {fee.year}</p>
                                   <p className="text-xs text-[#847365] font-medium">Pagado: ${fee.paid_amount.toLocaleString()} / ${fee.total_amount.toLocaleString()}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                {fee.status !== 'paid' && (
                                   <Button onClick={() => { setSelectedFee(fee); setPaymentForm({...paymentForm, amount: (fee.total_amount - fee.paid_amount).toString()}); setShowPaymentModal(true); }} className="bg-[#2D241E] text-white hover:bg-[#E67E22] px-6 h-10 rounded-xl font-bold text-xs uppercase">Cobrar</Button>
                                )}
                             </div>
                          </div>
                      ))}
                    </div>
                 </section>

                 <section className="bg-white rounded-[40px] border border-[#847365]/5 shadow-sm p-8">
                    <h3 className="text-xl font-serif font-bold flex items-center gap-3 mb-8 text-[#847365]/60"><History className="w-5 h-5" /> Historial de Comprobantes</h3>
                    <div className="overflow-hidden">
                       {payments.length === 0 ? (
                         <div className="text-center py-10 text-[#847365]/60 bg-[#F5F1EE]/30 rounded-3xl">No hay pagos registrados aún.</div>
                       ) : (
                       <table className="w-full text-left">
                          <thead>
                             <tr className="border-b border-[#847365]/5">
                               <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">N° Recibo</th>
                               <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Monto</th>
                               <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Fecha</th>
                               <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#847365]/40">Método</th>
                               <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-[#847365]/40 text-right">Acción</th>
                             </tr>
                          </thead>
                          <tbody>
                             {payments.map(p => (
                                <tr key={p.id} className="border-b border-[#847365]/5 last:border-0 group hover:bg-[#F5F1EE]/30 transition-colors">
                                   <td className="py-4">
                                     {p.receipt_number ? (
                                       <span className="inline-flex items-center gap-1.5 bg-[#2D241E] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                         <Receipt className="w-3 h-3" />
                                         {p.receipt_number}
                                       </span>
                                     ) : (
                                       <span className="text-[10px] text-[#847365]/40 font-mono">#{p.id.split('-')[0].toUpperCase()}</span>
                                     )}
                                   </td>
                                   <td className="py-4 font-black text-[#E67E22] text-base">${p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                   <td className="py-4 text-sm font-medium text-[#847365]">{format(new Date(p.payment_date), "dd/MM/yy HH:mm")}</td>
                                   <td className="py-4">
                                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                                        p.payment_method === 'cash' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                      }`}>{p.payment_method === 'cash' ? 'Efectivo' : p.payment_method === 'transfer' ? 'Transferencia' : p.payment_method}</span>
                                   </td>
                                   <td className="py-4 text-right">
                                     <button
                                       onClick={() => openReceipt(p)}
                                       className="inline-flex items-center gap-1.5 bg-[#E67E22]/10 hover:bg-[#E67E22] text-[#E67E22] hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                     >
                                       <Eye className="w-3.5 h-3.5" />
                                       Ver Recibo
                                     </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                       )}
                    </div>
                 </section>
              </motion.div>
            )}

            {activeTab === 'info' && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] border border-[#847365]/5 shadow-sm p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-2 block">DNI / Documento</label><p className="text-xl font-serif font-bold">{student.dni || '-'}</p></div>
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-2 block">Fecha de Nacimiento</label><p className="text-xl font-serif font-bold">{student.birthdate ? format(new Date(student.birthdate), "dd/MM/yyyy") : '-'}</p></div>
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-2 block">Dirección</label><p className="text-lg font-medium text-[#847365] flex items-center gap-2"><MapPin className="w-4 h-4" /> {student.address || '-'}</p></div>
                  </div>
                  <div className="space-y-8">
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-2 block">Teléfono de Contacto</label><p className="text-xl font-serif font-bold flex items-center gap-2"><Phone className="w-5 h-5 text-[#E67E22]" /> {student.phone || '-'}</p></div>
                     <div><label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/40 mb-2 block">Correo Electrónico</label><p className="text-lg font-medium text-[#847365] flex items-center gap-2"><Mail className="w-5 h-5" /> {student.email || '-'}</p></div>
                  </div>
               </motion.div>
            )}

            {activeTab === 'attendance' && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                  <section className="bg-white rounded-[40px] border border-[#847365]/5 shadow-sm p-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                      <div>
                        <h3 className="text-2xl font-serif font-bold text-[#2D241E] flex items-center gap-3">
                          <ClipboardCheck className="w-6 h-6 text-[#E67E22]" /> Inscripción Académica
                        </h3>
                        <p className="text-sm text-[#847365] font-medium opacity-60">Gestiona las clases específicas de este alumno.</p>
                      </div>
                      
                      <div className="relative group">
                         <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#847365]/40 group-hover:text-[#E67E22] transition-colors" />
                         <select 
                           className="w-full md:w-64 bg-[#F5F1EE]/50 border-2 border-transparent focus:border-[#E67E22]/20 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-black text-[#847365] uppercase tracking-widest outline-none cursor-pointer hover:bg-[#F5F1EE] transition-all appearance-none"
                           onChange={(e) => { if(e.target.value) handleEnroll(e.target.value); e.target.value = ""; }}
                         >
                           <option value="" className="text-[#847365]/40">Inscribir en...</option>
                           {availableClasses.filter(c => !enrollments.some(e => e.class_id === c.id)).map(c => (
                             <option key={c.id} value={c.id} className="text-[#2D241E] font-medium py-4">{c.name}</option>
                           ))}
                         </select>
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#847365]/40">
                            <ArrowLeft className="w-3 h-3 rotate-[-90deg]" />
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {enrollments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#F5F1EE]/10 rounded-[32px] border-2 border-dashed border-[#847365]/5">
                           <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                              <User className="w-8 h-8 text-[#847365]/20" />
                           </div>
                           <p className="text-[#847365] font-serif font-bold text-lg">Sin clases asignadas</p>
                           <p className="text-xs text-[#847365]/40 max-w-[240px] mt-2 font-medium">El alumno aún no tiene materias o talleres específicos registrados.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {enrollments.map(en => (
                            <motion.div 
                              layout
                              key={en.id} 
                              className="group relative flex items-center justify-between p-6 bg-white rounded-3xl border border-[#847365]/5 hover:border-[#E67E22]/20 hover:shadow-xl hover:shadow-[#E67E22]/5 transition-all"
                            >
                               <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-[#F5F1EE] flex items-center justify-center text-[#E67E22] group-hover:bg-[#E67E22] group-hover:text-white transition-colors duration-500">
                                     <ClipboardCheck className="w-6 h-6" />
                                  </div>
                                  <div>
                                     <p className="font-bold text-[#2D241E] text-lg leading-tight">{en.classes.name}</p>
                                     <div className="flex flex-col gap-1 mt-1">
                                       <p className="text-[10px] text-[#847365]/60 uppercase font-black tracking-widest flex items-center gap-1.5">
                                         <User className="w-3 h-3" /> {en.classes.teacher_name}
                                       </p>
                                       <p className="text-[10px] text-[#E67E22] uppercase font-black tracking-widest flex items-center gap-1.5 bg-[#E67E22]/5 px-2 py-0.5 rounded-lg self-start">
                                         <Calendar className="w-3 h-3" /> {en.classes.schedule || 'Sin horario'}
                                       </p>
                                     </div>
                                  </div>
                               </div>
                               <button 
                                 onClick={() => { if(confirm('¿Desinscribir de esta clase?')) handleUnenroll(en.id) }} 
                                 className="opacity-0 group-hover:opacity-100 p-3 text-[#847365]/40 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                                 title="Desinscribir"
                               >
                                  <XCircle className="w-5 h-5" />
                               </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-white rounded-[40px] border border-[#847365]/5 shadow-sm p-10 relative overflow-hidden group">
                     <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                           <div>
                              <h3 className="text-2xl font-serif font-bold text-[#2D241E] flex items-center gap-3">
                                 <Calendar className="w-6 h-6 text-[#E67E22]" /> Registro de Asistencia
                              </h3>
                              <p className="text-sm text-[#847365] font-medium opacity-60">Marca el presente de las clases para el día seleccionado.</p>
                           </div>
                           
                           <div className="flex items-center gap-3 bg-[#F5F1EE] p-1.5 rounded-2xl">
                              <input 
                                 type="date" 
                                 value={attendanceDate}
                                 onChange={(e) => { setAttendanceDate(e.target.value); fetchAttendance(e.target.value); }}
                                 className="bg-white border-2 border-transparent focus:border-[#E67E22]/20 rounded-xl px-4 py-2 text-xs font-black text-[#847365] uppercase outline-none shadow-sm transition-all"
                              />
                           </div>
                        </div>

                        <div className="space-y-6">
                           {enrollments.length === 0 ? (
                              <div className="text-center py-10 text-[#847365]/40 italic font-serif bg-[#F5F1EE]/30 rounded-3xl">Inscribe al alumno en una clase para tomar asistencia.</div>
                           ) : enrollments.map(en => {
                              const record = attendance.find(a => a.class_id === en.class_id);
                              return (
                                 <div key={en.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-[#F5F1EE]/20 rounded-3xl border border-transparent hover:border-[#847365]/10 transition-all gap-6">
                                    <div className="flex items-center gap-5">
                                       <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#E67E22]">
                                          <Users className="w-6 h-6" />
                                       </div>
                                       <div>
                                          <p className="font-bold text-[#2D241E] text-lg leading-tight">{en.classes.name}</p>
                                          <p className="text-[10px] text-[#847365]/60 uppercase font-black tracking-widest mt-1">{en.classes.teacher_name}</p>
                                       </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                       {[
                                          { id: 'present', label: 'Presente', color: 'bg-green-500', icon: CheckCircle2 },
                                          { id: 'absent', label: 'Ausente', color: 'bg-red-500', icon: XCircle },
                                          { id: 'late', label: 'Tarde', color: 'bg-orange-500', icon: History }
                                       ].map(status => {
                                          const isActive = record?.status === status.id;
                                          return (
                                             <button
                                                key={status.id}
                                                disabled={saving}
                                                onClick={() => handleMarkAttendance(en.class_id, status.id as any)}
                                                className={cn(
                                                   "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95",
                                                   isActive 
                                                      ? `${status.color} text-white` 
                                                      : "bg-white text-[#847365]/40 hover:bg-[#2D241E] hover:text-white"
                                                )}
                                             >
                                                <status.icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-[#847365]/20")} />
                                                {status.label}
                                             </button>
                                          );
                                       })}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  </section>
               </motion.div>
            )}
          </div>

          {/* Sidebar de Resumen Financiero */}
          <div className="space-y-10">
             <div className="bg-[#2D241E] text-white rounded-[40px] p-10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign className="w-24 h-24" /></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-6">Total Invertido en el Ciclo</h4>
                <div className="flex flex-col gap-2">
                   <p className="text-5xl font-serif font-bold">${payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}</p>
                   <p className="text-xs text-white/40 font-medium tracking-wide">Representa el histórico total de este alumno.</p>
                </div>
                <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-between">
                   <div><p className="text-xs font-bold text-white/60">Pagos</p><p className="text-xl font-serif font-bold">{payments.length}</p></div>
                   <div><p className="text-xs font-bold text-white/60">Asistencias</p><p className="text-xl font-serif font-bold">85%</p></div>
                </div>
             </div>

             <div className="bg-[#F5F1EE] rounded-[40px] p-8 border border-[#847365]/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#847365] mb-6">Próximos Pasos</h4>
                <ul className="space-y-4">
                   <li className="flex items-center gap-3 text-sm font-bold text-[#847365] hover:text-[#E67E22] cursor-pointer transition-colors"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Download className="w-4 h-4" /></div> Descargar Plan de Estudios</li>
                   <li className="flex items-center gap-3 text-sm font-bold text-[#847365] hover:text-[#E67E22] cursor-pointer transition-colors"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div> WhatsApp al tutor</li>
                </ul>
             </div>
          </div>
        </div>
      </main>

      {/* Modal de Cobro de Cuota */}
      <AnimatePresence>
         {showPaymentModal && selectedFee && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D241E]/40 backdrop-blur-sm">
               <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#F5F1EE] w-full max-w-lg rounded-[40px] shadow-2xl p-10 border border-white/40">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-2xl font-serif font-bold text-[#2D241E]">Registrar Pago</h3>
                        <p className="text-[#847365] font-medium text-sm opacity-80">Cuota de {months[selectedFee.month - 1]} {selectedFee.year}</p>
                     </div>
                     <button onClick={() => setShowPaymentModal(false)}><XCircle className="w-6 h-6 text-[#847365]/40 hover:text-[#E74C3C]" /></button>
                  </div>
                  <form onSubmit={handleRecordPayment} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 block ml-4">Monto a abonar ($)</label>
                        <div className="relative">
                           <DollarSign className="absolute left-6 top-6 w-6 h-6 text-[#E67E22]" />
                           <input type="number" required value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full h-20 bg-white border-none rounded-3xl pl-16 pr-8 text-3xl font-black text-[#2D241E] focus:ring-4 focus:ring-[#E67E22]/10 shadow-inner" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 block ml-4">Método</label>
                           <select value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full h-14 bg-white border-none rounded-2xl px-5 font-bold shadow-sm">
                              <option value="cash">Efectivo</option>
                              <option value="transfer">Transferencia</option>
                              <option value="card">Tarjeta</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-[#847365]/60 block ml-4">Notas</label>
                           <input value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full h-14 bg-white border-none rounded-2xl px-5 font-bold shadow-sm" placeholder="..." />
                        </div>
                     </div>
                     <Button disabled={saving} type="submit" className="w-full bg-[#E67E22] text-white h-18 rounded-[32px] font-black text-xl shadow-xl active:scale-95 transition-all py-6 group">
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirmar y Generar Recibo"}
                     </Button>
                  </form>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Modal de Recibo On-Demand */}
      <AnimatePresence>
        {receiptModal?.isOpen && student && (() => {
          const p = receiptModal.payment;
          const fee = receiptModal.fee;
          const receiptNum = p.receipt_number || 'REC-' + p.id.split('-')[0].toUpperCase();
          const methodLabel = p.payment_method === 'cash' ? 'Efectivo' : p.payment_method === 'transfer' ? 'Transferencia' : p.payment_method;
          const conceptMonth = fee ? months[fee.month - 1] : '—';
          const conceptYear = fee ? fee.year : '';

          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2D241E]/70 backdrop-blur-xl">
              <motion.div initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 40, opacity: 0 }} transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }} className="bg-white w-full max-w-[380px] max-h-[90vh] overflow-y-auto rounded-[28px] shadow-2xl">
                
                {/* Captura para PDF */}
                <div ref={receiptRef} className="bg-white">
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-[#1a1410] via-[#2D241E] to-[#3d3229] px-6 pt-6 pb-5 text-center overflow-hidden">
                    <div className="absolute inset-0">
                      <div className="absolute -top-8 -left-8 w-28 h-28 bg-[#E67E22]/10 rounded-full blur-3xl" />
                      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#E67E22]/5 rounded-full blur-3xl" />
                    </div>
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#E67E22] to-[#D35400] rounded-[16px] mx-auto mb-3 flex items-center justify-center shadow-lg shadow-[#E67E22]/25 ring-2 ring-white/10">
                        <Receipt className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-white text-xl font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Comprobante de Pago</h3>
                      <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.3em] mt-1">Sahara · Gestión Académica</p>
                    </div>
                  </div>

                  {/* N° y Fecha */}
                  <div className="flex justify-between items-center px-6 py-3 bg-[#F8F5F2] border-b border-[#E8E2DC]">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#B5A99A]">N° Recibo</p>
                      <p className="font-mono font-extrabold text-[#2D241E] text-xs tracking-wider">{receiptNum}</p>
                    </div>
                    <div className="w-px h-6 bg-[#E8E2DC]" />
                    <div className="text-right">
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#B5A99A]">Fecha</p>
                      <p className="font-extrabold text-[#2D241E] text-xs">{format(new Date(p.payment_date), "dd/MM/yyyy")}</p>
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="px-6 py-5 space-y-4">
                    {/* Alumno */}
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#FEF3E7] to-[#FFF9F3] rounded-xl border border-[#F0DCC8]/50">
                      <div className="w-11 h-11 bg-gradient-to-br from-[#E67E22] to-[#D35400] rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-white text-base font-black">{student.full_name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-[#2D241E] text-sm leading-tight truncate">{student.full_name}</p>
                        <p className="text-[#9A8A7C] text-[10px] font-bold">DNI: {student.dni || '—'}</p>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="bg-[#FAFAF8] rounded-xl border border-[#F0ECE6] overflow-hidden text-[12px]">
                      <div className="flex justify-between items-center px-4 py-2.5">
                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Concepto</span>
                        <span className="font-extrabold text-[#2D241E]">Cuota {conceptMonth} {conceptYear}</span>
                      </div>
                      <div className="h-px bg-[#F0ECE6]" />
                      <div className="flex justify-between items-center px-4 py-2.5">
                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Método</span>
                        <span className="font-extrabold text-[#2D241E]">{methodLabel}</span>
                      </div>
                      {p.notes && (
                        <>
                          <div className="h-px bg-[#F0ECE6]" />
                          <div className="flex justify-between items-center px-4 py-2.5">
                            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Notas</span>
                            <span className="font-bold text-[#9A8A7C] text-[11px] max-w-[160px] text-right">{p.notes}</span>
                          </div>
                        </>
                      )}
                      <div className="h-px bg-[#F0ECE6]" />
                      <div className="flex justify-between items-center px-4 py-2.5">
                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Estado</span>
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-green-100">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Pagado
                        </span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="p-4 bg-gradient-to-r from-[#E67E22] via-[#E8852B] to-[#D35400] rounded-xl flex justify-between items-center shadow-md shadow-[#E67E22]/15 relative overflow-hidden">
                      <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/5 rounded-full" />
                      <div className="relative z-10">
                        <span className="text-white/60 text-[7px] font-black uppercase tracking-[0.25em] block mb-0.5">Total Abonado</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-white/70 text-sm font-bold">$</span>
                          <span className="text-white text-2xl font-black leading-none" style={{ fontFamily: 'Georgia, serif' }}>{p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <DollarSign className="w-8 h-8 text-white/15 relative z-10" />
                    </div>

                    <p className="text-center text-[8px] text-[#C4B8AC] font-bold tracking-wide">Este comprobante es válido como constancia de pago.</p>
                  </div>
                </div>

                {/* Botones */}
                <div className="px-5 pb-4 pt-1 grid grid-cols-3 gap-2">
                  <button
                    disabled={generatingPdf}
                    onClick={async () => {
                      const result = await generatePdfBlob();
                      if (!result) return;
                      const url = URL.createObjectURL(result.blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = result.filename;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-10 bg-[#F5F1EE] hover:bg-[#EDE7E1] text-[#2D241E] rounded-lg font-black text-[8px] uppercase tracking-[0.1em] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {generatingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    PDF
                  </button>
                  <button
                    disabled={generatingPdf}
                    onClick={async () => {
                      const result = await generatePdfBlob();
                      if (!result) return;
                      const url = URL.createObjectURL(result.blob);
                      const printWindow = window.open(url);
                      printWindow?.addEventListener('load', () => printWindow.print());
                    }}
                    className="h-10 bg-[#2D241E] hover:bg-[#4A3F35] text-white rounded-lg font-black text-[8px] uppercase tracking-[0.1em] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {generatingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                    Imprimir
                  </button>
                  <button
                    disabled={generatingPdf}
                    onClick={async () => {
                      const result = await generatePdfBlob();
                      if (result) {
                        const url = URL.createObjectURL(result.blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = result.filename;
                        link.click();
                        URL.revokeObjectURL(url);
                      }
                      const amountFormatted = p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 });
                      const text = encodeURIComponent(
`\u2705 *PAGO CONFIRMADO*\n\nHola ${student.full_name.split(' ')[0]} \ud83d\udc4b\n\nTe confirmamos la recepci\u00f3n de tu pago:\n\n\ud83d\udccb *Detalle:*\n\u2022 Concepto: Cuota de ${conceptMonth} ${conceptYear}\n\u2022 Monto: *$${amountFormatted}*\n\u2022 M\u00e9todo: ${methodLabel}\n\u2022 N\u00b0 Comprobante: ${receiptNum}\n\n\ud83d\udcc4 _Adjunt\u00e1 el PDF descargado a este chat._\n\n\u00a1Gracias por tu puntualidad! \ud83d\ude4f\n_Sahara \u00b7 Gesti\u00f3n Acad\u00e9mica_`);
                      const phone = student.phone?.replace(/\D/g, '') || '';
                      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
                    }}
                    className="h-10 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg font-black text-[8px] uppercase tracking-[0.1em] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {generatingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    WhatsApp
                  </button>
                </div>

                <button
                  onClick={() => setReceiptModal(null)}
                  className="w-full h-10 border-t border-[#847365]/10 text-[8px] font-black uppercase tracking-[0.2em] text-[#B5A99A] hover:text-[#2D241E] hover:bg-[#F5F1EE] transition-all"
                >
                  Cerrar
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
