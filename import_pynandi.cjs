const fs = require('fs');
const xlsx = require('xlsx');
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
    console.log(`Buscando usuario ${email}...`);
    const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) throw uErr;
    
    let pynandiUser = users.users.find(u => u.email === email);
    
    if (!pynandiUser) {
        console.log(`Usuario no encontrado. Creando usuario ${email}...`);
        const { data: newUser, error: newErr } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true
        });
        if (newErr) throw newErr;
        pynandiUser = newUser.user;
    }

    // Try to find the academy profile
    let { data: profile } = await supabase.from('user_profiles').select('academy_id').eq('id', pynandiUser.id).maybeSingle();
    let targetAcademyId = profile?.academy_id;

    if (!targetAcademyId) {
        console.log("No tiene academia asignada. Creando Academia Pynandi...");
        const { data: newAc, error: acErr } = await supabase.from('academies').insert({
            name: "Pynandi Espacio Artístico",
            status: 'active'
        }).select();
        if (acErr) throw acErr;
        targetAcademyId = newAc[0].id;

        console.log("Creando perfil de usuario asociado a la nueva academia...");
        
        // Link it in user_profiles
        if (profile) {
            await supabase.from('user_profiles').update({ academy_id: targetAcademyId, role: 'admin' }).eq('id', pynandiUser.id);
        } else {
            await supabase.from('user_profiles').insert({ id: pynandiUser.id, role: 'admin', academy_id: targetAcademyId });
        }
    }

    console.log("Academy ID: ", targetAcademyId);

    // Read Excel
    const workbook = xlsx.readFile('./ALUMNADO PYNANDI 2026.xlsx', { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const inserts = data.map(row => {
      let bdate = null;
      if (row['FECHA NAC']) {
          if (row['FECHA NAC'] instanceof Date) {
              bdate = row['FECHA NAC'].toISOString().split('T')[0];
          } else {
              try { bdate = new Date(row['FECHA NAC']).toISOString().split('T')[0]; } catch(e){}
          }
      }

      return {
        full_name: row['NOMBRE Y APELLIDO'] ? String(row['NOMBRE Y APELLIDO']).trim() : 'Sin Nombre',
        phone: row['CELULAR'] ? String(row['CELULAR']) : null,
        birth_date: bdate,
        document_number: row['DNI'] ? String(row['DNI']) : null,
        address: row['DIRECCIÓN'] ? String(row['DIRECCIÓN']) : null,
        academy_id: targetAcademyId,
        status: 'active'
      };
    }).filter(row => row.full_name !== 'Sin Nombre' && row.full_name !== 'undefined');

    const { data: result, error: insErr } = await supabase.from('students').insert(inserts).select();
    
    if (insErr) {
        console.error("Fallo al insertar con esquema completo: ", insErr.message);
        console.log("Reintentando sin campos document_number o address...");
        const cleanInserts = inserts.map(i => ({
            full_name: i.full_name,
            phone: i.phone,
            birth_date: i.birth_date,
            academy_id: i.academy_id,
            status: i.status
        }));
        const { data: r2, error: err2 } = await supabase.from('students').insert(cleanInserts).select();
        if (err2) throw err2;
        console.log(`✅ ¡Éxito! Insertados ${r2.length} alumnos en modo fallback.`);
        return;
    }

    console.log(`✅ ¡Éxito! Insertados ${result.length} alumnos para Pynandi Espacio Artístico.`);
  } catch (e) {
    console.error("❌ ERROR: ", e);
  }
}

run();
