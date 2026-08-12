const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modified = 0;
walkDir('src', function(filePath) {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('@core/')) {
      content = content.replace(/['"]@core\/.*?['"]/g, "'@saas/core-platform'");
      fs.writeFileSync(filePath, content);
      modified++;
      console.log('Fixed imports in', filePath);
    }
  }
});
console.log('Modified ' + modified + ' files with @core/ imports.');
