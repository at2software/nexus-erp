const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'app', 'customers', '_shards', 'db.plz.ts');
const targetPath = path.join(root, 'src', 'assets', 'db', 'plz.json');

const source = fs.readFileSync(sourcePath, 'utf8');
const match = source.match(/export const DB_PLZ\s*=\s*(\[[\s\S]*\]);\s*$/);

if (!match) {
    throw new Error('Could not locate DB_PLZ array in db.plz.ts');
}

const data = vm.runInNewContext(match[1], Object.create(null));

if (!Array.isArray(data)) {
    throw new Error('Parsed DB_PLZ data is not an array');
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, JSON.stringify(data));

console.log(`Wrote ${data.length} postal-code entries to ${targetPath}`);
