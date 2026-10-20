import fs from 'fs';
import path from 'path';

function getFiles(dir, exts = ['.tsx', '.ts', '.jsx', '.js']) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        res = res.concat(getFiles(full, exts));
      }
    } else if (exts.includes(path.extname(full))) {
      res.push(full);
    }
  }
  return res;
}

const files = getFiles('components').concat(getFiles('app'));
const links = [];
const deadHrefs = [];
const buttonsWithoutClick = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const cleanPath = file.replace(/\\/g, '/');

  // Find hrefs
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const target = match[1];
    links.push({ file: cleanPath, href: target });
    if (target === '#' || target === '' || target === 'javascript:void(0)') {
      deadHrefs.push({ file: cleanPath, href: target, line: content.slice(0, match.index).split('\n').length });
    }
  }
}

console.log('=== AUDIT REPORT: LINKS & BUTTONS ===');
console.log('Total links evaluated:', links.length);
console.log('Dead / Empty hrefs (#):', deadHrefs.length);
if (deadHrefs.length > 0) {
  console.log('DEAD HREF LIST:');
  deadHrefs.forEach(d => console.log(`  - ${d.file}:${d.line} -> "${d.href}"`));
}

// Check destinations
const uniqueTargets = Array.from(new Set(links.map(l => l.href)));
console.log('\nUnique href destinations:');
uniqueTargets.sort().forEach(t => console.log('  -', t));
