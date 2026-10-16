import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const forbidden = [/^\.env$/i, /^\.env\.(?!example$)/i, /(^|\/)\.next\//, /(^|\/)node_modules\//, /(^|\/)\.git\//, /(^|\/)[^/]+\.(?:sqlite|sqlite3|db)$/i, /(^|\/)service[_-]?role[_-]?key/i];
const scanned = [];
const issues = [];
const skipDirs = new Set(['node_modules', '.next', '.git']);
function walk(folder, rel = '') {
  for (const item of fs.readdirSync(folder, {withFileTypes:true})) {
    const next = rel ? `${rel}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (skipDirs.has(item.name)) continue;
      walk(path.join(folder,item.name),next);
    } else if (item.isFile()) {
      if (forbidden.some(re => re.test(next))) { issues.push(`Forbidden file: ${next}`); continue; }
      if (!/\.(?:ts|tsx|js|mjs|json|yml|yaml|md|sql|example)$/.test(item.name)) continue;
      const data = fs.readFileSync(path.join(folder,item.name),'utf8');
      scanned.push(next);
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data)) issues.push(`Private key detected: ${next}`);
      if (/\b(?:SUPABASE_SERVICE_ROLE_KEY|POSTGRES_PASSWORD|SMTP_PASSWORD)\s*[:=]\s*['\"]?[A-Za-z0-9+/=_\-]{20,}/.test(data)) issues.push(`Possible hardcoded secret: ${next}`);
    }
  }
}
walk(root);
const result = {status:issues.length?'FAIL':'PASS', files_scanned:scanned.length, issues};
console.log(JSON.stringify(result,null,2));
if (issues.length) process.exitCode=1;
