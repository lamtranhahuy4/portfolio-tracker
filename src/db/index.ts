import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL connection string is missing in environment variables (.env)');
}

// Khởi tạo kết nối Serverless PostgreSQL thông qua Neon
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
