import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

// Na Hostinger, DB_HOST=localhost usa socket Unix (/tmp/mysql.sock).
// Conectar via TCP resolve como ::1 e é negado pelo grant do MySQL.
const isLocalhost = !process.env.DB_HOST || process.env.DB_HOST === 'localhost'

const pool = mysql.createPool({
  ...(isLocalhost
    ? { socketPath: '/tmp/mysql.sock' }
    : { host: process.env.DB_HOST!, port: parseInt(process.env.DB_PORT ?? '3306') }),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
})

export const db = drizzle(pool, { schema, mode: 'default' })
