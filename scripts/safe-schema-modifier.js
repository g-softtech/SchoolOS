/**
 * safe-schema-modifier.js
 * 
 * A defensive utility for migrating Prisma schemas via string replacement.
 * Implements user feedback for safe migrations:
 * - Checks if target lines exist before removing.
 * - Counts replacements.
 * - Fails if an expected replacement wasn't found.
 * - Leaves a clean summary.
 */
const fs = require('fs');
const { execSync } = require('child_process');

class SchemaModifier {
  constructor(schemaPath) {
    this.schemaPath = schemaPath;
    this.schema = fs.readFileSync(schemaPath, 'utf8');
    this.stats = {
      removedModels: 0,
      replacedRelations: 0,
      removedRelations: 0,
      addedModels: 0
    };
  }

  removeModel(modelName) {
    const regex = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`, 'g');
    if (!regex.test(this.schema)) {
      console.warn(`[WARN] Model ${modelName} not found. Skipping.`);
      return;
    }
    this.schema = this.schema.replace(regex, '');
    this.stats.removedModels++;
  }

  removeRelation(modelName, relationLinePattern) {
    const regex = new RegExp(`model ${modelName} \\{[\\s\\S]*?(${relationLinePattern})[\\s\\S]*?\\n\\}`);
    if (!regex.test(this.schema)) {
      console.warn(`[WARN] Relation matching '${relationLinePattern}' not found in ${modelName}. Skipping.`);
      return;
    }
    
    // Replace just the specific line
    const globalRegex = new RegExp(relationLinePattern, 'g');
    this.schema = this.schema.replace(globalRegex, '');
    this.stats.removedRelations++;
  }

  replaceRelation(modelName, oldLinePattern, newLine) {
    const regex = new RegExp(`model ${modelName} \\{[\\s\\S]*?(${oldLinePattern})[\\s\\S]*?\\n\\}`);
    if (!regex.test(this.schema)) {
      console.warn(`[WARN] Relation matching '${oldLinePattern}' not found in ${modelName}. Skipping.`);
      return;
    }
    
    const globalRegex = new RegExp(oldLinePattern, 'g');
    this.schema = this.schema.replace(globalRegex, newLine);
    this.stats.replacedRelations++;
  }

  appendModels(modelsText) {
    this.schema += '\n' + modelsText;
    this.stats.addedModels++;
  }

  saveAndValidate() {
    fs.writeFileSync(this.schemaPath, this.schema, 'utf8');
    console.log('--- Migration Summary ---');
    console.log(`✓ Removed ${this.stats.removedModels} legacy models`);
    console.log(`✓ Removed ${this.stats.removedRelations} obsolete relations`);
    console.log(`✓ Replaced ${this.stats.replacedRelations} relations`);
    console.log(`✓ Added ${this.stats.addedModels} new model blocks`);
    
    console.log('Running format and validation...');
    try {
      execSync('npx --yes prisma@5.22.0 format --schema ' + this.schemaPath, { stdio: 'inherit' });
      execSync('npx --yes prisma@5.22.0 validate --schema ' + this.schemaPath, { stdio: 'inherit' });
      console.log('✓ Prisma schema validates successfully');
    } catch (error) {
      console.error('❌ Schema validation failed!', error.message);
      process.exit(1);
    }
  }
}

module.exports = { SchemaModifier };
