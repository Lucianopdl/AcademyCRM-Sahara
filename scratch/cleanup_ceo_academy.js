
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('academy_id, email')
    .eq('email', 'lucianopdl2401@gmail.com')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('CEO Academy ID:', data.academy_id);
  
  // Now delete students
  const { error: delError } = await supabase
    .from('alumnos')
    .delete()
    .eq('academy_id', data.academy_id);

  if (delError) {
    console.error('Delete error:', delError);
  } else {
    console.log('All students deleted for academy:', data.academy_id);
  }
}

run();
