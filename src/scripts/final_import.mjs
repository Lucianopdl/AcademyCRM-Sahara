import XLSX from 'xlsx';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Cargar envs manually del archivo .env.local si no están cargadas
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('='))
);

const { 
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey 
} = env;

const supabase = createClient(supabaseUrl, supabaseKey);

const filename = 'ALUMNADO PYNANDI 2026.xlsx';

function excelDateToISO(serial) {
  if (typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

async function startImport() {
  console.log("Iniciando importación...");
  
  const workbook = XLSX.readFile(filename);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

  console.log(`Procesando ${data.length} filas...`);

  const studentsToInsert = data.map(row => {
    // Limpieza de teléfono (tomar solo el primero si hay varios con /)
    let phone = row['CELULAR'] ? String(row['CELULAR']).split('/')[0].trim() : null;
    
    return {
      full_name: row['NOMBRE Y APELLIDO']?.trim() || 'Sin Nombre',
      dni: row['DNI'] ? String(row['DNI']).trim() : null,
      birthdate: excelDateToISO(row['FECHA NAC']),
      phone: phone,
      address: row['DIRECCIÓN'] || null,
      status: 'active'
    };
  }).filter(s => s.full_name !== 'Sin Nombre');

  console.log(`Insertando ${studentsToInsert.length} alumnos en Supabase...`);

  const { data: inserted, error } = await supabase
    .from('students')
    .insert(studentsToInsert)
    .select();

  if (error) {
    console.error("Error al insertar:", error.message);
  } else {
    console.log(`✅ ¡Importación completa! Se cargaron ${inserted.length} alumnos.`);
  }
}

startImport();
