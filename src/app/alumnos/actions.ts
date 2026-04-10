"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function cleanupAcademyDataAction(academyId: string) {
  try {
    // Borrar alumnos (esto debería borrar pagos y asistencias en cascada si está configurado)
    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('academy_id', academyId);

    if (error) throw error;

    revalidatePath('/alumnos');
    return { success: true, message: "Todos los alumnos han sido eliminados." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function importStudentsAction(academyId: string, students: any[]) {
  // Helper para convertir fechas de Excel (números seriales) o strings a formato ISO YYYY-MM-DD
  const formatExcelDate = (value: any) => {
    if (value === undefined || value === null || value === "") return null;
    
    try {
      const str = value.toString().trim();
      
      // Caso 1: Número de serie de Excel (ej: 43411)
      if (!isNaN(value) && str.length >= 5 && !str.includes('-') && !str.includes('/')) {
        const serial = Number(value);
        const date = new Date((serial - 25569) * 86400 * 1000);
        return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
      }
      
      // Caso 2: Strings con separadores (/, -)
      const parts = str.split(/[\/\-]/);
      if (parts.length === 3) {
        let [p1, p2, p3] = parts;
        if (p1.length === 4) {
          const d = new Date(`${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`);
          return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
        }
        let day = p1;
        let month = p2;
        let year = p3;
        if (year.length === 2) year = (parseInt(year) > 50 ? "19" : "20") + year;
        if (parseInt(month) > 12 && parseInt(day) <= 12) [day, month] = [month, day];
        const finalDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(finalDate.getTime()) && parseInt(month) <= 12 && parseInt(day) <= 31) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    } catch (e) {
      console.error("Error parsing date:", value, e);
    }
    return null;
  };

  if (!academyId || academyId.trim() === "") {
    return { success: false, message: "ID de academia no válido." };
  }

  try {
    const formattedStudents = students.map(s => {
      const normalized: any = {};
      Object.keys(s).forEach(key => {
        normalized[key.toLowerCase().trim()] = s[key];
      });

      return {
        academy_id: academyId,
        full_name: normalized["nombre y apellido"] || normalized["nombre"] || normalized["full_name"] || "Sin nombre",
        email: normalized["email"] || normalized["correo"] || null,
        phone: normalized["celular"] || normalized["telefono"] || normalized["phone"] || null,
        dni: normalized["dni"] || normalized["documento"] || null,
        address: normalized["dirección"] || normalized["direccion"] || normalized["address"] || null,
        age: normalized["edad"] ? parseInt(normalized["edad"]) : null,
        birth_date: formatExcelDate(normalized["fecha nac"] || normalized["fecha de nacimiento"]) || null,
        status: 'active',
        enrollment_date: new Date().toISOString()
      };
    });

    // Inserción por lotes (Chunks de 50)
    const CHUNK_SIZE = 50;
    let importedCount = 0;
    let errors = [];

    for (let i = 0; i < formattedStudents.length; i += CHUNK_SIZE) {
      const chunk = formattedStudents.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin
        .from('students')
        .insert(chunk);

      if (error) {
        console.error(`Error en lote ${i / CHUNK_SIZE + 1}:`, error);
        errors.push(`Lote ${i / CHUNK_SIZE + 1}: ${error.message}`);
        // Si hay error en un lote, seguimos con el siguiente pero guardamos el error
      } else {
        importedCount += chunk.length;
      }
    }

    revalidatePath('/alumnos');

    if (errors.length > 0) {
      return { 
        success: importedCount > 0, 
        message: `Se importaron ${importedCount} alumnos. Algunos fallaron: ${errors[0]}` 
      };
    }

    return { success: true, message: `${importedCount} alumnos importados con éxito.` };
  } catch (error: any) {
    console.error("Error crítico en importación:", error);
    return { success: false, message: "Error inesperado: " + error.message };
  }
}


export async function bulkDeleteStudentsAction(studentIds: string[], academyId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('academy_id', academyId)
      .in('id', studentIds);

    if (error) throw error;

    revalidatePath('/alumnos');
    return { success: true, message: `${studentIds.length} alumnos eliminados correctamente.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function bulkUpdateStatusAction(studentIds: string[], status: 'active' | 'archived', academyId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('students')
      .update({ status })
      .eq('academy_id', academyId)
      .in('id', studentIds);

    if (error) throw error;

    revalidatePath('/alumnos');
    return { success: true, message: `${studentIds.length} alumnos ${status === 'archived' ? 'archivados' : 'activados'} correctamente.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
