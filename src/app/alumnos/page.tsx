"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
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
  Eye,
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
  Hash,
  Filter,
  Check,
  Printer,
  Share2,
  MessageCircle,
  Receipt,
  Download,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ExcelImporter } from "@/components/excel-importer";
import { 
  cleanupAcademyDataAction, 
  bulkDeleteStudentsAction, 
  bulkUpdateStatusAction 
} from "./actions";

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
  status: 'pending' | 'completed';
  amount: number;
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
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [hasPromo, setHasPromo] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [invoiceData, setInvoiceData] = useState<{
    isOpen: boolean;
    studentName: string;
    studentDni: string;
    studentPhone: string;
    amount: number;
    method: string;
    month: number;
    year: number;
    notes: string;
    date: string;
    receiptNumber: string;
    categoryName: string;
  } | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "cash",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ""
  });

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean,
    title: string,
    message: string,
    type: 'info' | 'confirm' | 'success' | 'error',
    onConfirm?: () => void
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

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
      .select('id, student_id, period_month, period_year, status, amount')
      .eq('period_month', currentMonth)
      .eq('period_year', currentYear);
    
    if (payData) setPayments(payData as Payment[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
    
    // Obtener info del usuario y academia
    const getUserContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        
        // Intentar primero desde metadata (más rápido y seguro)
        const metaAcademyId = user.user_metadata?.academy_id;
        if (metaAcademyId) {
          console.log("Academy ID from metadata:", metaAcademyId);
          setAcademyId(metaAcademyId);
        } else {
          // Fallback al perfil si no está en metadata
          console.log("No academy_id in metadata, checking user_profiles...");
          const { data: profile } = await supabase.from('user_profiles').select('academy_id').eq('id', user.id).single();
          if (profile) {
            console.log("Academy ID from profiles:", profile.academy_id);
            setAcademyId(profile.academy_id);
          } else {
            console.warn("No academy_id found for user.");
          }
        }
      }
    };
    getUserContext();
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
    let createdStudentId = null;

    if (editingStudent) {
      const res = await supabase.from('students').update(payload).eq('id', editingStudent.id).select('id').single();
      error = res.error;
      createdStudentId = editingStudent.id;
    } else {
      const res = await supabase.from('students').insert([payload]).select('id').single();
      error = res.error;
      createdStudentId = res.data?.id;
    }

    if (!error && createdStudentId && formData.category_id) {
       try {
         const { data: existingClasses } = await supabase.from('classes').select('id').eq('category_id', formData.category_id).limit(1);
         let classId = existingClasses?.[0]?.id;

         if (!classId) {
            const cat = categories.find(c => c.id === formData.category_id);
            const { data: newClass } = await supabase.from('classes').insert({
               category_id: formData.category_id,
               name: `Clase Principal - ${cat?.name || 'General'}`
            }).select('id').single();
            classId = newClass?.id;
         }

         if (classId) {
            await supabase.from('enrollments').upsert({
               student_id: createdStudentId,
               class_id: classId
            }, { onConflict: 'student_id, class_id' });
         }

         if (!editingStudent) {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            const category = categories.find(c => c.id === formData.category_id);
            let amount = category ? category.price : 0;
            
            if (hasPromo) {
               const val = parseFloat(formData.discount_value) || 0;
               if (formData.discount_type === 'percentage') amount *= (1 - val / 100);
               else amount = Math.max(0, amount - val);
            }

            await supabase.from('payments').insert({
               student_id: createdStudentId,
               amount: amount,
               period_month: currentMonth,
               period_year: currentYear,
               status: 'pending',
               payment_method: 'cash',
               notes: 'Alta de Alumno - Cuota Inicial'
            });
         }
       } catch (automationError) {
         console.error("Error setting up automations:", automationError);
       }
    }
    
    if (!error) {
      setFormData({
        full_name: "", email: "", phone: "", dni: "", birthdate: "", age: "", address: "", category_id: "", discount_value: "0", discount_type: "percentage"
      });
      setHasPromo(false);
      setEditingStudent(null);
      setShowAddForm(false);
      fetchInitialData();
      showAlert("¡Operación Exitosa!", editingStudent ? "Los datos se han actualizado correctamente." : "El alumno ha sido inscripto y se le ha generado su cargo inicial.", "success");
    } else {
      showAlert("Error", error.message, "error");
    }
    setSaving(false);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    setSaving(true);
    
    const existingPayment = payments.find(p => 
      p.student_id === selectedStudent.id && 
      p.period_month === paymentData.month && 
      p.period_year === paymentData.year
    );

    const payload = {
      student_id: selectedStudent.id,
      amount: parseFloat(paymentData.amount),
      payment_method: paymentData.method,
      period_month: paymentData.month,
      period_year: paymentData.year,
      notes: paymentData.notes || null,
      payment_date: new Date().toISOString(),
      status: 'completed'
    };

  const receiptNum = `REC-${Date.now().toString(36).toUpperCase()}`;
    let error;
    if (existingPayment) {
      const res = await supabase
        .from('payments')
        .update({ ...payload, receipt_number: receiptNum })
        .eq('id', existingPayment.id);
      error = res.error;
    } else {
      const res = await supabase
        .from('payments')
        .insert([{ ...payload, receipt_number: receiptNum }]);
      error = res.error;
    }
    
    if (!error) {
      const categoryName = categories.find(c => c.id === selectedStudent.category_id)?.name || 'Sin categoría';
      const methodLabels: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', other: 'Otro' };
      setInvoiceData({
        isOpen: true,
        studentName: selectedStudent.full_name,
        studentDni: selectedStudent.dni || 'N/A',
        studentPhone: selectedStudent.phone || '',
        amount: parseFloat(paymentData.amount),
        method: methodLabels[paymentData.method] || paymentData.method,
        month: paymentData.month,
        year: paymentData.year,
        notes: paymentData.notes,
        date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
        receiptNumber: receiptNum,
        categoryName
      });
      setShowPaymentPanel(false);
      setSelectedStudent(null);
      fetchInitialData();
    } else {
      showAlert("Error", error.message, "error");
    }
    setSaving(false);
  };

  const generatePdfBlob = async () => {
    if (!receiptRef.current || !invoiceData) return null;
    
    setGeneratingPdf(true);
    try {
      const element = receiptRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
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
      const blob = pdf.output("blob");
      const filename = `Recibo_${invoiceData.receiptNumber}_${invoiceData.studentName.replace(/\s+/g, '_')}.pdf`;
      
      return { blob, filename };
    } catch (error) {
      console.error("Error generating PDF:", error);
      showAlert("Error", "No se pudo generar el comprobante. Intenta imprimir la pantalla.", "error");
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'inactive') => {
    const { error } = await supabase.from('students').update({ status: newStatus }).eq('id', studentId);
    if (!error) fetchInitialData();
  };

  const handleDeleteStudent = async (studentId: string) => {
    setIsBulkLoading(true);
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    
    if (!error) {
      fetchInitialData();
      showAlert("Eliminado", "El alumno y todos sus registros asociados han sido eliminados permanentemente.", "success");
    } else {
      showAlert("Error", "No se pudo eliminar: " + error.message, "error");
    }
    setIsBulkLoading(false);
  };

  const handleBulkGenerateFees = async () => {
    const activeStudents = students.filter(s => s.status === 'active');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const studentsWithoutFee = activeStudents.filter(s => 
      !payments.some(p => p.student_id === s.id && p.period_month === currentMonth && p.period_year === currentYear)
    );

    const executeBulkGenerate = async () => {
        setIsBulkLoading(true);
        const newFees = studentsWithoutFee.map(s => {
          const category = categories.find(c => c.id === s.category_id);
          let amount = category ? category.price : 0;
          if (s.discount_value > 0) {
            if (s.discount_type === 'percentage') amount *= (1 - s.discount_value / 100);
            else amount = Math.max(0, amount - s.discount_value);
          }
          return {
            student_id: s.id,
            amount: amount,
            period_month: currentMonth,
            period_year: currentYear,
            status: 'pending',
            payment_method: 'cash',
            notes: 'Generado automáticamente'
          };
        });

        const { error } = await supabase.from('payments').insert(newFees);
        if (!error) {
          showAlert("Facturación Masiva", `Se han generado ${studentsWithoutFee.length} cuotas correctamente.`, "success");
          fetchInitialData();
        } else {
          showAlert("Error", error.message, "error");
        }
        setIsBulkLoading(false);
    };

    showConfirm("Confirmar Facturación", `Se generarán ${studentsWithoutFee.length} cuotas para todos los alumnos activos. ¿Deseas continuar?`, executeBulkGenerate);
  };

  const handleBulkGenerateSelectedFees = async () => {
    if (!selectedIds.length) return;

    const selectedStudents = students.filter(s => selectedIds.includes(s.id) && s.status === 'active');
    
    if (selectedStudents.length === 0) {
      alert("Los alumnos seleccionados deben estar activos.");
      return;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const studentsWithoutFee = selectedStudents.filter(s => 
      !payments.some(p => p.student_id === s.id && p.period_month === currentMonth && p.period_year === currentYear)
    );

    const executeBulkGenerateSelected = async () => {
        setIsBulkLoading(true);
        const newFees = studentsWithoutFee.map(s => {
          const category = categories.find(c => c.id === s.category_id);
          let amount = category ? category.price : 0;
          if (s.discount_value > 0) {
            if (s.discount_type === 'percentage') amount *= (1 - s.discount_value / 100);
            else amount = Math.max(0, amount - s.discount_value);
          }
          return {
            student_id: s.id,
            amount: amount,
            period_month: currentMonth,
            period_year: currentYear,
            status: 'pending',
            payment_method: 'cash',
            notes: 'Generado masivamente (Selección)'
          };
        });

        const { error } = await supabase.from('payments').insert(newFees);
        if (!error) {
          showAlert("Facturación Selectiva", "Las cuotas para los alumnos seleccionados han sido generadas.", "success");
          setSelectedIds([]);
          fetchInitialData();
        } else {
          showAlert("Error", error.message, "error");
        }
        setIsBulkLoading(false);
    };

    showConfirm("Confirmar Selección", `Se generarán ${studentsWithoutFee.length} cuotas para los alumnos marcados. ¿Continuar?`, executeBulkGenerateSelected);
  };

  const handleBulkAssignCategory = async (categoryId: string) => {
    if (!selectedIds.length || !categoryId) return;
    
    setIsBulkLoading(true);
    const { error } = await supabase
      .from('students')
      .update({ category_id: categoryId })
      .in('id', selectedIds);

    if (!error) {
      setSelectedIds([]);
      fetchInitialData();
    } else {
      alert("Error: " + error.message);
    }
    setIsBulkLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    
    const executeDelete = async () => {
      setIsBulkLoading(true);
      const res = await bulkDeleteStudentsAction(selectedIds);
      if (res.success) {
        showAlert("Eliminación Exitosa", res.message, "success");
        setSelectedIds([]);
        fetchInitialData();
      } else {
        showAlert("Error", res.message, "error");
      }
      setIsBulkLoading(false);
    };

    showConfirm("Eliminar Selección", `¿Estás seguro de eliminar permanentemente a los ${selectedIds.length} alumnos seleccionados?`, executeDelete);
  };

  const handleBulkArchive = async (status: 'active' | 'archived') => {
    if (!selectedIds.length) return;
    
    setIsBulkLoading(true);
    const res = await bulkUpdateStatusAction(selectedIds, status);
    if (res.success) {
      showAlert("Éxito", res.message, "success");
      setSelectedIds([]);
      fetchInitialData();
    } else {
      showAlert("Error", res.message, "error");
    }
    setIsBulkLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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
    const matchesCategory = filterCategory === "all" || s.category_id === filterCategory;
    
    const isPaid = payments.some(p => p.student_id === s.id);
    const matchesPayment = filterStatus === "all" || 
                          (filterStatus === "paid" && isPaid) || 
                          (filterStatus === "debtor" && !isPaid);

    return matchesSearch && matchesStatus && matchesCategory && matchesPayment;
  });

  return (
    <DashboardShell>
      <div className="p-4 lg:p-10 relative">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-[#111] tracking-tight">Gestión de Alumnos</h1>
            <p className="text-[#3A3028] text-sm font-bold mt-1">Legajos individuales y control administrativo.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button 
              onClick={handleBulkGenerateFees}
              disabled={isBulkLoading}
              className="gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold transition-all bg-[#111] text-white hover:bg-black active:scale-95 shadow-lg flex items-center justify-center order-2 sm:order-1"
            >
              {isBulkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5 text-[#E67E22]" />}
              <span className="text-xs uppercase tracking-widest">Facturación</span>
            </Button>

             <ExcelImporter academyId={academyId || ""} onSuccess={fetchInitialData} />

             {(userEmail?.includes('lucinopdl2401') || userEmail?.includes('lucianopdl2401')) && (
               <Button 
                 onClick={async () => {
                   if (window.confirm("¿ESTÁS SEGURO? Se borrarán TODOS los alumnos de esta academia permanentemente.")) {
                     if (academyId) {
                       const res = await cleanupAcademyDataAction(academyId);
                       if (res.success) {
                         showAlert("Limpieza Exitosa", res.message, "success");
                         fetchInitialData();
                       } else {
                         showAlert("Error", res.message, "error");
                       }
                     } else {
                        showAlert("Error", "No se detectó el ID de la academia. Recarga la página.", "error");
                     }
                   }
                 }}
                 variant="outline"
                 className="gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold border-red-200 text-red-500 hover:bg-red-50 transition-all shadow-sm order-3"
               >
                 <Trash2 className="w-5 h-5" />
                 <span className="text-xs uppercase tracking-widest text-[#E74C3C]">Vaciar</span>
               </Button>
             )}

            <Button 
              onClick={() => {
                if (showAddForm) {
                  setEditingStudent(null);
                  setHasPromo(false);
                  setFormData({ full_name: "", email: "", phone: "", dni: "", birthdate: "", age: "", address: "", category_id: "", discount_value: "0", discount_type: "percentage" });
                }
                setShowAddForm(!showAddForm);
              }}
              className={cn("gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold transition-all shadow-lg active:scale-95 order-1 sm:order-2", showAddForm ? "bg-[#847365] text-white" : "bg-[#E67E22] hover:bg-[#D35400] text-white shadow-[#E67E22]/20")}
            >
              {showAddForm ? "Cerrar Panel" : <><Plus className="w-5 h-5" /> <span className="text-xs uppercase tracking-widest">Inscribir</span></>}
            </Button>
          </div>
        </header>

        {/* Tab Switcher - Sahara Style */}
        <div className="flex items-center gap-1 bg-[#F5F1EE] p-1.5 rounded-[24px] w-fit mb-8 border border-[#847365]/5 shadow-inner">
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === 'active' 
                ? "bg-white text-primary shadow-sm ring-1 ring-[#847365]/10" 
                : "text-[#847365]/50 hover:text-[#847365]"
            )}
          >
            Activos
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={cn(
              "px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === 'inactive' 
                ? "bg-white text-primary shadow-sm ring-1 ring-[#847365]/10" 
                : "text-[#847365]/50 hover:text-[#847365]"
            )}
          >
            Archivados
          </button>
        </div>

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
                      <select value={paymentData.month} onChange={(e) => setPaymentData({...paymentData, month: parseInt(e.target.value)})} className="w-full h-14 bg-white border-none rounded-2xl px-5 font-bold">
                        {Array.from({length: 12}).map((_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('es-AR', { month: 'long' })}</option>)}
                      </select>
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

        {/* Search and Filters Bar */}
        <section className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#847365] transition-colors group-focus-within:text-[#E67E22]" />
            <input 
              placeholder="Buscar por nombre, DNI o teléfono..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 lg:h-14 bg-white/60 border-white/40 rounded-2xl lg:rounded-3xl focus:ring-[#E67E22] focus:border-[#E67E22] transition-all placeholder:text-[#847365]/50 text-base w-full outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 lg:w-48 h-12 lg:h-14 bg-white/60 border-white/40 rounded-2xl lg:rounded-3xl px-4 text-[#3A3028] font-medium focus:ring-[#E67E22] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 lg:w-48 h-12 lg:h-14 bg-white/60 border-white/40 rounded-2xl lg:rounded-3xl px-4 text-[#3A3028] font-medium focus:ring-[#E67E22] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Estado de Pago (Todos)</option>
              <option value="paid" className="text-emerald-600 font-bold">Al Día</option>
              <option value="debtor" className="text-rose-600 font-bold">Morosos</option>
            </select>

            <Button className="w-12 lg:w-14 h-12 lg:h-14 rounded-2xl lg:rounded-3xl bg-white/60 border-white/40 text-[#847365] hover:text-[#E67E22] hover:bg-white transition-all shadow-sm flex items-center justify-center p-0">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Listado Principal */}
        {/* Listado Principal - Mobile First Display Logic */}
        <div className="space-y-4 mb-24">
          
          {/* VISTA MÓVIL: Tarjetas (grid 1 col) */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#E67E22] mx-auto opacity-40" /></div>
            ) : filteredStudents.map((s) => {
              const payment = payments.find(p => p.student_id === s.id);
              const isPaid = payment?.status === 'completed';
              const hasPending = payment?.status === 'pending';
              
              return (
                <motion.div 
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white rounded-3xl p-5 border shadow-sm relative overflow-hidden transition-all",
                    selectedIds.includes(s.id) ? "border-[#E67E22] ring-1 ring-[#E67E22]" : "border-[#847365]/10"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#E67E22] text-white flex items-center justify-center font-serif font-bold text-xl shadow-sm">
                        {s.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/alumnos/${s.id}`} className="font-bold text-[#111] leading-tight block truncate">{s.full_name}</Link>
                        <p className="text-[10px] font-black text-[#D35400] uppercase tracking-wider">{categories.find(c => c.id === s.category_id)?.name || 'SIN CLASE'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="p-2 bg-[#F5F1EE] rounded-xl text-[#847365]"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openPayment(s)} className="p-2 bg-[#E67E22]/10 rounded-xl text-[#E67E22]"><Receipt className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#B5A99A]">DNI</span>
                      <span className="text-xs font-bold text-[#3A3028]">{s.dni || "-"}</span>
                    </div>
                    <div>
                      {isPaid ? (
                        <span className="bg-green-100 text-green-900 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-green-200">Al Día</span>
                      ) : hasPending ? (
                        <span className="bg-orange-100 text-orange-900 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-orange-200">Deuda: ${payment?.amount}</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-200">Sin Cargo</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#847365]/5 gap-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleSelectOne(s.id)}
                        className="flex items-center gap-2"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                          selectedIds.includes(s.id) ? "bg-[#111] border-[#111]" : "border-[#847365]/20 bg-white"
                        )}>
                          {selectedIds.includes(s.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </button>

                      <button 
                        onClick={() => openEdit(s)}
                        className="w-9 h-9 rounded-xl border border-[#847365]/10 flex items-center justify-center text-[#111] active:scale-90"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={() => {
                            showConfirm(
                                s.status === 'active' ? "¿Archivar Legajo?" : "¿Restaurar Legajo?",
                                s.status === 'active' ? `¿Estás seguro de archivar a ${s.full_name}?` : `¿Deseas activar nuevamente a ${s.full_name}?`,
                                () => handleStatusChange(s.id, s.status === 'active' ? 'inactive' : 'active')
                            );
                        }} 
                        className={cn(
                          "w-9 h-9 rounded-xl border border-[#847365]/10 flex items-center justify-center transition-all active:scale-90",
                          s.status === 'active' ? "text-[#847365]/40" : "text-green-600 border-green-100"
                        )}
                      >
                         {s.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                      </button>

                      {s.status === 'inactive' && (
                        <button 
                          onClick={() => {
                              showConfirm(
                                  "¿Eliminar Permanentemente?",
                                  `Esta acción ELIMINARÁ DEFINITIVAMENTE a ${s.full_name}. No se puede deshacer.`,
                                  () => handleDeleteStudent(s.id)
                              );
                          }} 
                          className="w-9 h-9 rounded-xl border border-red-100 flex items-center justify-center text-red-400 active:scale-90"
                        >
                           <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    <Link href={`/alumnos/${s.id}`} className="text-[10px] font-black uppercase tracking-widest text-[#E67E22] flex items-center gap-1 bg-orange-50 px-3 py-2 rounded-xl">
                      Perfil <Eye className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* VISTA DESKTOP: Tabla Tradicional */}
          <div className="hidden lg:block bg-white rounded-[40px] border border-[#847365]/10 shadow-sm overflow-hidden pb-6">
            <table className="w-full text-left">
            <thead className="border-b-2 border-[#DED4CA]">
              <tr className="bg-[#EBE5DF]">
                <th className="pl-14 py-6 w-32 text-left">
                   <button 
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                        selectedIds.length > 0 && selectedIds.length === filteredStudents.length
                          ? "bg-[#111] border-[#111] shadow-lg" 
                          : "border-[#3A3028] hover:border-[#111] bg-white"
                      )}
                   >
                      {selectedIds.length > 0 && selectedIds.length === filteredStudents.length && <Check className="w-4 h-4 text-white stroke-[3]" />}
                   </button>
                </th>
                <th className="py-6 text-[10px] font-black uppercase tracking-widest text-[#111]">Alumno / Clase</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#111]">Estado de Cuenta</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#111]">Beneficio</th>
                <th className="pr-14 py-6 text-[10px] font-black uppercase tracking-widest text-[#111] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#847365]/5">
              {loading ? (<tr><td colSpan={5} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin text-[#E67E22] mx-auto opacity-40" /></td></tr>) : filteredStudents.map((s) => {
                const payment = payments.find(p => p.student_id === s.id);
                const isPaid = payment?.status === 'completed';
                const hasPending = payment?.status === 'pending';
                return (
                  <tr key={s.id} className={cn("group hover:bg-[#F5F1EE]/30 transition-all", selectedIds.includes(s.id) && "bg-[#F5F1EE]/60")}>
                    <td className="pl-14 py-8 pr-10">
                       <button 
                          onClick={() => toggleSelectOne(s.id)}
                          className={cn(
                            "w-6 h-6 rounded-xl border-2 transition-all flex items-center justify-center",
                            selectedIds.includes(s.id) 
                              ? "bg-[#E67E22] border-[#E67E22] shadow-lg shadow-[#E67E22]/20" 
                              : "border-[#847365]/10 hover:border-[#847365]/30 bg-white"
                          )}
                       >
                          {selectedIds.includes(s.id) && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                       </button>
                    </td>
                    <td className="py-8">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-[20px] bg-[#E67E22] text-white flex items-center justify-center font-serif font-bold text-xl">{s.full_name.charAt(0)}</div>
                          <Link href={`/alumnos/${s.id}`} className="group/name">
                            <p className="font-serif font-bold text-xl text-[#000] group-hover/name:text-[#E67E22] transition-colors leading-none">{s.full_name}</p>
                            <p className="text-[10px] font-black text-[#D35400] uppercase tracking-widest mt-1.5 border-b-2 border-[#D35400]/20 inline-block">{categories.find(c => c.id === s.category_id)?.name || 'SIN CLASE ASIGNADA'}</p>
                          </Link>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       {isPaid ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-green-200"><CheckCircle2 className="w-4 h-4" /> Pagado</span>
                       ) : hasPending ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-orange-300 shadow-sm"><Calculator className="w-4 h-4" /> Deuda: ${payment?.amount}</span>
                       ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#EBE5DF]/50 text-[#847365] rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#DED4CA]"><AlertCircle className="w-4 h-4" /> Sin Cargo Mes</span>
                       )}
                    </td>
                    <td className="px-10 py-8">
                       {s.discount_value > 0 ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-indigo-300"><Ticket className="w-4 h-4" /> Promo: -{s.discount_value}{s.discount_type === 'percentage' ? '%' : '$'}</div>
                       ) : <span className="text-[10px] font-bold text-[#3A3028] uppercase tracking-widest">Sin Promo</span>}
                    </td>
                    <td className="pr-14 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                          {s.status === 'active' && (
                            <Button 
                              onClick={() => openPayment(s)} 
                              className={cn(
                                "h-11 px-6 rounded-2xl font-bold text-[10px] uppercase shadow-lg active:scale-95 transition-all outline-none border-none",
                                hasPending 
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200" 
                                  : "bg-[#D35400] hover:bg-[#A34100] text-white shadow-[#D35400]/20"
                              )}
                            >
                              {hasPending ? "Registrar Pago" : "Cobrar"}
                            </Button>
                          )}
                          <Link 
                            href={`/alumnos/${s.id}`} 
                            className="w-11 h-11 rounded-2xl border-2 border-[#DED4CA] flex items-center justify-center text-[#111] hover:bg-[#F5F1EE] transition-all active:scale-90"
                            title="Ver Perfil"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => openEdit(s)} 
                            className="w-11 h-11 rounded-2xl border-2 border-[#DED4CA] flex items-center justify-center text-[#111] hover:bg-[#111] hover:text-white transition-all active:scale-90"
                            title="Editar Datos"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                                showConfirm(
                                    s.status === 'active' ? "¿Archivar Legajo?" : "¿Restaurar Legajo?",
                                    s.status === 'active' ? `¿Estás seguro de archivar a ${s.full_name}? No aparecerá en los listados activos.` : `¿Deseas activar nuevamente a ${s.full_name}?`,
                                    () => handleStatusChange(s.id, s.status === 'active' ? 'inactive' : 'active')
                                );
                            }} 
                            className={cn(
                              "w-11 h-11 rounded-2xl border border-[#847365]/10 flex items-center justify-center transition-all active:scale-90",
                              s.status === 'active' ? "text-[#847365]/40 hover:bg-[#2D241E] hover:text-white" : "text-green-600 hover:bg-green-600 hover:text-white"
                            )}
                            title={s.status === 'active' ? "Archivar Alumno" : "Restaurar Alumno"}
                          >
                             {s.status === 'active' ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                          </button>

                          {s.status === 'inactive' && (
                            <button 
                              onClick={() => {
                                  showConfirm(
                                      "¿Eliminar Permanentemente?",
                                      `Esta acción ELIMINARÁ DEFINITIVAMENTE a ${s.full_name} del sistema, incluyendo sus pagos, asistencias e inscripción. Esta acción no se puede deshacer.`,
                                      () => handleDeleteStudent(s.id)
                                  );
                              }} 
                              className="w-11 h-11 rounded-2xl border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                              title="Eliminar del Sistema"
                            >
                               <XCircle className="w-4 h-4" />
                            </button>
                          )}
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

        {/* La barra de acciones masivas fue unificada al final del archivo para evitar superposiciones */}

      </div>
      {/* Modal de Comprobante / Factura Premium */}
      <AnimatePresence>
        {invoiceData?.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2D241E]/70 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 40, opacity: 0 }} transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }} className="bg-white w-full max-w-[380px] max-h-[90vh] overflow-y-auto rounded-[28px] shadow-2xl">
              
              {/* Captura para PDF */}
              <div ref={receiptRef} className="bg-white">
                {/* Header compacto */}
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

                {/* N° Recibo y Fecha */}
                <div className="flex justify-between items-center px-6 py-3 bg-[#F8F5F2] border-b border-[#E8E2DC]">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#B5A99A]">N° Recibo</p>
                    <p className="font-mono font-extrabold text-[#2D241E] text-xs tracking-wider">{invoiceData.receiptNumber}</p>
                  </div>
                  <div className="w-px h-6 bg-[#E8E2DC]" />
                  <div className="text-right">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#B5A99A]">Fecha</p>
                    <p className="font-extrabold text-[#2D241E] text-xs">{invoiceData.date}</p>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="px-6 py-5 space-y-4">
                  {/* Info alumno */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#FEF3E7] to-[#FFF9F3] rounded-xl border border-[#F0DCC8]/50">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#E67E22] to-[#D35400] rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-white text-base font-black">{invoiceData.studentName.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#2D241E] text-sm leading-tight truncate">{invoiceData.studentName}</p>
                      <p className="text-[#9A8A7C] text-[10px] font-bold">DNI: {invoiceData.studentDni} · {invoiceData.categoryName}</p>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="bg-[#FAFAF8] rounded-xl border border-[#F0ECE6] overflow-hidden text-[12px]">
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Concepto</span>
                      <span className="font-extrabold text-[#2D241E]">Cuota {months[invoiceData.month - 1]} {invoiceData.year}</span>
                    </div>
                    <div className="h-px bg-[#F0ECE6]" />
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Método</span>
                      <span className="font-extrabold text-[#2D241E]">{invoiceData.method}</span>
                    </div>
                    {invoiceData.notes && (
                      <>
                        <div className="h-px bg-[#F0ECE6]" />
                        <div className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#B5A99A]">Notas</span>
                          <span className="font-bold text-[#9A8A7C] text-[11px] max-w-[160px] text-right">{invoiceData.notes}</span>
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
                        <span className="text-white text-2xl font-black leading-none" style={{ fontFamily: 'Georgia, serif' }}>{invoiceData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
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
                    const amountFormatted = invoiceData?.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 });
                    const text = encodeURIComponent(
`✅ *PAGO CONFIRMADO*

Hola ${invoiceData?.studentName?.split(' ')[0]} 👋

Te confirmamos la recepción de tu pago:

📋 *Detalle:*
• Concepto: Cuota de ${months[(invoiceData?.month || 1) - 1]} ${invoiceData?.year}
• Monto: *$${amountFormatted}*
• Método: ${invoiceData?.method}
• N° Comprobante: ${invoiceData?.receiptNumber}

📄 _Adjuntá el PDF descargado a este chat._

¡Gracias por tu puntualidad! 🙏
_Sahara · Gestión Académica_`);
                    const phone = invoiceData?.studentPhone?.replace(/\D/g, '') || '';
                    window.open(`https://wa.me/${phone ? phone : ''}?text=${text}`, '_blank');
                  }}
                  className="h-10 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg font-black text-[8px] uppercase tracking-[0.1em] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generatingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                  WhatsApp
                </button>
              </div>

              <button
                onClick={() => setInvoiceData(null)}
                className="w-full h-10 border-t border-[#847365]/10 text-[8px] font-black uppercase tracking-[0.2em] text-[#B5A99A] hover:text-[#2D241E] hover:bg-[#F5F1EE] transition-all"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Alerta / Confirmación Premium */}
      <AnimatePresence>
        {alertConfig.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2D241E]/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-[#FBF9F7] w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden border border-white">
               <div className="p-10 text-center">
                  <div className={cn("w-20 h-20 rounded-[28px] mx-auto mb-6 flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-500", 
                    alertConfig.type === 'confirm' ? "bg-indigo-600 text-white" : 
                    alertConfig.type === 'success' ? "bg-green-500 text-white" :
                    alertConfig.type === 'error' ? "bg-red-500 text-white" : "bg-[#E67E22] text-white"
                  )}>
                    {alertConfig.type === 'confirm' ? <Archive className="w-10 h-10" /> : 
                     alertConfig.type === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
                     alertConfig.type === 'error' ? <XCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                  </div>
                  <h3 className="text-3xl font-serif font-extrabold text-[#111] leading-tight mb-3">{alertConfig.title}</h3>
                  <p className="text-[#847365] font-medium leading-relaxed">{alertConfig.message}</p>
               </div>
               <div className="flex border-t border-[#847365]/10 h-20">
                  {alertConfig.type === 'confirm' && (
                    <button 
                      onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                      className="flex-1 h-full text-[10px] font-black uppercase tracking-[0.2em] text-[#847365] hover:bg-[#F5F1EE] transition-colors border-r border-[#847365]/10"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    autoFocus
                    onClick={() => {
                      if (alertConfig.onConfirm) alertConfig.onConfirm();
                      setAlertConfig({ ...alertConfig, isOpen: false });
                    }}
                    className={cn("flex-1 h-full text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90", 
                      alertConfig.type === 'confirm' ? "bg-indigo-600" :
                      alertConfig.type === 'success' ? "bg-green-500" :
                      alertConfig.type === 'error' ? "bg-red-500" : "bg-[#E67E22]"
                    )}
                  >
                    {alertConfig.type === 'confirm' ? "Confirmar" : "Aceptar"}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRA DE ACCIONES MASIVAS UNIFICADA - ELITE DESIGN */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[110] w-[95%] max-w-5xl"
          >
            <div className="bg-[#1A1614]/95 backdrop-blur-2xl text-white rounded-[32px] p-4 lg:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
              {/* Reflejo dorado sutil */}
              <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-[#E67E22]/50 to-transparent" />
              
              <div className="flex items-center gap-5 shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-[#E67E22] to-[#D35400] rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-600/20 ring-2 ring-white/10">
                  {selectedIds.length}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Alumnos Seleccionados</p>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    Panel de Acciones Masivas
                    {isBulkLoading && <Loader2 className="w-4 h-4 animate-spin text-[#E67E22]" />}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4 flex-1">
                {/* Asignar Clase */}
                <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-2 px-4 border border-white/5 flex flex-col gap-0.5 min-w-[160px]">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#E67E22]/70">Cambiar Disciplina</span>
                  <select 
                    onChange={(e) => handleBulkAssignCategory(e.target.value)}
                    disabled={isBulkLoading}
                    value=""
                    className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer p-0 text-white w-full outline-none"
                  >
                    <option value="" disabled className="text-black">Seleccionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="text-black">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="h-10 w-px bg-white/10 hidden lg:block" />

                {/* Generar Cuotas */}
                <Button 
                  onClick={handleBulkGenerateSelectedFees}
                  disabled={isBulkLoading}
                  className="bg-[#E67E22] hover:bg-orange-600 text-white px-5 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 gap-2 transition-all active:scale-95 border-none"
                >
                  <Calculator className="w-4 h-4" />
                  Facturar
                </Button>

                <div className="h-10 w-px bg-white/10 hidden lg:block" />

                {/* Archivar */}
                <Button 
                  onClick={() => handleBulkArchive('archived')}
                  disabled={isBulkLoading}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl h-12 flex items-center gap-2 px-5 transition-all active:scale-95"
                >
                  <Archive className="w-4 h-4 text-white/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Archivar</span>
                </Button>

                {/* Eliminar */}
                <Button 
                  onClick={handleBulkDelete}
                  disabled={isBulkLoading}
                  variant="ghost"
                  className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl h-12 flex items-center gap-2 px-5 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Borrar</span>
                </Button>
              </div>

              <div className="flex items-center gap-4 shrink-0 border-l border-white/10 pl-6 hidden sm:flex">
                <button 
                  onClick={() => setSelectedIds([])}
                  className="group flex flex-col items-center gap-1 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-all">
                    <XCircle className="w-6 h-6 text-white/40 group-hover:text-white" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/60">Cerrar</span>
                </button>
              </div>
              
              {/* Botón de cierre para móvil simplificado */}
              <button 
                onClick={() => setSelectedIds([])}
                className="absolute top-2 right-2 p-2 sm:hidden text-white/20"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .shadow-warm { box-shadow: 0 10px 40px -10px rgba(132, 115, 101, 0.12); }
      `}</style>
      </div>
    </DashboardShell>
  );
}

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
