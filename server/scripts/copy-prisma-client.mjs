import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('src/generated/prisma');
const destination = resolve('dist/src/generated/prisma');
if (!existsSync(source)) throw new Error('Generated Prisma client is missing. Run npm run db:generate -w server first.');
mkdirSync(destination, { recursive: true });
for (const folder of [source, destination]) {
  for (const name of readdirSync(folder)) {
    const file = resolve(folder, name);
    if (/\.tmp\d+$/.test(name) && statSync(file).isFile()) unlinkSync(file);
  }
}
cpSync(source, destination, { recursive: true, force: true });
const generatedEntry = resolve(destination, 'index.js');
const contents = readFileSync(generatedEntry, 'utf8');
const sourceRelativePath = '"relativePath": "../../../prisma"';
if (!contents.includes(sourceRelativePath)) throw new Error('Prisma generated schema path changed; review the production asset copy before building.');
writeFileSync(generatedEntry, contents.replace(sourceRelativePath, '"relativePath": "../../../../prisma"'));
