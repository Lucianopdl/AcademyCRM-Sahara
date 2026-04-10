const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.substring(0, idx), line.substring(idx+1)];
    })
);

const supaUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']?.trim();
const supaKey = envVars['SUPABASE_SERVICE_ROLE_KEY']?.trim(); 

const supabase = createClient(supaUrl, supaKey);

async function run() {
  try {
    const email = 'pynandi.espacioartistico@gmail.com';
    const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
    let pynandiUser = users?.users?.find(u => u.email === email);
    
    if (!pynandiUser) {
        console.error("No pynandi user found!");
        return;
    }

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', pynandiUser.id).single();

    if (!profile?.academy_id) {
        console.error("No academy ID for user profile!");
        return;
    }

    console.log(`Actualizando estudiantes para pertenecer a user_id: ${pynandiUser.id} y academy_id: ${profile.academy_id}`);

    // Update all students to ensure they have the proper user_id so RLS passes
    const { count, error } = await supabase.from('students')
        .update({ user_id: pynandiUser.id })
        .eq('academy_id', profile.academy_id);

    if (error) {
        console.error("Error actualizando: ", error);
        return;
    }

    console.log(`Éxito. Estudiantes han sido asignados correctamente al user_id.`);

  } catch (e) {
    console.error(e);
  }
}

run();
