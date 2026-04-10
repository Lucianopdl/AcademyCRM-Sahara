const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('./ALUMNADO PYNANDI 2026.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  console.log('Headers / sample data:');
  console.log(data[0]);
  console.log('Total rows: ', data.length);
} catch (e) {
  console.error(e);
}
