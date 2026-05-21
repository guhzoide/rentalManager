import fs from 'fs';
import path from 'path';

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      content = content.replace(/(from\s+['"])(\.\/[^'"]+|\.\.\/[^'"]+)(['"])/g, (match, p1, p2, p3) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.ts')) {
          return `${p1}${p2}.js${p3}`;
        }
        return match;
      });
      
      content = content.replace(/(import\s*\(\s*['"])(\.\/[^'"]+|\.\.\/[^'"]+)(['"])/g, (match, p1, p2, p3) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.ts')) {
          return `${p1}${p2}.js${p3}`;
        }
        return match;
      });
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

fixImports('./src/server');
