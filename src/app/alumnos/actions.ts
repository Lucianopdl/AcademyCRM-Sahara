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
        
        // Si el primer componente tiene 4 dígitos, asumimos YYYY-MM-DD
        if (p1.length === 4) {
          const d = new Date(`${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`);
          return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
        }

        // De lo contrario, asumimos formato humano (DD-MM-YYYY o MM-DD-YYYY)
        let day = p1;
        let month = p2;
        let year = p3;

        // Limpiar año de 2 dígitos
        if (year.length === 2) {
          year = (parseInt(year) > 50 ? "19" : "20") + year;
        }

        // Si el mes es > 12, probablemente estén invertidos (formato MM/DD/YYYY)
        if (parseInt(month) > 12 && parseInt(day) <= 12) {
          [day, month] = [month, day];
        }

        // Validar y retornar
        const finalDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(finalDate.getTime()) && parseInt(month) <= 12 && parseInt(day) <= 31) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    } catch (e) {
      console.error("Error parsing date:", value, e);
    }

    return null; // Si no es una fecha válida, preferimos null que romper la importación
  };

  try {
    const formattedStudents = students.map(s => {
      // Normalizar claves a minúsculas y quitar espacios para facilitar mapeo
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
        birthdate: formatExcelDate(normalized["fecha nac"] || normalized["fecha de nacimiento"]) || null,
        status: 'active',
        enrollment_date: new Date().toISOString()
      };
    });

    const { error } = await supabaseAdmin
      .from('students')
      .insert(formattedStudents);

    if (error) throw error;

    revalidatePath('/alumnos');
    return { success: true, message: `${formattedStudents.length} alumnos importados con éxito.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function bulkDeleteStudentsAction(studentIds: string[]) {
  try {
    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .in('id', studentIds);

    if (error) throw error;

    revalidatePath('/alumnos');
    return { success: true, message: `${studentIds.length} alumnos eliminados correctamente.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function bulkUpdateStatusAction(studentIds: string[], status: 'active' | 'archived') {
  try {
    const { error } = await supabaseAdmin
      .from('students')
      .update({ status })
      .in('id', studentIds);

    if (error) throw error;

    revalidatePath('/alumnos');
    return { success: true, message: `${studentIds.length} alumnos ${status === 'archived' ? 'archivados' : 'activados'} correctamente.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
