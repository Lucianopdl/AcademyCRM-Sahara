
import { supabaseAdmin } from './src/lib/supabase-admin';

async function findCEOAcademy() {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('academy_id, email')
    .eq('email', 'lucianopdl2401@gmail.com')
    .single();

  if (error) {
    console.error('Error finding CEO academy:', error);
    return;
  }

  console.log('CEO Academy ID:', data.academy_id);
}

findCEOAcademy();
