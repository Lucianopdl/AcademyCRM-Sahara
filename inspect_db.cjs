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
    // try to get 1 row from academies to see columns
    const { data: ac, error } = await supabase.from('academies').select('*').limit(1);
    console.log(error || ac);
    
    // try user_profiles
    const { data: up } = await supabase.from('user_profiles').select('*').limit(1);
    console.log(up);
}
run();
