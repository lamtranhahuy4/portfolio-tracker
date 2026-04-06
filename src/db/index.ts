import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import Decimal from 'decimal.js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL connection string is missing in environment variables (.env)');
}

// Khởi tạo kết nối Serverless PostgreSQL thông qua Neon
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

/**
 * Database Serialization Helpers for Decimal Values
 * 
 * The database schema uses numeric(18,4) columns for all financial values.
 * These are stored as strings in PostgreSQL to preserve precision.
 * 
 * Use these helpers when converting between:
 * - Number/Decimal values in code
 * - String values in the database
 */

/**
 * Convert a number or Decimal to string for database storage.
 * Preserves precision by avoiding JavaScript number conversion.
 */
export function toDbDecimal(value: number | Decimal | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0';
  }
  if (typeof value === 'string') {
    return value;
  }
  // Check constructor name since instanceof may not work across module boundaries
  if ((value as Decimal).constructor?.name === 'Decimal' || Decimal.isDecimal(value)) {
    return (value as Decimal).toString();
  }
  // Handle number - convert to string without floating point issues
  return new Decimal(value).toString();
}

/**
 * Convert a database string value to Decimal.
 * Use this when reading from the database.
 */
export function fromDbDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined) {
    return new Decimal(0);
  }
  if (Decimal.isDecimal(value)) {
    return value as Decimal;
  }
  return new Decimal(value);
}
