// Fix false positives in Congelados category
const mysql = require('/home/u500207944/import-millas/node_modules/mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1', port: 3306,
  user: 'u500207944_todomundoconec',
  password: 'SuperMillas2026',
  database: 'u500207944_super_millas',
});

async function main() {
  const [[congelados]] = await pool.execute("SELECT id FROM categories WHERE slug = 'congelados'");
  const [[mercearia]] = await pool.execute("SELECT id FROM categories WHERE slug = 'mercearia'");
  const [[higiene]] = await pool.execute("SELECT id FROM categories WHERE slug = 'higiene-beleza'");

  const cId = congelados.id, mId = mercearia.id, hId = higiene.id;

  async function move(destId, condition, label) {
    const [r] = await pool.execute(
      `UPDATE products SET categoria_id = ? WHERE ativo = 1 AND categoria_id = ? AND (${condition})`,
      [destId, cId]
    );
    if (r.affectedRows > 0) console.log(`  Movido para ${label}: ${r.affectedRows} produtos → ${condition}`);
  }

  console.log('Corrigindo falsos positivos em Congelados...\n');

  // Utensils and accessories (not food)
  await move(mId, "nome LIKE '%PALITO%SORVETE%' OR nome LIKE '%COLHER%SORVETE%'", 'Mercearia');

  // Hairbrush with "sorvete" as color name
  await move(hId, "nome LIKE '%ESCOVA CAB%SORVETE%' OR nome LIKE '%ESCOVA%CABELO%SORVETE%'", 'Higiene & Beleza');

  // School supplies with "picolé" in name (not food)
  await move(mId, "nome LIKE '%KIT ESCOLAR%' OR nome LIKE '%LAPIS%PICOLE%' OR nome LIKE '%CANETA%PICOLE%'", 'Mercearia');

  // Ice cream coatings/toppings → keep in Mercearia (pantry item, not frozen)
  await move(mId, "nome LIKE '%COBERTURA%SORVETE%'", 'Mercearia');

  // Dry lasagna pasta (not frozen) → Mercearia
  // Frozen lasagna (PERDIGAO, SADIA, SEARA, FORNO DE MINAS) stays in Congelados
  await move(mId,
    "nome LIKE 'MASSA LASANHA%' OR nome LIKE 'MASSA FRESCA%LASANHA%' OR nome LIKE 'MASSA P/LASANHA%'",
    'Mercearia');

  // Final count
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) as total FROM products WHERE categoria_id = ? AND ativo = 1', [cId]
  );
  console.log(`\nTotal de produtos em Congelados após limpeza: ${total}`);

  // List all
  const [prods] = await pool.execute(
    'SELECT nome FROM products WHERE categoria_id = ? AND ativo = 1 ORDER BY nome', [cId]
  );
  console.log('\nProdutos finais em Congelados:');
  prods.forEach(p => console.log(`  - ${p.nome}`));

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
