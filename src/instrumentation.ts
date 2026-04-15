export async function register() {
  // Roda apenas no servidor Node.js (não em Edge)
  if (process.env.NEXT_RUNTIME === 'edge') return

  console.log('[BOOT] Instrumentation register() chamado. NEXT_RUNTIME =', process.env.NEXT_RUNTIME)

  const mysql = await import('mysql2/promise')

  const baseConfig = {
    port: parseInt(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 5000,
  }

  // Tenta cada host em sequência até um funcionar
  const hosts = [
    process.env.DB_HOST,
    'localhost',
    '127.0.0.1',
  ].filter(Boolean) as string[]

  let connected = false
  for (const host of hosts) {
    try {
      const conn = await mysql.createConnection({ ...baseConfig, host })
      await conn.query('SELECT 1')
      await conn.end()
      console.log(`[DB] Conectado via host="${host}" ✓`)
      connected = true
      break
    } catch (err: unknown) {
      const e = err as { code?: string; errno?: number; message?: string }
      console.error(`[DB] host="${host}" falhou → code=${e.code} errno=${e.errno} msg=${e.message}`)
    }
  }

  // Tenta via socket Unix
  if (!connected) {
    const sockets = ['/var/run/mysqld/mysqld.sock', '/tmp/mysql.sock']
    for (const socketPath of sockets) {
      try {
        const conn = await mysql.createConnection({ ...baseConfig, socketPath })
        await conn.query('SELECT 1')
        await conn.end()
        console.log(`[DB] Conectado via socket="${socketPath}" ✓`)
        connected = true
        break
      } catch (err: unknown) {
        const e = err as { code?: string; errno?: number; message?: string }
        console.error(`[DB] socket="${socketPath}" falhou → ${e.code} ${e.message}`)
      }
    }
  }

  if (!connected) {
    console.error('[DB] NENHUM método de conexão funcionou.')
  }
}
