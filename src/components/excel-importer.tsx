"use client";

import React, { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { importStudentsAction } from "@/app/alumnos/actions";
import { motion, AnimatePresence } from "framer-motion";

interface ExcelImporterProps {
  academyId: string;
  onSuccess: () => void;
}

export function ExcelImporter({ academyId, onSuccess }: ExcelImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!academyId) {
      setStatus({ type: 'error', message: "No se pudo detectar la academia. Reintenta en unos segundos." });
      return;
    }

    setLoading(true);
    setStatus(null);

    const reader = new FileReader();

    reader.onerror = () => {
      setLoading(false);
      setStatus({ type: 'error', message: "Error al leer el archivo. Intentá de nuevo." });
    };

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          throw new Error("El archivo Excel no tiene datos válidos.");
        }

        const res = await importStudentsAction(academyId, data);
        if (res.success) {
          setStatus({ type: 'success', message: res.message });
          onSuccess();
          setTimeout(() => {
            setIsOpen(false);
            setStatus(null);
          }, 2000);
        } else {
          setStatus({ type: 'error', message: res.message });
        }
      } catch (err: any) {
        console.error("Error processing excel:", err);
        setStatus({ type: 'error', message: "Error: " + (err.message || "Archivo incompatible") });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);

  };

  const downloadTemplate = () => {
    const template = [
      { 'NOMBRE Y APELLIDO': 'Juan Perez', 'EMAIL': 'juan@ejemplo.com', 'CELULAR': '12345678', 'DNI': '12345678', 'DIRECCIÓN': 'Calle Falsa 123', 'EDAD': 25, 'FECHA NAC': '1999-01-01' },
      { 'NOMBRE Y APELLIDO': 'Maria Garcia', 'EMAIL': 'maria@ejemplo.com', 'CELULAR': '87654321', 'DNI': '87654321', 'DIRECCIÓN': 'Avenida Siempre Viva 742', 'EDAD': 30, 'FECHA NAC': '1994-05-15' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
    XLSX.writeFile(wb, "Plantilla_Importacion_Sahara.xlsx");
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        disabled={!academyId}
        className="gap-2 px-6 h-12 lg:h-14 rounded-2xl lg:rounded-3xl font-bold transition-all bg-[#D4AF37] hover:bg-[#B8860B] text-white shadow-lg active:scale-95 border-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileSpreadsheet className="w-5 h-5" />
        <span className="text-xs uppercase tracking-widest">Importar Alumnos</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#2D241E]/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 relative overflow-hidden"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] mx-auto mb-4">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#2D241E]">Importar Alumnos</h3>
                <p className="text-[#847365] text-sm mt-2">Cargá tu lista de Excel en segundos.</p>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full h-20 border-2 border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 text-[#2D241E] rounded-3xl flex flex-col gap-1 transition-all group"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#D4AF37] group-hover:-translate-y-1 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">Seleccionar Archivo</span>
                    </>
                  )}
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />

                <Button 
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full h-12 rounded-2xl border-[#847365]/10 text-[#847365] text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Bajar Plantilla
                </Button>
              </div>

              <AnimatePresence>
                {status && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-6 p-4 rounded-2xl flex items-center gap-3 border ${
                      status.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                    }`}
                  >
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="text-xs font-bold">{status.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
