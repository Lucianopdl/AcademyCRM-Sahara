const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      const key = parts[0]?.trim();
      const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      if (key && value) process.env[key] = value;
    });
  }
}

loadEnv();

const academy_id = '1dea3372-dd1e-4883-ae7b-6f3ff89d9c59';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function excelDateToJS(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

async function loadAllStudents() {
  const directoryPath = path.join(__dirname, 'exels');
  const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.xlsx'));
  
  const studentMap = new Map();

  for (const file of files) {
    console.log(`Leyendo archivo: ${file}...`);
    const workbook = XLSX.readFile(path.join(directoryPath, file));
    
    workbook.SheetNames.forEach(sheetName => {
      // Omitimos pestañas que no parezcan de datos de alumnos si es necesario, 
      // pero por ahora procesamos todas las que tengan estructura válida.
      if (sheetName === 'CUMPLEAÑOS') return; 

      console.log(`  - Procesando pestaña: ${sheetName}`);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      data.forEach(row => {
        const dniRaw = row['DNI']?.toString().replace(/\D/g, '').trim();
        const fullName = row['NOMBRE Y APELLIDO']?.toString().trim();
        
        if (!fullName || fullName.includes('ORDEN')) return;

        // Si hay DNI lo usamos de key, si no usamos el nombre en mayúsculas
        const key = dniRaw || `NAME_${fullName.toUpperCase()}`;

        if (!studentMap.has(key)) {
          studentMap.set(key, {
            full_name: fullName,
            dni: dniRaw || null,
            age: parseInt(row['EDAD']) || null,
            birth_date: excelDateToJS(row['FECHA NAC']),
            phone: row['CELULAR']?.toString().trim() || null,
            address: row['DIRECCIÓN']?.toString().trim() || null,
            academy_id: academy_id,
            status: 'active'
          });
        }
      });
    });
  }

  console.log(`\nEstudiantes únicos encontrados en todas las pestañas: ${studentMap.size}`);

  const { data: existing } = await supabase
    .from('students')
    .select('dni, full_name')
    .eq('academy_id', academy_id);

  const existingDnis = new Set(existing.filter(s => s.dni).map(s => s.dni));
  const existingNames = new Set(existing.map(s => s.full_name.toUpperCase()));

  const toInsert = Array.from(studentMap.values()).filter(s => {
    if (s.dni) {
      return !existingDnis.has(s.dni);
    } else {
      // Si no tiene DNI, verificamos que no exista un nombre igual ya cargado
      return !existingNames.has(s.full_name.toUpperCase());
    }
  });

  console.log(`Estudiantes nuevos por cargar: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      console.log(`Insertando lote ${Math.floor(i / batchSize) + 1}...`);
      const { error } = await supabase.from('students').insert(batch);
      if (error) console.error('Error:', error.message);
    }
  }

  console.log('--- CARGA COMPLETA ---');
}

loadAllStudents();
