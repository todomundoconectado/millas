import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

// Na Hostinger, 'localhost' resolve como ::1 (IPv6) e é negado pelo grant do MySQL.
// Usar '127.0.0.1' força IPv4 e funciona corretamente.
const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST ?? '127.0.0.1')

const pool = mysql.createPool({
  host,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
})

export const db = drizzle(pool, { schema, mode: 'default' })
