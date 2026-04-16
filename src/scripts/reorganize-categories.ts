/**
 * Reorganiza categorias WooCommerce em 10 categorias comerciais simples.
 * Uso:
 *   npx tsx src/scripts/reorganize-categories.ts            (aplica)
 *   npx tsx src/scripts/reorganize-categories.ts --dry-run  (mostra o que seria feito)
 */

import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

dotenv.config({ path: '.env.local' })

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
})

const db = drizzle(pool, { schema, mode: 'default' })

const isDryRun = process.argv.includes('--dry-run')

// ── Novas 10 categorias comerciais ────────────────────────────────────────────

const COMERCIAIS = [
  { slug: 'mercearia',       nome: 'Mercearia',             ordem: 0 },
  { slug: 'bebidas',         nome: 'Bebidas',               ordem: 1 },
  { slug: 'hortifruti',      nome: 'Hortifruti',            ordem: 2 },
  { slug: 'carnes',          nome: 'Carnes & Aves',         ordem: 3 },
  { slug: 'frios-laticinios',nome: 'Frios & Laticínios',   ordem: 4 },
  { slug: 'padaria',         nome: 'Padaria & Confeitaria', ordem: 5 },
  { slug: 'congelados',      nome: 'Congelados',            ordem: 6 },
  { slug: 'limpeza',         nome: 'Limpeza',               ordem: 7 },
  { slug: 'higiene-beleza',  nome: 'Higiene & Beleza',      ordem: 8 },
  { slug: 'pet',             nome: 'Pet Shop',              ordem: 9 },
]

// ── Regras de mapeamento: keywords → slug comercial ────────────────────────

