"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAcademy } from "@/hooks/use-academy";
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Group {
  id: string;
  name: string;
  description: string | null;
  academy_id: string;
  created_at: string;
  student_count?: number;
}

export default function GruposPage() {
  const { academyId, loading: contextLoading } = useAcademy();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "confirm" | "success" | "error";
    onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "", type: "info" });

  const showAlert = (title: string, message: string, type: "info" | "success" | "error" = "info") => {
    setAlertConfig({ isOpen: true, title, message, type });
  };
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertConfig({ isOpen: true, title, message, type: "confirm", onConfirm });
  };

  const fetchGroups = async () => {
    if (!academyId) return;
    setLoading(true);
    try {
      // Traer grupos con el conteo de alumnos
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*, student_groups(count)")
        .eq("academy_id", academyId)
        .order("name");

      if (error) throw error;

      const formatted = (groupsData || []).map((g: any) => ({
        ...g,
        student_count: g.student_groups?.[0]?.count ?? 0,
      }));
      setGroups(formatted);
    } catch (err: any) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (academyId && !contextLoading) {
      fetchGroups();
    }
  }, [academyId, contextLoading]);

  const openCreate = () => {
    setEditingGroup(null);
    setFormName("");
    setFormDescription("");
    setShowForm(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || "");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !academyId) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      academy_id: academyId,
    };

    let error;
    if (editingGroup) {
      const res = await supabase.from("groups").update(payload).eq("id", editingGroup.id);
      error = res.error;
    } else {
      const res = await supabase.from("groups").insert([payload]);
      error = res.error;
    }

    if (!error) {
      setShowForm(false);
      setEditingGroup(null);
      setFormName("");
      setFormDescription("");
      fetchGroups();
      showAlert("¡Éxito!", editingGroup ? "Grupo actualizado correctamente." : "Grupo creado correctamente.", "success");
    } else {
      showAlert("Error", error.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = (group: Group) => {
    showConfirm(
      "¿Eliminar Grupo?",
      `¿Estás seguro de eliminar el grupo "${group.name}"? Los alumnos no serán eliminados, solo se quitará su asignación a este grupo.`,
      async () => {
        const { error } = await supabase.from("groups").delete().eq("id", group.id);
        if (!error) {
          fetchGroups();
          showAlert("Eliminado", "El grupo fue eliminado correctamente.", "success");
        } else {
          showAlert("Error", error.message, "error");
        }
      }
    );
  };

  // Colores por índice para los grupos
  const groupColors = [
    "from-primary/80 to-primary",
    "from-indigo-500/80 to-indigo-600",
    "from-emerald-500/80 to-emerald-600",
    "from-amber-500/80 to-amber-600",
    "from-rose-500/80 to-rose-600",
    "from-cyan-500/80 to-cyan-600",
    "from-purple-500/80 to-purple-600",
    "from-orange-500/80 to-orange-600",
  ];

  return (
    <DashboardShell>
      <div className="p-4 lg:p-10 relative">
        {/* Custom Alert Modal */}
        <AnimatePresence>
          {alertConfig.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-card rounded-[32px] shadow-2xl border border-border p-8 max-w-md w-full"
              >
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">{alertConfig.title}</h3>
                <p className="text-sm text-foreground/60 mb-6">{alertConfig.message}</p>
                <div className="flex gap-3 justify-end">
                  {alertConfig.type === "confirm" && (
                    <button
                      onClick={() => setAlertConfig((p) => ({ ...p, isOpen: false }))}
                      className="px-6 py-3 rounded-2xl border border-border text-foreground/60 font-bold text-sm hover:bg-muted/50 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (alertConfig.type === "confirm") alertConfig.onConfirm?.();
                      setAlertConfig((p) => ({ ...p, isOpen: false }));
                    }}
                    className={cn(
                      "px-6 py-3 rounded-2xl font-bold text-sm transition-all",
                      alertConfig.type === "error"
                        ? "bg-rose-500 text-white"
                        : alertConfig.type === "confirm"
                        ? "bg-rose-500 text-white"
                        : "bg-primary text-white"
                    )}
                  >
                    {alertConfig.type === "confirm" ? "Confirmar" : "Entendido"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-foreground tracking-tight">
              Grupos de Alumnos
            </h1>
            <p className="text-foreground/60 text-sm font-medium mt-1">
              Organizá a tus alumnos en grupos para filtrarlos fácilmente.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold bg-primary hover:brightness-110 text-white shadow-primary/20 shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest">Nuevo Grupo</span>
          </Button>
        </header>

        {/* Form Panel */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-card border border-border p-8 rounded-[40px] shadow-warm mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                    <UsersRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-foreground">
                    {editingGroup ? `Editar: ${editingGroup.name}` : "Crear Nuevo Grupo"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground/40 hover:bg-muted/50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-1 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/30 pl-1">
                    Nombre del Grupo *
                  </label>
                  <input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Adultos, Turno Mañana..."
                    className="w-full bg-muted/20 border border-border/50 rounded-2xl px-5 py-4 font-bold text-foreground placeholder:text-foreground/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/30 pl-1">
                    Descripción (opcional)
                  </label>
                  <input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ej: Alumnos mayores de 18 años"
                    className="w-full bg-muted/20 border border-border/50 rounded-2xl px-5 py-4 font-medium text-foreground placeholder:text-foreground/20 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 h-14 rounded-2xl bg-muted/20 border border-border text-foreground/60 font-bold hover:bg-muted/40 transition-all"
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={saving}
                    type="submit"
                    className="flex-[2] h-14 rounded-2xl bg-foreground hover:bg-primary text-background hover:text-white font-bold shadow-lg transition-all active:scale-95"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>{editingGroup ? "Guardar Cambios" : "Crear Grupo"}</>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Groups Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-40" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 border-2 border-dashed border-primary/20">
              <UsersRound className="w-10 h-10 text-primary/30" />
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">Sin grupos creados</h3>
            <p className="text-foreground/40 text-sm max-w-sm">
              Creá tu primer grupo para empezar a organizar y filtrar a tus alumnos (ej: Adultos, Adolescentes, Turno Mañana).
            </p>
            <Button
              onClick={openCreate}
              className="mt-6 gap-2 px-8 h-12 rounded-2xl font-bold bg-primary hover:brightness-110 text-white shadow-primary/20 shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Crear primer grupo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                {/* Top Color Bar */}
                <div className={cn("h-2 w-full bg-gradient-to-r", groupColors[index % groupColors.length])} />

                <div className="p-6">
                  {/* Group Icon + Name */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-sm",
                        groupColors[index % groupColors.length]
                      )}
                    >
                      <UsersRound className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEdit(group)}
                        className="w-9 h-9 rounded-xl border border-border bg-muted/10 flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        className="w-9 h-9 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif font-bold text-xl text-foreground leading-tight mb-1">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-xs text-foreground/40 font-medium mb-4 leading-relaxed">
                      {group.description}
                    </p>
                  )}

                  {/* Student Count */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <Users className="w-4 h-4 text-foreground/30" />
                    <span className="text-sm font-bold text-foreground/60">
                      {group.student_count === 0
                        ? "Sin alumnos asignados"
                        : `${group.student_count} ${group.student_count === 1 ? "alumno" : "alumnos"}`}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
