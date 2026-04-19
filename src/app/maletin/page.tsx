"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderPlus, 
  FilePlus, 
  Link as LinkIcon, 
  ChevronRight, 
  MoreVertical, 
  Folder, 
  FileText, 
  Share2, 
  Trash2,
  Download,
  ExternalLink,
  Search,
  ArrowLeft,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/dashboard-shell";

import { 
  CreateFolderModal, 
  AddLinkModal, 
  UploadFileModal,
  ShareResourceModal,
  ResourceType
} from "@/components/maletin/ResourceModals";

interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
}


export default function MaletinPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [resources, setResources] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Mi Maletín'}]);

  // Modal States
  const [modals, setModals] = useState({
    folder: false,
    link: false,
    file: false,
    share: false
  });
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);

  // Fetch folders and resources
  const fetchData = async (folderId: string | null) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch folders
      let foldersQuery = supabase
        .from('teacher_folders')
        .select('*')
        .eq('teacher_id', user.id);
      
      if (folderId === null) {
        foldersQuery = foldersQuery.is('parent_id', null);
      } else {
        foldersQuery = foldersQuery.eq('parent_id', folderId);
      }
      
      const { data: foldersData } = await foldersQuery;

      // Fetch resources
      let resourcesQuery = supabase
        .from('teacher_resources')
        .select('*')
        .eq('teacher_id', user.id);
      
      if (folderId === null) {
        resourcesQuery = resourcesQuery.is('folder_id', null);
      } else {
        resourcesQuery = resourcesQuery.eq('folder_id', folderId);
      }
      
      const { data: resourcesData } = await resourcesQuery;

      setFolders(foldersData || []);
      setResources(resourcesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentFolderId);
  }, [currentFolderId]);

  const navigateToFolder = (folder: FolderType) => {
    setCurrentFolderId(folder.id);
    setPath([...path, { id: folder.id, name: folder.name }]);
  };

  const navigateBack = (index: number) => {
    const newPath = path.slice(0, index + 1);
    const target = newPath[newPath.length - 1];
    setPath(newPath);
    setCurrentFolderId(target.id);
  };

  const handleDownload = async (resource: ResourceType) => {
    if (!resource.storage_path) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('teacher-materials')
        .createSignedUrl(resource.storage_path, 60); // 1 minute is enough for immediate download

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error al descargar el archivo");
    }
  };

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Maletín del Profe</h1>
            <p className="text-secondary text-sm">Organiza tus materiales y compártelos con tus alumnos.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setModals({...modals, folder: true})}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nueva Carpeta</span>
            </button>
            <button 
              onClick={() => setModals({...modals, link: true})}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Link</span>
            </button>
            <button 
              onClick={() => setModals({...modals, file: true})}
              className="btn-primary flex items-center gap-2"
            >
              <FilePlus className="w-4 h-4" />
              <span>Subir PDF</span>
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-secondary overflow-x-auto pb-2 no-scrollbar">
          {path.map((p, i) => (
            <React.Fragment key={p.id || 'root'}>
              <button 
                onClick={() => navigateBack(i)}
                className={cn(
                  "hover:text-primary transition-colors whitespace-nowrap",
                  i === path.length - 1 ? "text-foreground font-semibold" : ""
                )}
              >
                {p.name}
              </button>
              {i < path.length - 1 && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </nav>

        {/* Search & Filters */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          <input 
            type="text" 
            placeholder="Buscar en el maletín..." 
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {/* Folders */}
              {folders.map((folder) => (
                <motion.div
                  key={folder.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => navigateToFolder(folder)}
                  className="sahara-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 group transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Folder className="w-6 h-6 fill-current opacity-20" />
                    <Folder className="w-6 h-6 absolute" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-foreground truncate">{folder.name}</h3>
                    <p className="text-[10px] text-secondary uppercase tracking-wider">Carpeta</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('¿Eliminar esta carpeta y todo su contenido?')) {
                          await supabase.from('teacher_folders').delete().eq('id', folder.id);
                          fetchData(currentFolderId);
                        }
                      }}
                      className="p-2 hover:bg-background rounded-lg text-secondary hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* Resources */}
              {resources.map((resource) => (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="sahara-card p-4 flex flex-col gap-4 group hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      resource.type === 'file' ? "bg-blue-500/10 text-blue-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {resource.type === 'file' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </div>
                  <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResource(resource);
                          setModals({...modals, share: true});
                        }}
                        title="Compartir" 
                        className="p-2 hover:bg-background rounded-lg text-secondary hover:text-primary transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('¿Eliminar este recurso?')) {
                            if (resource.type === 'file' && resource.storage_path) {
                              await supabase.storage.from('teacher-materials').remove([resource.storage_path]);
                            }
                            await supabase.from('teacher_resources').delete().eq('id', resource.id);
                            fetchData(currentFolderId);
                          }
                        }}
                        title="Eliminar" 
                        className="p-2 hover:bg-background rounded-lg text-secondary hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground line-clamp-1">{resource.name}</h3>
                    <p className="text-[10px] text-secondary uppercase tracking-wider">
                      {resource.type === 'file' ? 'Documento PDF' : 'Enlace Externo'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {resource.type === 'file' ? (
                      <button 
                        onClick={() => handleDownload(resource)}
                        className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-primary/5 text-primary text-xs font-bold rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar
                      </button>
                    ) : (
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-primary/5 text-primary text-xs font-bold rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir Link
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty State */}
            {!loading && folders.length === 0 && resources.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-secondary/5 flex items-center justify-center text-secondary/20">
                  <FolderOpen className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-foreground">Esta carpeta está vacía</h3>
                  <p className="text-secondary text-sm max-w-xs">Sube archivos o crea subcarpetas para empezar a organizar tu material.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <CreateFolderModal 
          isOpen={modals.folder} 
          onClose={() => setModals({...modals, folder: false})} 
          onSuccess={() => fetchData(currentFolderId)} 
          currentFolderId={currentFolderId} 
        />
        <AddLinkModal 
          isOpen={modals.link} 
          onClose={() => setModals({...modals, link: false})} 
          onSuccess={() => fetchData(currentFolderId)} 
          currentFolderId={currentFolderId} 
        />
        <UploadFileModal 
          isOpen={modals.file} 
          onClose={() => setModals({...modals, file: false})} 
          onSuccess={() => fetchData(currentFolderId)} 
          currentFolderId={currentFolderId} 
        />
        <ShareResourceModal 
          isOpen={modals.share} 
          onClose={() => setModals({...modals, share: false})} 
          onSuccess={() => {}} 
          resource={selectedResource}
          currentFolderId={currentFolderId} 
        />
      </div>
    </DashboardShell>
  );
}
