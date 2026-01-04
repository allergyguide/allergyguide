import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error("Usage: npx tsx tools/hash_password.ts <password>");
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log(`
Password: ${password}`);
console.log(`Hash: ${hash}`);
console.log(`
Update your Netlify env var AUTH_USERS with this hash.`);
