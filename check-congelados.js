// Check congelados category via Node.js (no TypeScript)
const mysql = require('/home/u500207944/import-millas/node_modules/mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'u500207944_todomundoconec',
    password: 'SuperMillas2026',
    database: 'u500207944_super_millas',
  });

  async function q(label, sql) {
    console.log(`\n=== ${label} ===`);
    const [rows] = await pool.execute(sql);
    console.table(rows);
  }

  await q('TODAS AS CATEGORIAS ATIVAS COM PRODUTOS',
    `SELECT c.nome, c.slug, COUNT(p.id) as produtos
     FROM categories c LEFT JOIN products p ON p.categoria_id = c.id AND p.ativo = 1
     WHERE c.ativo = 1 GROUP BY c.id ORDER BY c.ordem`);

  await q('CATEGORIAS WOO DESATIVADAS COM PALAVRAS DE CONGELADOS',
    `SELECT id, nome, slug FROM categories
     WHERE ativo = 0 AND (nome LIKE '%congelad%' OR nome LIKE '%sorvete%' OR nome LIKE '%gelado%' OR nome LIKE '%frozen%' OR nome LIKE '%pizza%')`);

  await q('PRODUTOS COM NOMES DE CONGELADOS (qualquer categoria)',
    `SELECT p.nome, c.nome as categoria
     FROM products p LEFT JOIN categories c ON p.categoria_id = c.id
     WHERE p.ativo = 1 AND (p.nome LIKE '%congelad%' OR p.nome LIKE '%sorvete%' OR p.nome LIKE '%pizza%' OR p.nome LIKE '%gelado%')
     LIMIT 25`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