function mapearCategoria(nomeWoo: string): string {
  const n = nomeWoo.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')

  // Bebidas (antes de suco/agua que podem aparecer em mercearia)
  if (n.includes('bebida') || n.includes('refrig') || n.includes('suco') ||
      n.includes('agua') || n.includes('cerveja') || n.includes('vinho') ||
      n.includes('alcool') || n.includes('energetic') || n.includes('cha') ||
      n.includes('cafe') || n.includes('achocolatad'))
    return 'bebidas'

  // Hortifruti
  if (n.includes('hortifruti') || n.includes('fruta') || n.includes('verdura') ||
      n.includes('legume') || n.includes('folha') || n.includes('graos') ||
      n.includes('graos') || n.includes('grao'))
    return 'hortifruti'

  // Carnes
  if (n.includes('carne') || n.includes('bovina') || n.includes('suina') ||
      n.includes('frango') || n.includes('aves') || n.includes('peixe') ||
      n.includes('frutos do mar') || n.includes('acougue') || n.includes('linguica') ||
      n.includes('salsicha') || n.includes('presunto') || n.includes('bacon'))
    return 'carnes'

  // Frios e laticínios
  if (n.includes('frio') || n.includes('laticinios') || n.includes('queijo') ||
      n.includes('iogurte') || n.includes('leite') || n.includes('manteiga') ||
      n.includes('margarina') || n.includes('requeijao') || n.includes('creme de leite') ||
      n.includes('nata') || n.includes('pereciv'))
    return 'frios-laticinios'

  // Congelados
  if (n.includes('congelad') || n.includes('sorvete') || n.includes('gelado') ||
      n.includes('pizza congelad'))
    return 'congelados'

  // Padaria e confeitaria
  if (n.includes('padaria') || n.includes('biscoito') || n.includes('seca doce') ||
      n.includes('bolo') || n.includes('pao') || n.includes('torrada') ||
      n.includes('cereal') || n.includes('matinal') || n.includes('granola') ||
      n.includes('farinha') || n.includes('mistura para bolo') || n.includes('chocolate'))
    return 'padaria'

  // Limpeza
  if (n.includes('limpeza') || n.includes('detergente') || n.includes('desinfet') ||
      n.includes('sabao em po') || n.includes('amaciante') || n.includes('alvejante') ||
      n.includes('esponja') || n.includes('vassoura') || n.includes('rodo') ||
      n.includes('pano') || n.includes('sacos de lixo'))
    return 'limpeza'

  // Higiene e beleza
  if (n.includes('higiene') || n.includes('perfum') || n.includes('beleza') ||
      n.includes('sabonete') || n.includes('shampoo') || n.includes('condicionador') ||
      n.includes('desodorante') || n.includes('creme') || n.includes('absorvente') ||
      n.includes('escova') || n.includes('fio dental') || n.includes('pasta de dente'))
    return 'higiene-beleza'

  // Pet
  if (n.includes('pet') || n.includes('animal') || n.includes('racao') ||
      n.includes('cachorro') || n.includes('gato') || n.includes('ave') && n.includes('rac'))
    return 'pet'

  // Default: mercearia (enlatados, secos, salgadinhos, etc)
  return 'mercearia'
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN\n' : '🔧 Reorganizando categorias...\n')

  // 1. Buscar categorias atuais
  const catAtual = await db.select().from(schema.categories)
  console.log(`📋 ${catAtual.length} categorias encontradas no banco.\n`)

  // 2. Garantir que as 10 categorias comerciais existam
  const comerciaisMap = new Map<string, number>() // slug → id

  for (const c of COMERCIAIS) {
    const exist = catAtual.find(x => x.slug === c.slug)
    if (exist) {
      comerciaisMap.set(c.slug, exist.id)
      if (!isDryRun) {
        await db.update(schema.categories)
          .set({ nome: c.nome, ordem: c.ordem, ativo: true })
          .where(eq(schema.categories.id, exist.id))
      }
      console.log(`  ✓ Categoria comercial existente: ${c.nome} (id=${exist.id})`)
    } else {
      console.log(`  + Criar categoria comercial: ${c.nome} (${c.slug})`)
      if (!isDryRun) {
        const [res] = await pool.execute(
          'INSERT INTO categories (nome, slug, ordem, ativo) VALUES (?, ?, ?, 1)',
          [c.nome, c.slug, c.ordem]
        ) as any
        comerciaisMap.set(c.slug, res.insertId)
      } else {
        comerciaisMap.set(c.slug, -1)
      }
    }
  }

  // Recarregar mapa se foi insert
  if (!isDryRun) {
    const refreshed = await db.select().from(schema.categories)
    for (const c of COMERCIAIS) {
      const found = refreshed.find(x => x.slug === c.slug)
      if (found) comerciaisMap.set(c.slug, found.id)
    }
  }

  console.log()

  // 3. Mapear cada categoria WooCommerce → categoria comercial
  const slugsComerciais = new Set(COMERCIAIS.map(c => c.slug))
  const catWoo = catAtual.filter(c => !slugsComerciais.has(c.slug))

  console.log(`🗺  Mapeando ${catWoo.length} categorias WooCommerce:\n`)

  const catParaDesativar: number[] = []
  let totalProdutosMovidos = 0

  for (const woo of catWoo) {
    const destSlug = mapearCategoria(woo.nome)
    const destId = comerciaisMap.get(destSlug)
    if (!destId || destId === -1) continue

    // Contar produtos nessa categoria
    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) as total FROM products WHERE categoria_id = ?',
      [woo.id]
    ) as any

    console.log(`  "${woo.nome}" (id=${woo.id}, ${total} produtos) → ${destSlug}`)

    if (!isDryRun && parseInt(total) > 0) {
      await pool.execute(
        'UPDATE products SET categoria_id = ? WHERE categoria_id = ?',
        [destId, woo.id]
      )
      totalProdutosMovidos += parseInt(total)
    }

    catParaDesativar.push(woo.id)
  }

  // 4. Desativar categorias WooCommerce que não são comerciais
  console.log(`\n  → ${catParaDesativar.length} categorias WooCommerce serão desativadas`)

  if (!isDryRun && catParaDesativar.length > 0) {
    await db.update(schema.categories)
      .set({ ativo: false })
      .where(inArray(schema.categories.id, catParaDesativar))
  }

  // 5. Produtos sem categoria → mercearia
  const [[{ semCat }]] = await pool.execute(
    'SELECT COUNT(*) as semCat FROM products WHERE categoria_id IS NULL AND ativo = 1'
  ) as any
  const semCatCount = parseInt(semCat)

  if (semCatCount > 0) {
    const merceId = comerciaisMap.get('mercearia')
    console.log(`\n  ⚠ ${semCatCount} produtos sem categoria → serão atribuídos à Mercearia`)
    if (!isDryRun && merceId && merceId !== -1) {
      await pool.execute(
        'UPDATE products SET categoria_id = ? WHERE categoria_id IS NULL AND ativo = 1',
        [merceId]
      )
    }
  }

  console.log(`\n${isDryRun
    ? `🔍 Dry run concluído. ${catWoo.length} categorias seriam mapeadas.`
    : `✅ Pronto! Categorias reorganizadas. ${totalProdutosMovidos} produtos movidos.`
  }`)

  await pool.end()
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
