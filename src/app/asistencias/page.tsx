"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedClassId]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Classes solo si no están cacheadas localmente
      if (classes.length === 0) {
        const { data: classData } = await supabase.from('classes').select('id, name, category_id').order('name');
        setClasses(classData || []);
      }

      // 2. Si no hay clase seleccionada, optimizamos y salimos temprano
      if (selectedClassId === "all") {
        setStudents([]);
        setAttendanceData({});
        setLoading(false);
        return;
      }

      // 3. Fetch Students inscriptos en la clase
      const { data: enrolledStudents, error: enrollError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', selectedClassId);
      
      const studentIds = enrolledStudents?.map(e => e.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setAttendanceData({});
        setLoading(false);
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
      setLoading(false);
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
      const records = Object.values(attendanceData)
        .filter(att => att.status && att.student_id && att.class_id)
        .map(att => ({
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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">Asistencias</h1>
              <p className="text-secondary/70 mt-1">Control diario de alumnos por disciplina.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg font-medium shadow-sm min-w-[200px] justify-center">
                <Calendar className="w-4 h-4 text-primary" />
                {format(selectedDate, "eeee dd 'de' MMMM", { locale: es })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {!isSameDay(selectedDate, startOfToday()) && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(startOfToday())}>
                  Hoy
                </Button>
              )}
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative md:col-span-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              >
                <option value="all">Seleccionar Clase...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:col-span-1" />

            <Button
              variant="outline"
              className="md:col-span-1 gap-2"
              onClick={markAllPresent}
              disabled={loading || selectedClassId === "all" || filteredStudents.length === 0}
            >
              <Check className="w-4 h-4" />
              Todos Presentes
            </Button>

            <Button
              variant="primary"
              className="md:col-span-1 shadow-warm gap-2"
              onClick={saveAttendance}
              disabled={saving || filteredStudents.length === 0 || selectedClassId === "all"}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingStatus === 'success' ? '¡Guardado!' : 'Guardar Asistencias'}
            </Button>
          </div>

          {/* Attendance Table */}
          <div className="bg-card border border-border rounded-xl shadow-warm overflow-hidden">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-secondary/40">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="animate-pulse">Cargando lista de alumnos...</p>
              </div>
            ) : selectedClassId === "all" ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-secondary/40 text-center">
                <Filter className="w-12 h-12 mb-2" />
                <p className="text-lg font-serif">Selecciona una clase</p>
                <p className="text-sm max-w-xs">Elegí una clase del menú superior para ver la lista de alumnos y tomar asistencia.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-secondary/40">
                <AlertCircle className="w-12 h-12" />
                <p>No hay alumnos inscriptos en esta clase.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-secondary/60">Alumno</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-secondary/60 text-center">Estado de Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => {
                    const att = attendanceData[student.id];
                    return (
                      <tr key={student.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {student.full_name.charAt(0)}
                            </div>
                            <span className="font-semibold text-foreground">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <AttendanceButton
                              active={att?.status === 'present'}
                              onClick={() => handleStatusChange(student.id, 'present')}
                              icon={<Check className="w-4 h-4" />}
                              label="Presente"
                              variant="success"
                            />
                            <AttendanceButton
                              active={att?.status === 'absent'}
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              icon={<X className="w-4 h-4" />}
                              label="Ausente"
                              variant="danger"
                            />
                            <AttendanceButton
                              active={att?.status === 'late'}
                              onClick={() => handleStatusChange(student.id, 'late')}
                              icon={<Clock className="w-4 h-4" />}
                              label="Tarde"
                              variant="warning"
                            />
                            <AttendanceButton
                              active={att?.status === 'justified'}
                              onClick={() => handleStatusChange(student.id, 'justified')}
                              icon={<HelpCircle className="w-4 h-4" />}
                              label="Justificado"
                              variant="info"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
      </main>
    </div>
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
