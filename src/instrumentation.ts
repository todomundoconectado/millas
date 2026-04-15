export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      console.error('[STARTUP CRASH] uncaughtException:', err)
    })
    process.on('unhandledRejection', (reason) => {
      console.error('[STARTUP CRASH] unhandledRejection:', reason)
    })

    // Test DB connection on startup and log the result
    try {
      const { db } = await import('@/lib/db')
      const { sql } = await import('drizzle-orm')
      const result = await db.execute(sql`SELECT 1 AS ok`)
      console.log('[STARTUP] DB connection OK:', JSON.stringify(result))
    } catch (err) {
      console.error('[STARTUP] DB connection FAILED:', err)
    }
  }
}
