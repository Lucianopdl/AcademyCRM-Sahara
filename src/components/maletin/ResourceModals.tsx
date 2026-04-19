"use client";

import React, { useState } from "react";
import { 
  X, 
  FolderPlus, 
  Link as LinkIcon, 
  Upload, 
  Loader2, 
  MessageCircle, 
  Mail,
  CheckCircle2,
  Copy,
  Share2,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export interface ResourceType {
  id: string;
  name: string;
  type: 'file' | 'link';
  url?: string;
  storage_path?: string;
  folder_id: string | null;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentFolderId: string | null;
}

export function CreateFolderModal({ isOpen, onClose, onSuccess, currentFolderId }: ModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase.from('teacher_folders').insert({
        name: name.trim(),
        parent_id: currentFolderId,
        teacher_id: user.id
      });

      if (error) throw error;
      setName("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al crear carpeta");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-warm p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-serif font-bold">Nueva Carpeta</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Nombre de la carpeta</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Ej: Material de Apoyo"
            />
          </div>
          <button 
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Carpeta"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function AddLinkModal({ isOpen, onClose, onSuccess, currentFolderId }: ModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase.from('teacher_resources').insert({
        name: name.trim(),
        type: 'link',
        url: url.trim(),
        folder_id: currentFolderId,
        teacher_id: user.id
      });

      if (error) throw error;
      setName("");
      setUrl("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar enlace");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-warm p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <LinkIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-serif font-bold">Agregar Enlace</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Título del recurso</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Ej: Video explicativo YouTube"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">URL / Link</label>
            <input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="https://youtube.com/..."
            />
          </div>
          <button 
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Link"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function UploadFileModal({ isOpen, onClose, onSuccess, currentFolderId }: ModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('teacher-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Save to Database
      const { error: dbError } = await supabase.from('teacher_resources').insert({
        name: file.name,
        type: 'file',
        storage_path: filePath,
        folder_id: currentFolderId,
        teacher_id: user.id
      });

      if (dbError) throw dbError;

      setFile(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al subir archivo");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-warm p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-serif font-bold">Subir PDF</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div 
            className={cn(
              "border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all",
              file ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
            )}
          >
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
              <Upload className={cn("w-10 h-10 mb-2 transition-colors", file ? "text-primary" : "text-secondary")} />
              <span className="text-sm font-bold text-foreground">
                {file ? file.name : "Seleccionar PDF"}
              </span>
              <span className="text-[10px] text-secondary uppercase tracking-widest mt-1">
                Límite 20MB
              </span>
            </label>
          </div>

          <button 
            disabled={!file || loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Comenzar Subida"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

interface ShareModalProps extends ModalProps {
  resource: ResourceType | null;
}

export function ShareResourceModal({ isOpen, onClose, onSuccess, resource, currentFolderId }: ShareModalProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [shared, setShared] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // En este sistema los alumnos están vinculados a la academia, 
      // pero el profe quiere sus alumnos. Por ahora listamos todos los activos de la academia.
      const { data } = await supabase
        .from('students')
        .select('id, full_name, phone, email')
        .eq('status', 'active')
        .order('full_name');
      setStudents(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getResourceLink = async () => {
    if (!resource) return "";
    if (resource.type === 'link') return resource.url || "";
    
    // Si es un archivo, generamos una URL firmada (valida por 24h)
    const { data, error } = await supabase.storage
      .from('teacher-materials')
      .createSignedUrl(resource.storage_path!, 86400);
    
    return data?.signedUrl || "";
  };

  const shareViaWhatsApp = async (student: any) => {
    const link = await getResourceLink();
    const message = `Hola ${student.full_name}, el profe te comparte este material: ${resource?.name}\n\nLink: ${link}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${student.phone?.replace(/\D/g, '')}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setShared(true);
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-warm p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold">Compartir Recurso</h2>
              <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">{resource.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar alumno..."
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="max-h-64 overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <div key={student.id} className="p-3 bg-background border border-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{student.full_name}</p>
                      <p className="text-[10px] text-secondary">{student.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => shareViaWhatsApp(student)}
                      className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all shadow-sm"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="Email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-sm text-secondary">No se encontraron alumnos.</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
