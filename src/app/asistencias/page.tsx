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
      <div className="p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-[#111]">Asistencias</h1>
              <p className="text-[#847365] mt-1 text-sm font-medium">Control diario por disciplina.</p>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 lg:flex-none flex items-center gap-2 bg-white border border-[#E8E2DC] px-4 py-2.5 rounded-xl font-bold shadow-sm justify-center text-sm">
                <Calendar className="w-4 h-4 text-[#E67E22]" />
                <span className="capitalize">{format(selectedDate, "eee dd 'de' MMMM", { locale: es })}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              {!isSameDay(selectedDate, startOfToday()) && (
                <Button variant="ghost" className="text-xs font-bold" onClick={() => setSelectedDate(startOfToday())}>
                  Hoy
                </Button>
              )}
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#847365]/40" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-12 lg:h-14 pl-12 pr-4 bg-white border border-[#E8E2DC] rounded-2xl text-sm font-bold focus:ring-[#E67E22] appearance-none cursor-pointer shadow-sm"
              >
                <option value="all">Elegir Clase...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none h-12 lg:h-14 rounded-2xl gap-2 font-bold px-6"
                onClick={markAllPresent}
                disabled={innerLoading || selectedClassId === "all" || filteredStudents.length === 0}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Todos Presentes</span>
                <span className="sm:hidden">Todos</span>
              </Button>

              <Button
                variant="primary"
                className="flex-1 sm:flex-none h-12 lg:h-14 rounded-2xl shadow-lg gap-2 font-bold px-6 bg-[#E67E22] text-white hover:bg-[#D35400] transition-all active:scale-95"
                onClick={saveAttendance}
                disabled={saving || filteredStudents.length === 0 || selectedClassId === "all"}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingStatus === 'success' ? '¡Listo!' : 'Guardar'}
              </Button>
            </div>
          </div>

          {/* Attendance List */}
          <div className="space-y-4 mb-20">
            {innerLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#847365]/40">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="animate-pulse font-bold text-sm">Cargando alumnos...</p>
              </div>
            ) : selectedClassId === "all" ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4 text-[#847365]/40 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-[#847365]/10">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner mb-2">
                  <ClipboardCheck className="w-10 h-10 text-[#847365]/20" />
                </div>
                <p className="text-xl font-serif font-bold text-[#3A3028]">Inicia el Registro</p>
                <p className="text-xs max-w-xs font-medium">Seleccioná una clase para comenzar a tomar asistencia hoy.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4 text-[#847365]/40 text-center">
                <AlertCircle className="w-12 h-12" />
                <p className="font-bold">No hay alumnos inscriptos.</p>
              </div>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredStudents.map((student) => {
                    const att = attendanceData[student.id];
                    return (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-5 border border-[#847365]/10 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-serif font-extrabold text-lg shadow-sm transition-colors",
                            att?.status === 'present' ? 'bg-emerald-500' : 
                            att?.status === 'absent' ? 'bg-rose-500' :
                            att?.status === 'late' ? 'bg-amber-500' :
                            att?.status === 'justified' ? 'bg-sky-500' : 'bg-[#847365]'
                          )}>
                            {student.full_name.charAt(0)}
                          </div>
                          <span className="font-bold text-[#111] leading-tight">{student.full_name}</span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <button 
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all", att?.status === 'present' ? "bg-emerald-500 text-white shadow-lg" : "bg-emerald-50 text-emerald-600")}
                          >
                            <Check className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase">Pres</span>
                          </button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all", att?.status === 'absent' ? "bg-rose-500 text-white shadow-lg" : "bg-rose-50 text-rose-600")}
                          >
                            <X className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase">Aus</span>
                          </button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all", att?.status === 'late' ? "bg-amber-500 text-white shadow-lg" : "bg-amber-50 text-amber-600")}
                          >
                            <Clock className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase">Tard</span>
                          </button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'justified')}
                            className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all", att?.status === 'justified' ? "bg-sky-500 text-white shadow-lg" : "bg-sky-50 text-sky-600")}
                          >
                            <HelpCircle className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase">Just</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block bg-white rounded-[40px] border border-[#847365]/10 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#847365]/5 bg-[#F5F1EE]/30">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#847365]">Alumno</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#847365] text-center">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#847365]/5">
                      {filteredStudents.map((student) => {
                        const att = attendanceData[student.id];
                        return (
                          <tr key={student.id} className="hover:bg-[#F5F1EE]/20 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#847365]/10 flex items-center justify-center text-[#847365] font-serif font-bold">
                                  {student.full_name.charAt(0)}
                                </div>
                                <span className="font-bold text-[#111]">{student.full_name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
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
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-secondary/60">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Presente</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Ausente</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Tarde</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500" /> Justificado</div>
          </div>
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
    success: active ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400",
    danger: active ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400",
    warning: active ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400",
    info: active ? "bg-sky-500 text-white shadow-sky-500/20" : "bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400",
  };

  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
        variantStyles[variant],
        active ? "ring-2 ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100"
      )}
    >
      {icon}
      <span className={cn(active ? "inline" : "hidden md:inline")}>{label}</span>
    </button>
  );
}
