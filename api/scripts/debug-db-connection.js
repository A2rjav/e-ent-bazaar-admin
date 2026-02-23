/**
 * Run: node scripts/debug-db-connection.js
 * Requires: .env in api/ with DATABASE_URL set
 * Loads .env via dotenv if available; otherwise expects DATABASE_URL in environment.
 */
const path = require('path');
const fs = require('fs');

// Load .env manually if present (no dotenv dependency required)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([^#=]+?)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL in .env or environment.');
  process.exit(1);
}

// Hide password in logs
const safeUrl = url.replace(/:[^:@]+@/, ':****@');
console.log('DATABASE_URL (masked):', safeUrl);
console.log('Host in URL:', (url.match(/@([^:/]+)/) || [])[1] || 'could not parse');
console.log('Has ?sslmode=require:', url.includes('sslmode=require'));
console.log('');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['error'],
});

async function main() {
  try {
    await prisma.$connect();
    console.log('OK: Connected to database.');
    const r = await prisma.$queryRaw`SELECT 1 as n`;
    console.log('OK: Query test:', r);
  } catch (e) {
    console.error('Connection failed:');
    console.error('  Code:', e.code || e.constructor?.name);
    console.error('  Message:', e.message);
    if (e.meta) console.error('  Meta:', e.meta);
  } finally {
    await prisma.$disconnect();
  }
}

main();
