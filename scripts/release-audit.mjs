import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const path = name => resolve(root, name);
const read = name => readFileSync(path(name), 'utf8');
const required = [
  'package.json', 'app/page.tsx', 'app/operations.tsx', 'app/quote-document.tsx',
  'lib/supabase.ts', 'supabase/schema.sql', 'supabase/phase2.sql',
  'supabase/phase5_quotation_uniqueness.sql', '.github/workflows/validate.yml',
  '.env.example', '.gitignore', 'README.md',
];
for (const file of required) assert(existsSync(path(file)), `Missing release file: ${file}`);
const gitignore = read('.gitignore');
for (const pattern of ['node_modules', '.next', '.env.local', '.env']) assert(gitignore.split(/\r?\n/).includes(pattern), `Missing .gitignore safety pattern ${pattern}`);
const workflow = read('.github/workflows/validate.yml');
for (const step of ['check:migrations', 'test:security', 'typecheck', 'build', 'release:audit']) assert(workflow.includes(step), `CI missing ${step}`);
const scripts = JSON.parse(read('package.json')).scripts;
for (const name of ['check:migrations','test:security','typecheck','build','release:audit']) assert(scripts[name], `Missing npm script: ${name}`);
const migrations = ['schema.sql', 'phase2.sql', 'phase5_quotation_uniqueness.sql'];
for (const name of migrations) assert(!/\b(drop\s+(table|database|schema)|truncate)\b/i.test(read(`supabase/${name}`)), `Destructive SQL in ${name}`);
const env = read('.env.example');
assert(!/SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/m.test(env), 'Never ship service-role key in frontend env template');
assert(!/SMTP_PASSWORD\s*=\s*\S+/m.test(env), 'Never ship SMTP credentials in frontend template');
const index = read('supabase/phase5_quotation_uniqueness.sql');
assert(/create\s+unique\s+index/i.test(index), 'Active quotation uniqueness index missing');
const files = required.map(name => ({path: name, sha256: createHash('sha256').update(readFileSync(path(name))).digest('hex')}));
console.log(JSON.stringify({result:'PASS',files_verified:files.length,migrations_in_order:migrations,source_sha256:files},null,2));
