const fs = require('fs');
// read file using utf16le since pnpm exec tsc > writes in utf16le in windows powershell
const log = fs.readFileSync('tsc_errors.log', 'utf8');
const lines = log.split('\n');

let missingDataWrapperCount = 0;
let totalErrors = 0;
const errors = [];
let currentError = null;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/(src\/.*?):(\d+):(\d+) - error (TS\d+): (.*)$/);
  if (match) {
    if (currentError) errors.push(currentError);
    currentError = {
      file: match[1],
      message: match[5].trim(),
      details: ''
    };
  } else if (currentError && lines[i].trim() !== '') {
    if (currentError.details.length < 500) {
      currentError.details += lines[i].trim() + '\n';
    }
  }
}
if (currentError) errors.push(currentError);

errors.forEach(e => {
  const msg = e.message;
  if (msg.includes("Object literal may only specify known properties") && msg.includes("does not exist in type")) {
    missingDataWrapperCount++;
  } else if (msg.includes("Property 'data' is missing")) {
    missingDataWrapperCount++;
  } else if (msg.includes("is not assignable to parameter of type") && (msg.includes("CreateArgs") || msg.includes("UpdateArgs"))) {
    missingDataWrapperCount++;
  }
});

console.log('Total Errors:', errors.length);
console.log('Missing data wrapper errors:', missingDataWrapperCount);
