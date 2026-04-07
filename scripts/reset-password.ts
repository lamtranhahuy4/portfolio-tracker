#!/usr/bin/env npx tsx

import { randomBytes, scryptSync } from 'crypto';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const args = process.argv.slice(2);
  
  let email: string | undefined;
  let password: string | undefined;
  let listUsers = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    } else if (args[i] === '--list') {
      listUsers = true;
    } else if (args[i] === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Run: DATABASE_URL="postgresql://..." npx tsx scripts/reset-password.ts --email user@example.com --password NewPass123');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  if (listUsers) {
    console.log('\n📋 All Users in Database:\n');
    const allUsers = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      createdAt: schema.users.createdAt,
    }).from(schema.users);
    
    allUsers.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Created: ${user.createdAt}`);
      console.log('');
    });
    process.exit(0);
  }

  if (!email) {
    console.error('❌ Email is required');
    console.log('\nUsage:');
    printHelp();
    process.exit(1);
  }

  if (!password) {
    console.error('❌ Password is required');
    console.log('\nUsage:');
    printHelp();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  console.log(`\n🔍 Looking for user: ${normalizedEmail}`);

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    console.error(`❌ User not found: ${normalizedEmail}`);
    console.log('\n📋 Available users:');
    console.log('   Run: npx tsx scripts/reset-password.ts --list');
    process.exit(1);
  }

  console.log(`✅ User found: ${user.email}`);
  console.log(`   ID: ${user.id}`);

  const passwordHash = hashPassword(password);

  await db.update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, user.id));

  await db.delete(schema.sessions)
    .where(eq(schema.sessions.userId, user.id));

  console.log('\n✅ Password reset successfully!\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Account:', user.email);
  console.log('  New Password:', '•'.repeat(password.length), `( ${password.length} chars )`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n💡 All existing sessions have been invalidated.');
  console.log('   User will need to login with the new password.\n');

  process.exit(0);
}

function printHelp() {
  console.log(`
📖 Password Reset CLI Script

USAGE:
  npx tsx scripts/reset-password.ts [OPTIONS]

OPTIONS:
  --email <email>      Email of the user to reset
  --password <pass>    New password (min 8 characters)
  --list               List all users in database
  --help               Show this help message

EXAMPLES:
  # Reset password for a user
  DATABASE_URL="postgresql://..." npx tsx scripts/reset-password.ts --email huy@lam.com --password NewPass123

  # List all users
  DATABASE_URL="postgresql://..." npx tsx scripts/reset-password.ts --list

ENVIRONMENT:
  DATABASE_URL    PostgreSQL connection string (required)
`);
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
