const fs = require('fs');
let content = fs.readFileSync('packages/core-platform/prisma/schema.prisma', 'utf8');
content = content.replace(/model Timetable \{\s+id[\s\S]+?tt_timetables\"\)\s+\}/, '');
fs.writeFileSync('packages/core-platform/prisma/schema.prisma', content);
console.log('Removed duplicate Timetable');
