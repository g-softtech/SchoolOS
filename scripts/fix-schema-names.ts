import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'packages', 'core-platform', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

schema = schema.replace(/AcademicAcademicTerm/g, 'AcademicTerm');
schema = schema.replace(/ClassLevelLevel/g, 'ClassLevel');

fs.writeFileSync(schemaPath, schema);
console.log('Fixed double names!');
