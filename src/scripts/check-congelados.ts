import * as dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config({ path: '.env.local' })

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
})

async function q(label: string, sql: string) {
  console.log(`\n=== ${label} ===`)
  const [rows] = await pool.execute(sql) as any
  console.table(rows)
}

async function main() {
  await q('TODAS AS CATEGORIAS ATIVAS COM CONTAGEM DE PRODUTOS',
    `SELECT c.nome, c.slug, COUNT(p.id) as produtos
     FROM categories c LEFT JOIN products p ON p.categoria_id = c.id AND p.ativo = 1
     WHERE c.ativo = 1 GROUP BY c.id ORDER BY c.ordem`)

  await q('CATEGORIAS WOO DESATIVADAS COM PALAVRAS DE CONGELADOS',
    `SELECT id, nome, slug FROM categories
     WHERE ativo = 0 AND (nome LIKE '%congelad%' OR nome LIKE '%sorvete%' OR nome LIKE '%gelado%' OR nome LIKE '%frozen%' OR nome LIKE '%pizza%')`)

  await q('PRODUTOS COM NOMES DE CONGELADOS (qualquer categoria)',
    `SELECT p.nome, c.nome as categoria
     FROM products p LEFT JOIN categories c ON p.categoria_id = c.id
     WHERE p.ativo = 1 AND (p.nome LIKE '%congelad%' OR p.nome LIKE '%sorvete%' OR p.nome LIKE '%pizza%' OR p.nome LIKE '%gelado%')
     LIMIT 25`)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
