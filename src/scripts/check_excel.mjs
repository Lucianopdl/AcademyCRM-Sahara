import XLSX from 'xlsx';
import fs from 'fs';

const filename = 'ALUMNADO PYNANDI 2026.xlsx';

async function checkHeaders() {
  const workbook = XLSX.readFile(filename);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  if (data.length > 0) {
    console.log("Headers detectados:", Object.keys(data[0]));
    console.log("Ejemplo de primera fila:", data[0]);
  } else {
    console.log("El Excel parece estar vacío.");
  }
}

checkHeaders();
