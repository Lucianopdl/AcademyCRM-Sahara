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
    
    let u = users?.users?.find(u => u.email === email);

    const actSupa = createClient(supaUrl, envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']?.trim());
    const { data: logData, error: logErr } = await actSupa.auth.signInWithPassword({
        email: email,
        password: 'TestPassword123!'
    });

    if (logErr) {
        console.error("Failed to login after reset: ", logErr);
        return;
    }

    const { data: students, error: sErr } = await actSupa.from('students').select('*');
    console.log("ALL STUDENTS ACCESSIBLE BY THIS USER:", students?.length, "error:", sErr);
    if (students && students.length > 0) {
        console.log("Sample:", students[0]);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
