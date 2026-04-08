
const fs = require('fs');
const content = fs.readFileSync('src/app/alumnos/page.tsx', 'utf8');
let open = 0;
let lines = content.split('\n');
lines.forEach((line, i) => {
    let matchesOpen = line.match(/\{/g);
    let matchesClose = line.match(/\}/g);
    open += (matchesOpen ? matchesOpen.length : 0);
    open -= (matchesClose ? matchesClose.length : 0);
    if (open < 0) console.log(`Extra closing brace at line ${i+1}`);
});
console.log(`Final balance: ${open}`);
