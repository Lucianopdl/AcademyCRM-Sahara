"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useAcademy } from "@/hooks/use-academy";
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
  status: 'active' | 'archived' | 'on_hold';
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
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [hasPromo, setHasPromo] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { academyId, userId, loading: contextLoading } = useAcademy();
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
    if (!academyId) return;
    setLoading(true);

    try {
      // 1. Fetch Students - Filtered by academy
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('academy_id', academyId)
        .order('full_name', { ascending: true });
      
      if (studentsData) setStudents(studentsData);

      // 2. Fetch Categories - Filtered by academy
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('academy_id', academyId)
        .order('name');
      
      if (catData) setCategories(catData);

      // 3. Fetch Payments - Filtered by academy
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { data: payData } = await supabase
        .from('payments')
        .select('id, student_id, period_month, period_year, status, amount')
        .eq('academy_id', academyId)
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear);
      
      if (payData) setPayments(payData as Payment[]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (academyId && !contextLoading) {
      fetchInitialData();
    }
  }, [academyId, contextLoading]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      full_name: formData.full_name.trim(), 
      email: formData.email || null, 
      phone: formData.phone || null,
      dni: formData.dni || null,
      birthdate: formData.birthdate || null,
      age: formData.age ? parseInt(formData.age) : null,
      address: formData.address || null,
      category_id: formData.category_id || null,
      discount_value: hasPromo ? (parseFloat(formData.discount_value) || 0) : 0,
      discount_type: formData.discount_type,
      status: 'active' as const,
      academy_id: academyId
    };

    let error;
    let createdStudentId = null;

    if (editingStudent) {
      const res = await supabase.from('students').update(payload).eq('id', editingStudent.id).select();
      error = res.error;
      createdStudentId = editingStudent.id;
    } else {
      const res = await supabase.from('students').insert([payload]).select();
      error = res.error;
      createdStudentId = res.data?.[0]?.id;
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
               notes: 'Alta de Alumno - Cuota Inicial',
               academy_id: academyId // FIX: Añadido academy_id faltante
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
      setSearch(""); // Limpiar búsqueda para ver el nuevo alumno
      setActiveTab('active'); // Asegurar pestaña de activos
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

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'archived') => {
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

        const { error } = await supabase.from('payments').insert(newFees.map(f => ({ ...f, academy_id: academyId })));
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

        const { error } = await supabase.from('payments').insert(newFees.map(f => ({ ...f, academy_id: academyId })));
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
      .eq('academy_id', academyId)
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
      const res = await bulkDeleteStudentsAction(selectedIds, academyId!);
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
    const res = await bulkUpdateStatusAction(selectedIds, status, academyId!);
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
    const matchesSearch = (s.full_name || "").toLowerCase().includes(search.toLowerCase()) || 
                         (s.dni && s.dni.includes(search));
    
    // Soporte para estados antiguos: 'inactive' ahora se considera 'archived'
    let currentStatus: string = s.status || 'active';
    if (currentStatus === 'inactive') currentStatus = 'archived';
    
    const matchesStatus = currentStatus === activeTab;
    
    const matchesCategory = filterCategory === "all" || s.category_id === filterCategory;
    
    const isPaid = payments.some(p => p.student_id === s.id);
    const matchesPayment = filterStatus === "all" || 
                          (filterStatus === "paid" && isPaid) || 
                          (filterStatus === "debtor" && !isPaid);

    return matchesSearch && matchesStatus && matchesCategory && matchesPayment;
  });

  if (!loading && !academyId) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-foreground">No se detectó tu Academia</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            No pudimos vincular tu sesión con una academia activa. 
            Por favor, reingresá al sistema o contactá al administrador.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-primary text-white rounded-2xl px-8 hover:brightness-110 transition-all font-bold"
          >
            Reintentar Carga
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 lg:p-10 relative">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-foreground tracking-tight">Gestión de Alumnos</h1>
            <p className="text-foreground/60 text-sm font-medium mt-1">Legajos individuales y control administrativo.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button 
              onClick={handleBulkGenerateFees}
              disabled={isBulkLoading}
              className="gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold transition-all bg-foreground text-background hover:brightness-110 active:scale-95 shadow-lg flex items-center justify-center order-2 sm:order-1"
            >
              {isBulkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5 text-primary" />}
              <span className="text-xs uppercase tracking-widest">Facturación</span>
            </Button>

             {/* El importador de Excel ha sido removido por solicitud del usuario */}


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
                 className="gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold border-destructive/20 text-destructive hover:bg-destructive/5 transition-all shadow-sm order-3"
               >
                 <Trash2 className="w-5 h-5" />
                 <span className="text-xs uppercase tracking-widest text-destructive">Vaciar</span>
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
              className={cn("gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold transition-all shadow-lg active:scale-95 order-1 sm:order-2", showAddForm ? "bg-muted text-muted-foreground" : "bg-primary hover:brightness-110 text-white shadow-primary/20")}
            >
              {showAddForm ? "Cerrar Panel" : <><Plus className="w-5 h-5" /> <span className="text-xs uppercase tracking-widest">Inscribir</span></>}
            </Button>
          </div>
        </header>

        {/* Tab Switcher - Sahara Style */}
        <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-[24px] w-fit mb-8 border border-border/50 shadow-sm">
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === 'active' 
                ? "bg-card text-primary shadow-md ring-1 ring-border/50" 
                : "text-foreground/40 hover:text-foreground"
            )}
          >
            Activos
          </button>
          <button 
            onClick={() => setActiveTab('archived')}
            className={cn(
              "px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === 'archived' 
                ? "bg-card text-primary shadow-md ring-1 ring-border/50" 
                : "text-foreground/40 hover:text-foreground"
            )}
          >
            Archivados
          </button>
        </div>

        <AnimatePresence>

          {showAddForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-card border border-border p-10 rounded-[48px] shadow-warm mb-10">
              <div className="flex items-center gap-4 mb-10 border-b border-border pb-6">
                <div className="w-12 h-12 bg-foreground rounded-2xl flex items-center justify-center text-background"><User className="w-6 h-6" /></div>
                <div>
                    <h3 className="text-2xl font-serif font-bold text-foreground">{editingStudent ? `Editar Legajo: ${editingStudent.full_name}` : "Ficha de Inscripción"}</h3>
                    <p className="text-xs text-foreground/40 font-medium opacity-60">Completá todos los campos para el legajo oficial.</p>
                </div>
              </div>
              
              <form onSubmit={handleAddStudent} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                       <IdCard className="w-4 h-4 text-primary" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Identidad</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Nombre Completo</label>
                          <input required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 font-bold text-foreground placeholder:text-foreground/20 transition-all" placeholder="Ej: Juan Pérez" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Documento</label>
                             <input required value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-xl px-4 py-3 font-medium placeholder:text-foreground/20 text-foreground transition-all" placeholder="DNI" />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Edad</label>
                             <input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-xl px-4 py-3 font-medium text-center placeholder:text-foreground/20 text-foreground transition-all" placeholder="00" />
                           </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Fecha de Nacimiento</label>
                            <div className="relative">
                                <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 pointer-events-none" />
                                <input type="date" value={formData.birthdate} onChange={(e) => setFormData({...formData, birthdate: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-xl px-4 py-3 font-medium text-foreground transition-all" />
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                       <Mail className="w-4 h-4 text-primary" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Contacto</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">WhatsApp / Teléfono</label>
                          <div className="relative">
                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                             <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-xl pl-12 pr-4 py-4 font-medium text-foreground placeholder:text-foreground/20 transition-all" placeholder="+54 9..." />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Email</label>
                          <input value={formData.email} type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-xl px-4 py-4 font-medium text-foreground placeholder:text-foreground/20 transition-all" placeholder="ejemplo@correo.com" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Dirección</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                                <input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-muted/20 border border-border/50 rounded-xl pl-12 pr-4 py-4 font-medium text-foreground placeholder:text-foreground/20 transition-all" placeholder="Calle, Nro, Ciudad" />
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="bg-muted/10 p-8 rounded-[40px] border border-border/50 transition-all space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                           <DollarSign className="w-4 h-4 text-primary" />
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Administración</h4>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 pl-1">Disciplina / Categoría</label>
                          <select required value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full bg-card border border-border/50 rounded-2xl px-5 py-4 font-black shadow-sm mb-4 text-foreground appearance-none cursor-pointer hover:bg-muted/20 transition-all focus:ring-2 focus:ring-primary/20 outline-none">
                              <option value="" className="bg-card text-foreground">Elegir Disciplina...</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-card text-foreground font-sans font-medium">{cat.name} — ${cat.price.toLocaleString()}</option>)}
                          </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">¿Aplicar Beca / Promo?</span>
                            <button type="button" onClick={() => setHasPromo(!hasPromo)} className={cn("w-11 h-6 rounded-full relative transition-all duration-300", hasPromo ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted/50")}>
                              <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm", hasPromo ? "right-1" : "left-1")} />
                            </button>
                        </div>
                        {hasPromo && (
                           <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                               <div className="flex gap-2">
                                  <input type="number" value={formData.discount_value} onChange={(e) => setFormData({...formData, discount_value: e.target.value})} className="w-2/3 bg-card border border-border/50 rounded-xl px-4 py-3 font-bold text-foreground focus:ring-1 focus:ring-primary/20 outline-none" placeholder="Valor" />
                                  <select value={formData.discount_type} onChange={(e) => setFormData({...formData, discount_type: e.target.value as any})} className="w-1/3 bg-card border border-border/50 rounded-xl px-2 py-3 text-[10px] font-black uppercase tracking-widest text-foreground outline-none">
                                    <option value="percentage" className="bg-card">%</option>
                                    <option value="fixed" className="bg-card">$</option>
                                  </select>
                               </div>
                               <div className="p-4 bg-card rounded-2xl flex items-center justify-between border border-border/50 shadow-sm">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 leading-none">Precio Final</span>
                                  <span className="text-xl font-black text-foreground leading-none">${calculateFinalPrice()?.toLocaleString()}</span>
                               </div>
                           </div>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                   <Button disabled={saving} type="submit" className="bg-foreground hover:bg-primary text-background hover:text-white px-16 h-18 rounded-[32px] font-black text-lg shadow-xl transition-all active:scale-95 py-6">
                      {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingStudent ? "Guardar Cambios" : "Confirmar Alta de Alumno")}
                   </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Cobro (Payment) */}
        <AnimatePresence>
          {showPaymentPanel && selectedStudent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="bg-card w-full max-w-xl rounded-[40px] shadow-2xl border border-border overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20"><Calculator className="w-7 h-7" /></div>
                    <div>
                      <h3 className="text-2xl font-serif font-black text-foreground">Cobro de Cuota</h3>
                      <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest">{selectedStudent?.full_name}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSavePayment}>
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 pl-1">Mes a Cobrar</label>
                        <select value={paymentData.month} onChange={(e) => setPaymentData({...paymentData, month: parseInt(e.target.value)})} className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                          {Array.from({length: 12}, (_, i) => (
                            <option key={i+1} value={i+1} className="bg-card text-foreground">
                              {new Date(0, i).toLocaleString('es-AR', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 pl-1">Año</label>
                        <select value={paymentData.year} onChange={(e) => setPaymentData({...paymentData, year: parseInt(e.target.value)})} className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                          <option value={new Date().getFullYear()} className="bg-card text-foreground">{new Date().getFullYear()}</option>
                          <option value={new Date().getFullYear()+1} className="bg-card text-foreground">{new Date().getFullYear()+1}</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Monto a Percibir</p>
                        <div className="flex items-center gap-1">
                          <span className="text-3xl font-black text-foreground">$</span>
                          <input 
                            type="number" 
                            value={paymentData.amount} 
                            onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                            className="text-3xl font-black bg-transparent border-none outline-none text-foreground w-32"
                          />
                        </div>
                      </div>
                      <DollarSign className="w-10 h-10 text-primary opacity-20" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 pl-1">Método de Pago</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'cash', label: 'Efectivo' },
                          { id: 'transfer', label: 'Transferencia' },
                          { id: 'card', label: 'Tarjeta' },
                          { id: 'other', label: 'Otro' }
                        ].map((m) => (
                          <button 
                            type="button"
                            key={m.id} 
                            onClick={() => setPaymentData({...paymentData, method: m.id})} 
                            className={cn(
                              "py-4 rounded-2xl font-bold text-sm transition-all border", 
                              paymentData.method === m.id ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "bg-muted/20 text-foreground/60 border-border hover:bg-muted/40"
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-muted/10 flex gap-4">
                    <button type="button" onClick={() => setShowPaymentPanel(false)} className="flex-1 py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest text-foreground/40 hover:bg-muted/50 transition-all border border-border/50">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-[2] bg-foreground hover:bg-primary text-background hover:text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Confirmar Cobro</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filters Bar */}
        <section className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 transition-colors group-focus-within:text-primary" />
            <input 
              placeholder="Buscar por nombre, DNI o teléfono..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 lg:h-14 bg-card border border-border rounded-2xl lg:rounded-3xl focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-foreground/20 text-base w-full text-foreground"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="relative flex-1 lg:w-48 group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors pointer-events-none" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-12 lg:h-14 bg-card border border-border rounded-2xl lg:rounded-3xl pl-10 pr-4 text-foreground/80 font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-card text-foreground">Todos</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-card text-foreground">{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 lg:w-48 group">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-12 lg:h-14 bg-card border border-border rounded-2xl lg:rounded-3xl pl-10 pr-4 text-foreground/80 font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-card text-foreground">Pagos (Todo)</option>
                <option value="paid" className="bg-card text-emerald-600 font-bold">Al Día</option>
                <option value="debtor" className="bg-card text-rose-600 font-bold">Morosos</option>
              </select>
            </div>

            <Button className="shrink-0 w-12 lg:w-14 h-12 lg:h-14 rounded-2xl lg:rounded-3xl bg-card border border-border text-foreground/20 hover:text-primary hover:bg-muted/50 transition-all shadow-sm flex items-center justify-center p-0">
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
              <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto opacity-40" /></div>
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
                    "bg-card rounded-3xl p-5 border shadow-sm relative overflow-hidden transition-all",
                    selectedIds.includes(s.id) ? "border-primary ring-1 ring-primary" : "border-border"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-xl shadow-sm">
                        {s.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/alumnos/${s.id}`} className="font-bold text-foreground leading-tight block truncate">{s.full_name}</Link>
                        <p className="text-[10px] font-black text-primary uppercase tracking-wider">{categories.find(c => c.id === s.category_id)?.name || 'SIN CLASE'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="p-2 bg-muted rounded-xl text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openPayment(s)} className="p-2 bg-primary/10 rounded-xl text-primary"><Receipt className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">DNI</span>
                      <span className="text-xs font-bold text-foreground/80">{s.dni || "-"}</span>
                    </div>
                    <div>
                      {isPaid ? (
                        <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Al Día</span>
                      ) : hasPending ? (
                        <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-rose-500/20">Deuda: ${payment?.amount}</span>
                      ) : (
                        <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-border/50">Sin Cargo</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50 gap-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleSelectOne(s.id)}
                        className="flex items-center gap-2"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                          selectedIds.includes(s.id) ? "bg-primary border-primary" : "border-border bg-muted/20"
                        )}>
                          {selectedIds.includes(s.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </button>

                      <button 
                        onClick={() => openEdit(s)}
                        className="w-10 h-10 rounded-xl border border-border/50 bg-muted/10 flex items-center justify-center text-foreground active:scale-90 transition-all hover:bg-muted/30"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => {
                            showConfirm(
                                s.status === 'active' ? "¿Archivar Legajo?" : "¿Restaurar Legajo?",
                                s.status === 'active' ? `¿Estás seguro de archivar a ${s.full_name}?` : `¿Deseas activar nuevamente a ${s.full_name}?`,
                                () => handleStatusChange(s.id, s.status === 'active' ? 'archived' : 'active')
                            );
                        }} 
                        className={cn(
                          "w-10 h-10 rounded-xl border border-border/50 bg-muted/10 flex items-center justify-center transition-all active:scale-90 hover:bg-muted/30",
                          s.status === 'active' ? "text-muted-foreground/40" : "text-emerald-600"
                        )}
                      >
                         {s.status === 'active' ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                      </button>

                      {s.status === 'archived' && (
                        <button 
                          onClick={() => {
                              showConfirm(
                                  "¿Eliminar Permanentemente?",
                                  `Esta acción ELIMINARÁ DEFINITIVAMENTE a ${s.full_name}. No se puede deshacer.`,
                                  () => handleDeleteStudent(s.id)
                              );
                          }} 
                          className="w-10 h-10 rounded-xl border border-rose-500/10 bg-rose-500/5 flex items-center justify-center text-rose-400 active:scale-90 transition-all hover:bg-rose-500 hover:text-white"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <Link href={`/alumnos/${s.id}`} className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2 bg-primary/10 px-4 py-2.5 rounded-xl border border-primary/20 hover:bg-primary/20 transition-all">
                      Perfil <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* VISTA DESKTOP: Tabla Tradicional */}
          <div className="hidden lg:block bg-card rounded-[32px] border border-border shadow-warm-lg overflow-hidden pb-6">
            <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/10 border-b border-border/50">
                <th className="pl-14 py-8 w-32 text-left">
                   <button 
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-6 h-6 rounded-xl border-2 transition-all flex items-center justify-center",
                        selectedIds.length > 0 && selectedIds.length === filteredStudents.length
                          ? "bg-primary border-primary shadow-lg shadow-primary/20" 
                          : "border-border bg-card hover:border-primary/50"
                      )}
                   >
                      {selectedIds.length > 0 && selectedIds.length === filteredStudents.length && <Check className="w-4 h-4 text-white stroke-[4]" />}
                   </button>
                </th>
                <th className="py-8 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Alumno / Clase</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Estado de Cuenta</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Beneficio</th>
                <th className="pr-14 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (<tr><td colSpan={5} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto opacity-40" /></td></tr>) : filteredStudents.map((s) => {
                const payment = payments.find(p => p.student_id === s.id);
                const isPaid = payment?.status === 'completed';
                const hasPending = payment?.status === 'pending';
                return (
                  <tr key={s.id} className={cn("group hover:bg-muted/20 transition-all", selectedIds.includes(s.id) && "bg-muted/40")}>
                    <td className="pl-14 py-8 pr-10">
                       <button 
                          onClick={() => toggleSelectOne(s.id)}
                          className={cn(
                            "w-6 h-6 rounded-xl border-2 transition-all flex items-center justify-center",
                            selectedIds.includes(s.id) 
                              ? "bg-primary border-primary shadow-lg shadow-primary/20" 
                              : "border-border bg-card hover:border-primary/50"
                          )}
                       >
                          {selectedIds.includes(s.id) && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                       </button>
                    </td>
                    <td className="py-8">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-xl shadow-sm">{s.full_name.charAt(0)}</div>
                          <Link href={`/alumnos/${s.id}`} className="group/name">
                            <p className="font-serif font-bold text-xl text-foreground group-hover/name:text-primary transition-colors leading-none mb-2">{s.full_name}</p>
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                              {categories.find(c => c.id === s.category_id)?.name || 'SIN CLASE'}
                            </span>
                          </Link>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       {isPaid ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Pagado</span>
                       ) : hasPending ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-rose-500/20 shadow-sm"><Calculator className="w-3.5 h-3.5" /> Deuda: ${payment?.amount}</span>
                       ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted/40 text-muted-foreground rounded-2xl text-[9px] font-black uppercase tracking-widest border border-border/50"><AlertCircle className="w-3.5 h-3.5" /> Pendiente</span>
                       )}
                    </td>
                    <td className="px-10 py-8">
                       {s.discount_value > 0 ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-sm"><Ticket className="w-3.5 h-3.5" /> Promo: {s.discount_type === 'percentage' ? `-${s.discount_value}%` : `-$${s.discount_value}`}</div>
                       ) : <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sin Promo</span>}
                    </td>
                    <td className="pr-14 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                          {s.status === 'active' && (
                            <Button 
                              onClick={() => openPayment(s)} 
                              className={cn(
                                "h-11 px-6 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all outline-none border-none",
                                hasPending 
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20" 
                                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                              )}
                            >
                              {hasPending ? "Cobrar" : "Generar"}
                            </Button>
                          )}
                          <Link 
                            href={`/alumnos/${s.id}`} 
                            className="w-11 h-11 rounded-2xl border border-border/50 bg-muted/10 flex items-center justify-center text-foreground hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm"
                            title="Ver Perfil"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => openEdit(s)} 
                            className="w-11 h-11 rounded-2xl border border-border/50 bg-muted/10 flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-all active:scale-90 shadow-sm"
                            title="Editar Datos"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                                showConfirm(
                                    s.status === 'active' ? "¿Archivar Legajo?" : "¿Restaurar Legajo?",
                                    s.status === 'active' ? `¿Estás seguro de archivar a ${s.full_name}? No aparecerá en los listados activos.` : `¿Deseas activar nuevamente a ${s.full_name}?`,
                                    () => handleStatusChange(s.id, s.status === 'active' ? 'archived' : 'active')
                                );
                            }} 
                            className={cn(
                              "w-11 h-11 rounded-2xl border border-border/50 bg-muted/10 flex items-center justify-center transition-all active:scale-90 shadow-sm",
                              s.status === 'active' ? "text-muted-foreground/40 hover:bg-foreground hover:text-background" : "text-emerald-600 hover:bg-emerald-600 hover:text-white"
                            )}
                            title={s.status === 'active' ? "Archivar Alumno" : "Restaurar Alumno"}
                          >
                             {s.status === 'active' ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                          </button>

                          {s.status === 'archived' && (
                            <button 
                              onClick={() => {
                                  showConfirm(
                                      "¿Eliminar Permanentemente?",
                                      `Esta acción ELIMINARÁ DEFINITIVAMENTE a ${s.full_name} del sistema.`,
                                      () => handleDeleteStudent(s.id)
                                  );
                              }} 
                              className="w-11 h-11 rounded-2xl border border-rose-500/10 bg-rose-500/5 flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-sm"
                              title="Eliminar del Sistema"
                            >
                               <Trash2 className="w-4 h-4" />
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
              <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No se encontraron alumnos en esta sección.</p>
            </div>
          )}
        </div>

        {/* La barra de acciones masivas fue unificada al final del archivo para evitar superposiciones */}

      </div>
      {/* Modal de Comprobante / Factura Premium */}
      <AnimatePresence>
        {invoiceData?.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 40, opacity: 0 }} transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }} className="bg-card w-full max-w-[380px] max-h-[90vh] overflow-y-auto rounded-[28px] shadow-2xl border border-border">
              
              {/* Captura para PDF */}
              <div ref={receiptRef} className="bg-card text-foreground">
                {/* Header compacto */}
                <div className="relative bg-foreground px-6 pt-6 pb-5 text-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-8 -left-8 w-28 h-28 bg-primary rounded-full blur-3xl" />
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-primary rounded-[16px] mx-auto mb-3 flex items-center justify-center shadow-lg shadow-primary/25">
                      <Receipt className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-background text-xl font-serif font-black tracking-tight">Comprobante de Pago</h3>
                    <p className="text-background/40 text-[8px] font-black uppercase tracking-[0.3em] mt-1">Sahara · Gestión Académica</p>
                  </div>
                </div>

                {/* N° Recibo y Fecha */}
                <div className="flex justify-between items-center px-6 py-3 bg-muted/20 border-b border-border">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-foreground/40">N° Recibo</p>
                    <p className="font-mono font-extrabold text-foreground text-xs tracking-wider">{invoiceData.receiptNumber}</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div className="text-right">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-foreground/40">Fecha</p>
                    <p className="font-extrabold text-foreground text-xs">{invoiceData.date}</p>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="px-6 py-5 space-y-4">
                  {/* Info alumno */}
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-white text-base font-black">{invoiceData.studentName.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-foreground text-sm leading-tight truncate">{invoiceData.studentName}</p>
                      <p className="text-foreground/60 text-[10px] font-bold">DNI: {invoiceData.studentDni} · {invoiceData.categoryName}</p>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="bg-muted/10 rounded-xl border border-border overflow-hidden text-[12px]">
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-foreground/40">Concepto</span>
                      <span className="font-extrabold text-foreground">Cuota {months[invoiceData.month - 1]} {invoiceData.year}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">Método</span>
                      <span className="font-extrabold text-foreground">{invoiceData.method}</span>
                    </div>
                    {invoiceData.notes && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">Notas</span>
                          <span className="font-bold text-foreground/60 text-[11px] max-w-[160px] text-right">{invoiceData.notes}</span>
                        </div>
                      </>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">Estado</span>
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Pagado
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-primary rounded-xl flex justify-between items-center shadow-md shadow-primary/15 relative overflow-hidden">
                    <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/5 rounded-full" />
                    <div className="relative z-10">
                      <span className="text-white/60 text-[7px] font-black uppercase tracking-[0.25em] block mb-0.5">Total Abonado</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-white/70 text-sm font-bold">$</span>
                        <span className="text-white text-2xl font-black leading-none">{invoiceData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-white/10 relative z-10" />
                  </div>

                  <p className="text-center text-[8px] text-foreground/40 font-bold tracking-wide">Este comprobante es válido como constancia de pago.</p>
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
                  className="h-10 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-black text-[8px] uppercase tracking-[0.1em] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
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
                  className="h-10 bg-foreground hover:bg-foreground/90 text-background rounded-lg font-black text-[8px] uppercase tracking-[0.1em] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
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
                className="w-full h-10 border-t border-border text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all"
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-card w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden border border-border">
               <div className="p-10 text-center">
                  <div className={cn("w-20 h-20 rounded-[28px] mx-auto mb-6 flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-500", 
                    alertConfig.type === 'confirm' ? "bg-indigo-600 text-white shadow-indigo-500/20" : 
                    alertConfig.type === 'success' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                    alertConfig.type === 'error' ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-primary text-white shadow-primary/20"
                  )}>
                    {alertConfig.type === 'confirm' ? <Archive className="w-10 h-10" /> : 
                     alertConfig.type === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
                     alertConfig.type === 'error' ? <XCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                  </div>
                  <h3 className="text-3xl font-serif font-extrabold text-foreground leading-tight mb-3">{alertConfig.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">{alertConfig.message}</p>
               </div>
               <div className="flex border-t border-border h-20">
                  {alertConfig.type === 'confirm' && (
                    <button 
                      onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                      className="flex-1 h-full text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-colors border-r border-border"
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
                    className={cn("flex-1 h-full text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 active:scale-95", 
                      alertConfig.type === 'confirm' ? "bg-indigo-600" :
                      alertConfig.type === 'success' ? "bg-emerald-500" :
                      alertConfig.type === 'error' ? "bg-rose-500" : "bg-primary"
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
            <div className="bg-card/80 backdrop-blur-2xl text-foreground rounded-[32px] p-4 lg:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col lg:flex-row items-center justify-between gap-5 border border-border/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto justify-between lg:justify-start border-b lg:border-none border-border/50 pb-4 lg:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20 shrink-0">
                    {selectedIds.length}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-0.5">Seleccionados</p>
                    <p className="text-xs font-bold text-foreground flex items-center gap-2">
                       Acciones Masivas
                       {isBulkLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="lg:hidden p-2 bg-muted rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-4 flex-1 w-full lg:w-auto">
                <div className="bg-muted/50 hover:bg-muted transition-all rounded-2xl p-2 px-4 border border-border/50 flex flex-col gap-0.5 min-w-[130px] flex-1 sm:flex-none">
                  <span className="text-[7px] font-black uppercase tracking-widest text-primary">Disciplina</span>
                  <select 
                    onChange={(e) => handleBulkAssignCategory(e.target.value)}
                    disabled={isBulkLoading}
                    value=""
                    className="bg-transparent border-none text-[11px] font-bold focus:ring-0 cursor-pointer p-0 text-foreground w-full outline-none appearance-none"
                  >
                    <option value="" disabled className="bg-card text-foreground">Asignar a...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-card text-foreground">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="h-8 w-px bg-border hidden xl:block" />

                <div className="grid grid-cols-2 sm:flex items-center gap-2 flex-1 sm:flex-none">
                  <Button 
                    onClick={handleBulkGenerateSelectedFees}
                    disabled={isBulkLoading}
                    className="bg-primary hover:brightness-110 text-white h-11 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 transition-all active:scale-95 border-none w-full sm:w-auto shadow-lg shadow-primary/10"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Facturar
                  </Button>

                  <Button 
                    onClick={() => handleBulkArchive('archived')}
                    disabled={isBulkLoading}
                    variant="outline"
                    className="bg-card border-border/50 text-foreground hover:bg-muted rounded-xl h-11 flex items-center gap-2 px-4 transition-all active:scale-95 w-full sm:w-auto"
                  >
                    <Archive className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Archivar</span>
                  </Button>

                  <Button 
                    onClick={handleBulkDelete}
                    disabled={isBulkLoading}
                    variant="ghost"
                    className="col-span-2 sm:col-auto bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl h-11 flex items-center justify-center gap-2 px-4 transition-all active:scale-95 w-full sm:w-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Eliminar</span>
                  </Button>
                </div>
              </div>

              <div className="items-center gap-4 shrink-0 border-l border-white/10 pl-6 hidden lg:flex">
                <button 
                  onClick={() => setSelectedIds([])}
                  className="group flex flex-col items-center gap-1 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-all">
                    <XCircle className="w-5 h-5 text-white/40 group-hover:text-white" />
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-60 transition-opacity">Cerrar</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </DashboardShell>
  );
}

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
