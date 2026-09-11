import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Tải biến môi trường từ .env.local hoặc .env
config({ path: '.env.local' });
config(); // fallback to .env if .env.local doesn't exist

async function runMigrations() {
  console.info('⏳ Running database migrations...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('❌ DATABASE_URL environment variable is not set. Please check your .env.local file.');
  }

  try {
    const isLocal = /localhost|127\.0\.0\.1/.test(dbUrl) && !/neon\.tech/.test(dbUrl);

    if (isLocal) {
      console.info('🔌 Detected local/CI database, using node-postgres driver...');
      const pool = new Pool({ connectionString: dbUrl });
      const db = drizzlePg(pool);
      await migratePg(db, { migrationsFolder: './drizzle' });
      await pool.end();
    } else {
      console.info('🔌 Detected Neon database, using neon-http driver...');
      const sql = neon(dbUrl);
      const db = drizzleNeon(sql);
      await migrateNeon(db, { migrationsFolder: './drizzle' });
    }
    
    console.info('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
