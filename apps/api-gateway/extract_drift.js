const fs = require('fs');
let text = fs.readFileSync('tsc_errors_utf8.log', 'utf8');
text = text.replace(/\x1B\[\d+m/g, '');
const lines = text.split('\n');

const missingProperties = new Set();
let objLiteralCount = 0;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/(src\/.*?)\\((\d+),(\d+)\\): error (TS\d+): (.*)$/);
  if (match) {
    const msg = match[5].trim();
    if (msg.includes('Object literal may only specify known properties')) {
       objLiteralCount++;
       let m = msg.match(/and '(\w+)' does not exist in type '(.*?)'/);
       if (m) {
         missingProperties.add(m[2] + ' missing ' + m[1]);
       } else {
         m = msg.match(/but '(\w+)' does not exist in type '(.*?)'/);
         if (m) missingProperties.add(m[2] + ' missing ' + m[1]);
         else missingProperties.add("UNPARSED: " + msg);
       }
    } else if (msg.includes('does not exist on type')) {
       let m = msg.match(/Property '(\w+)' does not exist on type '(.*?)'/);
       if (m) {
         missingProperties.add(m[2] + ' missing ' + m[1]);
       }
    }
  }
}

console.log('Total Object Literal Errors:', objLiteralCount);
console.log('Missing Properties:');
Array.from(missingProperties).forEach(x => console.log(' - ' + x));
