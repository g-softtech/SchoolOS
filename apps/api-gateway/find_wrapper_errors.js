const fs = require('fs');
let text = fs.readFileSync('tsc_errors_utf8.log', 'utf8');
text = text.replace(/\x1B\[\d+m/g, '');
const lines = text.split('\n');

const errors = [];
let currentError = null;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/(src\/.*?):(\d+):(\d+) - error (TS\d+): (.*)$/);
  if (match) {
    if (currentError) errors.push(currentError);
    currentError = {
      file: match[1],
      line: parseInt(match[2]),
      col: parseInt(match[3]),
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

const targetErrors = errors.filter(e => {
  const msg = e.message;
  return (msg.includes('Object literal may only specify known properties') && msg.includes('does not exist in type')) ||
         msg.includes("Property 'data' is missing") ||
         (msg.includes('is not assignable to parameter of type') && (msg.includes('CreateArgs') || msg.includes('UpdateArgs')));
});

const grouped = {};
targetErrors.forEach(e => {
  if (!grouped[e.file]) grouped[e.file] = [];
  grouped[e.file].push(e.line);
});

console.log('Affected files for data wrappers:');
for (const [file, lines] of Object.entries(grouped)) {
  console.log(`- ${file}: lines ${lines.join(', ')}`);
}
