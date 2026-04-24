// Move sorvetes e congelados para a categoria Congelados
const mysql = require('/home/u500207944/import-millas/node_modules/mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'u500207944_todomundoconec',
  password: 'SuperMillas2026',
  database: 'u500207944_super_millas',
});

async function main() {
  // Get congelados category id
  const [[congelados]] = await pool.execute("SELECT id FROM categories WHERE slug = 'congelados' LIMIT 1");
  if (!congelados) { console.log('Categoria congelados não encontrada!'); process.exit(1); }
  const congeladosId = congelados.id;
  console.log(`Categoria Congelados id = ${congeladosId}`);

  // Products that are clearly frozen/ice cream goods (by name keywords)
  // These are currently wrongly placed in Frios & Laticínios or other categories
  const keywords = [
    'SORVETE', 'GELATO', 'PICOLÉ', 'PICOLE',
    'FRANGO CONGELADO', 'PEIXE CONGELADO', 'CAMARÃO CONGELADO',
    'REFEIÇÃO CONGELADA', 'LASANHA', 'HAMBURGUER CONGELADO',
  ];

  for (const kw of keywords) {
    const [result] = await pool.execute(
      `UPDATE products SET categoria_id = ? WHERE ativo = 1 AND nome LIKE ? AND categoria_id != ?`,
      [congeladosId, `%${kw}%`, congeladosId]
    );
    const affected = result.affectedRows;
    if (affected > 0) console.log(`  → "${kw}": ${affected} produtos movidos para Congelados`);
  }

  // Also move massa de pizza from frios-laticinios to congelados
  const [r2] = await pool.execute(
    `UPDATE products SET categoria_id = ?
     WHERE ativo = 1 AND nome LIKE '%MASSA%PIZZA%'
     AND categoria_id != ?`,
    [congeladosId, congeladosId]
  );
  if (r2.affectedRows > 0) console.log(`  → "MASSA PIZZA": ${r2.affectedRows} produtos movidos`);

  // Verify
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM products WHERE categoria_id = ? AND ativo = 1`,
    [congeladosId]
  );
  console.log(`\nTotal de produtos em Congelados agora: ${total}`);

  // List them
  const [produtos] = await pool.execute(
    `SELECT nome FROM products WHERE categoria_id = ? AND ativo = 1 ORDER BY nome LIMIT 30`,
    [congeladosId]
  );
  console.log('\nProdutos em Congelados:');
  produtos.forEach(p => console.log(`  - ${p.nome}`));

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
