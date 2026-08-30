import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const distDir = path.resolve(process.cwd(), 'node_modules/es-toolkit/dist');

if (fs.existsSync(distDir)) {
  console.log("Starting recursive patch of es-toolkit/dist...");
  let patchCount = 0;
  walkDir(distDir, (filePath) => {
    if (filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      const regex = /\brequire_([a-zA-Z0-9_$]+)\b/g;
      
      let hasMatch = false;
      let newContent = content.replace(regex, (match, p1) => {
        if (p1.endsWith('_imported')) {
          return match;
        }
        hasMatch = true;
        return `require_${p1}_imported`;
      });
      
      if (hasMatch) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        patchCount++;
      }
    }
  });
  console.log(`Successfully patched ${patchCount} files in es-toolkit/dist.`);
} else {
  console.error("es-toolkit/dist directory not found!");
}
