import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

// Tải biến môi trường từ .env.local hoặc .env
config({ path: '.env.local' });
config(); // fallback to .env if .env.local doesn't exist

async function runMigrations() {
  console.log('⏳ Running database migrations...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('❌ DATABASE_URL environment variable is not set. Please check your .env.local file.');
  }

  try {
    const sql = neon(dbUrl);
    const db = drizzle(sql);
    
    // Thư mục chứa các file SQL do Drizzle sinh ra
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
