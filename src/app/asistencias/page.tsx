"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAcademy } from "@/hooks/use-academy";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Search,
  Calendar,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { format, startOfToday, addDays, subDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface Student {
  id: string;
  full_name: string;
  category_id: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  category_id: string | null;
}

interface Attendance {
  student_id: string;
  class_id?: string;
  status: 'present' | 'absent' | 'late' | 'justified';
  notes?: string;
}

export default function AsistenciasPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance>>({});
  const [innerLoading, setInnerLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { academyId, userId, loading: contextLoading } = useAcademy();

  useEffect(() => {
    if (academyId && !contextLoading) {
      fetchData();
    }
  }, [selectedDate, selectedClassId, academyId, contextLoading]);

  async function fetchData() {
    if (!academyId) return;
    // No usamos el setLoading local, usamos el estado de contextLoading si fuera necesario, 
    // pero aquí mantendremos un estado de carga interno para los datos específicos de la página.
    setInnerLoading(true);
    try {
      // 1. Fetch Classes for this academy
      if (classes.length === 0) {
        const { data: classData } = await supabase
          .from('classes')
          .select('id, name, category_id')
          .eq('academy_id', academyId)
          .order('name');
        setClasses(classData || []);
      }

      // 2. Si no hay clase seleccionada, optimizamos y salimos temprano
      if (selectedClassId === "all") {
        setStudents([]);
        setAttendanceData({});
        setInnerLoading(false);
        return;
      }

      // 3. Fetch Students inscriptos en la clase (filtrado por academy_id para seguridad extra)
      const { data: enrolledStudents, error: enrollError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('academy_id', academyId)
        .eq('class_id', selectedClassId);
      
      const studentIds = enrolledStudents?.map(e => e.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setAttendanceData({});
        setInnerLoading(false);
        return;
      }

      const { data: studData } = await supabase
        .from('students')
        .select('id, full_name, category_id')
        .eq('status', 'active')
        .in('id', studentIds)
        .order('full_name');

      setStudents(studData || []);

      // 4. Fetch asistencias previas
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, status, notes, class_id')
        .eq('date', dateStr)
        .eq('class_id', selectedClassId);

      const attMap: Record<string, Attendance> = {};
      attData?.forEach(record => {
        attMap[record.student_id] = {
          student_id: record.student_id,
          class_id: record.class_id,
          status: record.status as 'present' | 'absent' | 'late' | 'justified',
          notes: record.notes
        };
      });
      setAttendanceData(attMap);

    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setInnerLoading(false);
    }
  }

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'justified') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { student_id: studentId, status, class_id: selectedClassId !== "all" ? selectedClassId : undefined }
    }));
  };

  const markAllPresent = () => {
    const newAtt = { ...attendanceData };
    students.forEach(student => {
      newAtt[student.id] = {
        student_id: student.id,
        class_id: selectedClassId !== "all" ? selectedClassId : undefined,
        status: 'present'
      };
    });
    setAttendanceData(newAtt);
  };

  const saveAttendance = async () => {
    if (selectedClassId === "all") {
      alert("Por favor selecciona una Clase específica para guardar la asistencia.");
      return;
    }
    setSaving(true);
    setSavingStatus('idle');
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      let currentUserId = userId;
      if (!currentUserId) {
        console.log("Intentando recuperar sesión...");
        const sessionRes = await supabase.auth.getSession();
        console.log("Resultado de getSession:", sessionRes);

        if (sessionRes.data.session?.user) {
          currentUserId = sessionRes.data.session.user.id;
        } else {
          const userRes = await supabase.auth.getUser();
          console.log("Resultado de getUser:", userRes);

          if (!userRes.data.user) {
            throw new Error(`No hay una sesión activa. (Error: ${userRes.error?.message || "Sin sesión local"})`);
          }
          currentUserId = userRes.data.user.id;
        }
      }

      const records = Object.values(attendanceData)
        .filter(att => att.status && att.student_id && att.class_id)
        .map(att => ({
          user_id: currentUserId,
          academy_id: academyId, // Inyectamos el ID de la academia para aislamiento
          student_id: att.student_id,
          status: att.status,
          date: dateStr,
          class_id: att.class_id,
          notes: att.notes || ''
        }));

      if (records.length === 0) {
        setSaving(false);
        return;
      }

      // Upsert: Si ya existe una asistencia para el alumno, clase y fecha, la actualiza.
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id, class_id, date' });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      
      setSavingStatus('success');
      setTimeout(() => setSavingStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      alert("Error al guardar asistencia: " + (error?.message || "Revisá la consola."));
      setSavingStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students;

  return (
    <DashboardShell>
      <div className="flex-1 overflow-y-auto px-4 md:px-16 lg:px-24 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight italic">
                Asistencias
              </h1>
              <p className="text-muted-foreground mt-2 text-lg font-light">
                Control diario de presencia por disciplina.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 w-full lg:w-auto"
            >
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-2xl border-border/40 bg-card/30 backdrop-blur-xl hover:bg-card/50"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex-1 lg:flex-none flex items-center gap-3 bg-card/30 backdrop-blur-xl border border-border/40 px-6 py-3 rounded-2xl shadow-xl shadow-black/5 justify-center min-w-[200px]">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="capitalize font-medium tracking-tight text-foreground">
                  {format(selectedDate, "eeee dd 'de' MMMM", { locale: es })}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-2xl border-border/40 bg-card/30 backdrop-blur-xl hover:bg-card/50"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              {!isSameDay(selectedDate, startOfToday()) && (
                <Button 
                  variant="ghost" 
                  className="px-4 font-bold text-primary hover:bg-primary/10 rounded-xl"
                  onClick={() => setSelectedDate(startOfToday())}
                >
                  Hoy
                </Button>
              )}
            </motion.div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Filter className="w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              </div>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-14 pl-14 pr-10 bg-card/30 backdrop-blur-xl border border-border/40 rounded-[24px] text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/40 appearance-none cursor-pointer shadow-xl shadow-black/5 text-foreground transition-all"
              >
                <option value="all" className="bg-background">Elegir Clase...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id} className="bg-background">{cls.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-focus-within:rotate-90 transition-transform" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none h-14 rounded-[24px] gap-3 font-semibold px-8 border-border/40 bg-card/30 backdrop-blur-xl hover:bg-card/50 transition-all border-dashed"
                onClick={markAllPresent}
                disabled={innerLoading || selectedClassId === "all" || filteredStudents.length === 0}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Presentes</span>
              </Button>

              <Button
                className="flex-1 sm:flex-none h-14 rounded-[24px] shadow-2xl shadow-primary/20 gap-3 font-bold px-10 bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-95"
                onClick={saveAttendance}
                disabled={saving || filteredStudents.length === 0 || selectedClassId === "all"}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : savingStatus === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{savingStatus === 'success' ? 'Guardado' : 'Guardar'}</span>
              </Button>
            </div>
          </div>

          {/* Attendance List */}
          <div className="space-y-6 mb-24">
            {innerLoading ? (
              <div className="p-32 flex flex-col items-center justify-center gap-6 text-muted-foreground/40">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                </div>
                <p className="animate-pulse font-medium text-lg tracking-tight">Recuperando registros...</p>
              </div>
            ) : selectedClassId === "all" ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-20 flex flex-col items-center justify-center gap-6 text-center bg-card/20 backdrop-blur-xl rounded-[48px] border border-border/40 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center shadow-inner relative z-10 border border-border/20">
                  <ClipboardCheck className="w-10 h-10 text-primary/40" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-serif font-medium text-foreground mb-2 italic">Listo para Auditar</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto font-light text-lg">
                    Seleccione una clase para comenzar el control de asistencia del día.
                  </p>
                </div>
              </motion.div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-24 flex flex-col items-center justify-center gap-6 text-center bg-card/10 rounded-[48px] border border-border/40">
                <AlertCircle className="w-16 h-16 text-muted-foreground/20" />
                <p className="text-xl font-medium text-muted-foreground">No se encontraron alumnos inscriptos.</p>
              </div>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredStudents.map((student) => {
                    const att = attendanceData[student.id];
                    return (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card/30 backdrop-blur-xl rounded-[32px] p-6 border border-border/40 shadow-xl"
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-serif font-extrabold text-xl shadow-lg transition-all duration-500",
                            att?.status === 'present' ? 'bg-emerald-500 shadow-emerald-500/20' : 
                            att?.status === 'absent' ? 'bg-rose-500 shadow-rose-500/20' :
                            att?.status === 'late' ? 'bg-amber-500 shadow-amber-500/20' :
                            att?.status === 'justified' ? 'bg-sky-500 shadow-sky-500/20' : 'bg-muted border border-border/40'
                          )}>
                            {student.full_name.charAt(0)}
                          </div>
                          <span className="font-semibold text-lg text-foreground tracking-tight">{student.full_name}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <AttendanceButtonMobile 
                            active={att?.status === 'present'} 
                            onClick={() => handleStatusChange(student.id, 'present')} 
                            icon={<Check className="w-5 h-5" />} 
                            label="Presente" 
                            variant="success" 
                          />
                          <AttendanceButtonMobile 
                            active={att?.status === 'absent'} 
                            onClick={() => handleStatusChange(student.id, 'absent')} 
                            icon={<X className="w-5 h-5" />} 
                            label="Ausente" 
                            variant="danger" 
                          />
                          <AttendanceButtonMobile 
                            active={att?.status === 'late'} 
                            onClick={() => handleStatusChange(student.id, 'late')} 
                            icon={<Clock className="w-5 h-5" />} 
                            label="Tarde" 
                            variant="warning" 
                          />
                          <AttendanceButtonMobile 
                            active={att?.status === 'justified'} 
                            onClick={() => handleStatusChange(student.id, 'justified')} 
                            icon={<HelpCircle className="w-5 h-5" />} 
                            label="Justif." 
                            variant="info" 
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block bg-card/20 backdrop-blur-xl rounded-[40px] border border-border/40 shadow-2xl shadow-black/10 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-card/30">
                        <th className="px-10 py-6 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Alumno</th>
                        <th className="px-10 py-6 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 text-center">Registro de Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredStudents.map((student) => {
                        const att = attendanceData[student.id];
                        return (
                          <tr key={student.id} className="hover:bg-primary/5 transition-all duration-300 group">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-foreground font-serif font-bold text-lg group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                  {student.full_name.charAt(0)}
                                </div>
                                <span className="font-semibold text-lg text-foreground tracking-tight">{student.full_name}</span>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex items-center justify-center gap-3">
                                <AttendanceButton active={att?.status === 'present'} onClick={() => handleStatusChange(student.id, 'present')} icon={<Check className="w-4 h-4" />} label="Presente" variant="success" />
                                <AttendanceButton active={att?.status === 'absent'} onClick={() => handleStatusChange(student.id, 'absent')} icon={<X className="w-4 h-4" />} label="Ausente" variant="danger" />
                                <AttendanceButton active={att?.status === 'late'} onClick={() => handleStatusChange(student.id, 'late')} icon={<Clock className="w-4 h-4" />} label="Tarde" variant="warning" />
                                <AttendanceButton active={att?.status === 'justified'} onClick={() => handleStatusChange(student.id, 'justified')} icon={<HelpCircle className="w-4 h-4" />} label="Justificado" variant="info" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap gap-8 justify-center items-center py-6 px-10 bg-card/10 backdrop-blur-md rounded-[32px] border border-border/40 max-w-3xl mx-auto shadow-xl"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80 lowercase italic font-serif">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" /> 
              Presente
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80 lowercase italic font-serif">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" /> 
              Ausente
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80 lowercase italic font-serif">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]" /> 
              Tarde
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80 lowercase italic font-serif">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.5)]" /> 
              Justificado
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}

function AttendanceButton({ active, onClick, icon, label, variant }: {
  active: boolean,
  onClick: () => void,
  icon: React.ReactNode,
  label: string,
  variant: 'success' | 'danger' | 'warning' | 'info'
}) {
  const variantStyles = {
    success: active ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-500/50" : "bg-emerald-500/5 text-emerald-500 border-emerald-500/10 hover:bg-emerald-500/10",
    danger: active ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 border-rose-500/50" : "bg-rose-500/5 text-rose-500 border-rose-500/10 hover:bg-rose-500/10",
    warning: active ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-amber-500/50" : "bg-amber-500/5 text-amber-500 border-amber-500/10 hover:bg-amber-500/10",
    info: active ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20 border-sky-500/50" : "bg-sky-500/5 text-sky-500 border-sky-500/10 hover:bg-sky-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 border",
        variantStyles[variant],
        !active && "opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
        active && "scale-105"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AttendanceButtonMobile({ active, onClick, icon, label, variant }: {
  active: boolean,
  onClick: () => void,
  icon: React.ReactNode,
  label: string,
  variant: 'success' | 'danger' | 'warning' | 'info'
}) {
  const variantStyles = {
    success: active ? "bg-emerald-500 text-white" : "bg-card/50 text-emerald-500/60 border-emerald-500/10",
    danger: active ? "bg-rose-500 text-white" : "bg-card/50 text-rose-500/60 border-rose-500/10",
    warning: active ? "bg-amber-500 text-white" : "bg-card/50 text-amber-500/60 border-amber-500/10",
    info: active ? "bg-sky-500 text-white" : "bg-card/50 text-sky-500/60 border-sky-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-4 rounded-3xl transition-all duration-300 border border-transparent",
        variantStyles[variant],
        active ? "shadow-lg scale-105" : "hover:bg-card hover:border-border/20"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
