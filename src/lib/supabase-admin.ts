import { createClient } from '@supabase/supabase-js'

// Esta es la llave MAESTRA. Solo se usa en archivos que tengan "use server"
// Jamas debe ser importada en un componente de cliente.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
