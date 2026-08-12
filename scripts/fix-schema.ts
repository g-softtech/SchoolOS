import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Fix 1: Campus duplication
schema = schema.replace('  Campus            Campus[]\n  Campus            Campus[]', '  Campus            Campus[]');

// Fix 2: Term and Class replacements in Assignment and LessonNote, etc.
// Let's find exactly what line 1025, 1172, 1237 is.
// Actually, I can just replace 'Term' with 'AcademicTerm' and 'Class' with 'ClassLevel' in the entire schema file for relations.
// Let's replace 'Term ' with 'AcademicTerm ' in definitions of relations.
schema = schema.replace(/term\s+Term/g, 'term AcademicTerm');
schema = schema.replace(/termId\s+String\n\s+term\s+Term/g, 'termId String\n  term AcademicTerm');
schema = schema.replace(/class\s+Class\s+@relation/g, 'class ClassLevel @relation');
schema = schema.replace(/classId\s+String\n\s+class\s+Class/g, 'classId String\n  class ClassLevel');

// Let's also check for Term[] and Class[]
schema = schema.replace(/Term\s*\[\]/g, 'AcademicTerm[]');
schema = schema.replace(/Class\s*\[\]/g, 'ClassLevel[]');

fs.writeFileSync(schemaPath, schema);
console.log('Schema fixed!');
