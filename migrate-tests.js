const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.spec.ts')) results.push(file);
        }
    });
    return results;
}

const files = walk('C:\\my_school_app\\saas-platform\\apps\\api-gateway\\test');

let count = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('Test.createTestingModule') && !content.includes('PrismaService')) {
        let modified = content;
        
        // Find index of Test.createTestingModule
        const testIndex = modified.indexOf('Test.createTestingModule');
        // Find the open brace after it
        const braceIndex = modified.indexOf('{', testIndex);
        
        // Now find the matching closing brace.
        let openBraces = 0;
        let closeIndex = -1;
        for (let i = braceIndex; i < modified.length; i++) {
            if (modified[i] === '{') openBraces++;
            if (modified[i] === '}') {
                openBraces--;
                if (openBraces === 0) {
                    closeIndex = i;
                    break;
                }
            }
        }
        
        if (closeIndex !== -1) {
            // Replace "Test.createTestingModule" with "createTestingModuleWithMocks"
            modified = modified.replace('Test.createTestingModule', 'createTestingModuleWithMocks');
            
            // Adjust the closeIndex because "Test.createTestingModule" (24 chars) was replaced by "createTestingModuleWithMocks" (28 chars)
            closeIndex += 4;
            
            // Insert ", PrismaService" after the closing brace
            modified = modified.slice(0, closeIndex + 1) + ', PrismaService' + modified.slice(closeIndex + 1);

            // Determine relative path to PrismaService
            const target = 'C:\\my_school_app\\saas-platform\\apps\\api-gateway\\src\\database\\prisma.service.ts';
            const fileDir = path.dirname(file);
            let relativePath = path.relative(fileDir, target).replace(/\\/g, '/').replace('.ts', '');
            if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

            modified = "import { PrismaService } from '" + relativePath + "';\n" + modified;
            modified = "import { createTestingModuleWithMocks } from '@saas/testing';\n" + modified;
            
            fs.writeFileSync(file, modified, 'utf8');
            count++;
        }
    }
}
console.log('Migrated ' + count + ' files in test/.');
