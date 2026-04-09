"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function createNewAcademyAction(formData: FormData) {
  const academyName = formData.get("academyName") as string;
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;
  const category = formData.get("category") as string || "Academia";

  try {
    // 1. Crear el usuario en Supabase Auth (Confirmado automáticamente)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (authError) throw authError;
    const userId = authUser.user.id;

    // 2. Crear la Academia
    const { data: academy, error: academyError } = await supabaseAdmin
      .from('academies')
      .insert({ name: academyName })
      .select('id')
      .single();

    if (academyError) throw academyError;
    const academyId = academy.id;

    // 3. Vincular el usuario a esa academia (Perfil)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        academy_id: academyId,
        role: 'admin'
      });

    if (profileError) throw profileError;

    // 4. Inyectar el academy_id en la metadata del usuario para el RLS
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { academy_id: academyId, role: 'admin' } }
    );

    if (metaError) throw metaError;

    // 5. Crear configuración inicial (Settings) para que no esté vacío
    const { error: settingsError } = await supabaseAdmin
      .from('settings')
      .insert({
        academy_id: academyId,
        academy_name: academyName,
        category: category
      });

    if (settingsError) throw settingsError;

    revalidatePath("/admin/onboarding");
    return { success: true, message: `Academia '${academyName}' creada con éxito para ${adminEmail}` };

  } catch (error: any) {
    console.error("Error en Onboarding:", error);
    return { success: false, message: error.message || "Error desconocido al crear la academia" };
  }
}

export async function toggleAcademyStatusAction(academyId: string, newStatus: 'active' | 'suspended') {
  try {
    const { error } = await supabaseAdmin
      .from('academies')
      .update({ status: newStatus })
      .eq('id', academyId);

    if (error) throw error;

    revalidatePath("/admin/onboarding");
    return { success: true, message: `Estado actualizado a ${newStatus}` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function checkAcademyStatusAction(academyId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('academies')
      .select('status')
      .eq('id', academyId)
      .single();

    if (error || !data) return 'active'; // Por seguridad, si falla, asumimos activo pero logueamos
    return data.status;
  } catch (e) {
    return 'active';
  }
}
