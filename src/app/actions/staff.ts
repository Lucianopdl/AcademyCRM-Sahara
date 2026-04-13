"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function createStaffAction(
  academyId: string,
  email: string,
  password: string,
  name: string,
  role: 'teacher' | 'admin' = 'teacher'
) {
  try {
    // 1. Crear el usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        full_name: name,
        academy_id: academyId,
        role: role
      }
    });

    if (authError) throw authError;
    const userId = authUser.user.id;

    try {
      // 2. Crear el perfil del usuario
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          academy_id: academyId,
          role: role
        });

      if (profileError) throw profileError;

      revalidatePath("/config");
      return { success: true, message: `Usuario ${name} creado con éxito.` };

    } catch (dbError) {
      // SI FALLA LA DB, LIMPIAMOS AUTH PARA QUE NO QUEDE HUÉRFANO
      console.warn("Fallo en base de datos, limpiando usuario de Auth...");
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw dbError;
    }

  } catch (error: any) {
    console.error("Error al crear personal:", error);
    return { success: false, message: error.message || "Error al crear el usuario." };
  }
}

export async function getStaffAction(academyId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, created_at')
      .eq('academy_id', academyId);

    if (error) throw error;

    // Necesitamos obtener los datos de Auth para los emails/nombres
    // Pero como no podemos unir Auth con Public fácilmente en una query de Supabase Client sin RPC,
    // traeremos los nombres de la metadata si está disponible o haremos una consulta adicional selectiva.
    
    const staffWithDetails = await Promise.all(
      data.map(async (profile) => {
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        return {
          id: profile.id,
          role: profile.role,
          email: authData?.user?.email,
          name: authData?.user?.user_metadata?.full_name || "Sin nombre",
          created_at: profile.created_at
        };
      })
    );

    return { success: true, data: staffWithDetails };
  } catch (error: any) {
    console.error("Error al obtener personal:", error);
    return { success: false, message: error.message };
  }
}

export async function deleteStaffAction(userId: string) {
  try {
    // 1. Borrar de user_profiles (Base de datos)
    // No lanzamos error aquí para permitir que proceda el borrado de Auth incluso si el perfil no existe
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.warn("Aviso: El perfil de la DB no pudo ser borrado o no existía:", profileError.message);
    }

    // 2. Borrar de Auth (Supabase Auth)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      // Si el error es que el usuario ya no existe en Auth, lo consideramos éxito
      if (authError.message.toLowerCase().includes("user not found")) {
        console.log("El usuario ya no existía en Auth, procediendo como éxito.");
      } else {
        throw authError; // Otros errores sí los lanzamos
      }
    }

    revalidatePath("/config");
    return { success: true, message: "Usuario eliminado correctamente." };
  } catch (error: any) {
    console.error("Error en deleteStaffAction:", error);
    return { success: false, message: error.message || "Error al eliminar el usuario." };
  }
}
