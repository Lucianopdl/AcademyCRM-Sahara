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
    console.log("User ID:", pynandiUser?.id);

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', pynandiUser.id).single();
    console.log("Profile:", profile);

    const { data: academy } = await supabase.from('academies').select('*').eq('id', profile?.academy_id).single();
    console.log("Academy:", academy);

    const { data: students, count } = await supabase.from('students').select('*', { count: 'exact' }).eq('academy_id', profile?.academy_id);
    console.log("Students count:", count);
    if (students && students.length > 0) {
        console.log("First student sample:", students[0]);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
