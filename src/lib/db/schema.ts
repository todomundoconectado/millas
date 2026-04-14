import {
  mysqlTable,
  varchar,
  text,
  decimal,
  boolean,
  int,
  timestamp,
  json,
  index,
  mysqlEnum,
  mediumtext,
} from 'drizzle-orm/mysql-core'

// ── Enums ──────────────────────────────────────────────────────────────────

export const promotionTypes = ['percentual', 'valor_fixo', 'compre_x_leve_y', 'combo'] as const
export const couponTypes = ['percentual', 'valor_fixo', 'frete_gratis'] as const
export const orderStatuses = ['pendente', 'confirmado', 'separando', 'saiu_entrega', 'entregue', 'cancelado'] as const
export const paymentTypes = ['pix', 'cartao', 'boleto'] as const
export const paymentStatuses = ['aguardando', 'aprovado', 'recusado', 'reembolsado'] as const
export const scheduledFields = ['preco', 'preco_de', 'estoque', 'ativo'] as const
export const userRoles = ['admin', 'operador'] as const

// ── Users ──────────────────────────────────────────────────────────────────

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', userRoles).notNull().default('operador'),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Categories ─────────────────────────────────────────────────────────────

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  parentId: int('parent_id'),
  imagemUrl: text('imagem_url'),
  ordem: int('ordem').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Products ───────────────────────────────────────────────────────────────

export const products = mysqlTable(
  'products',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 500 }).notNull().unique(),
    descricao: mediumtext('descricao'),
    preco: decimal('preco', { precision: 10, scale: 2 }).notNull(),
    precoDe: decimal('preco_de', { precision: 10, scale: 2 }),
    sku: varchar('sku', { length: 255 }),
    categoriaId: int('categoria_id').references(() => categories.id),
    imagens: json('imagens').$type<string[]>().notNull().default([]),
    isKg: boolean('is_kg').notNull().default(false),
    estoque: decimal('estoque', { precision: 10, scale: 3 }).notNull().default('0'),
    ativo: boolean('ativo').notNull().default(true),
    wooId: varchar('woo_id', { length: 100 }).unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index('products_slug_idx').on(t.slug),
    index('products_woo_id_idx').on(t.wooId),
    index('products_categoria_id_idx').on(t.categoriaId),
    index('products_ativo_idx').on(t.ativo),
  ]
)

// ── Promotions ─────────────────────────────────────────────────────────────

export const promotions = mysqlTable('promotions', {
  id: int('id').autoincrement().primaryKey(),
  tipo: mysqlEnum('tipo', promotionTypes).notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  descricao: text('descricao'),
  valor: decimal('valor', { precision: 10, scale: 2 }),
  produtoId: int('produto_id').references(() => products.id),
  categoriaId: int('categoria_id').references(() => categories.id),
  compraQtd: int('compra_qtd'),
  leveQtd: int('leve_qtd'),
  produtoBrindeId: int('produto_brinde_id').references(() => products.id),
  ativo: boolean('ativo').notNull().default(true),
  inicio: timestamp('inicio'),
  fim: timestamp('fim'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Coupons ────────────────────────────────────────────────────────────────

export const coupons = mysqlTable('coupons', {
  id: int('id').autoincrement().primaryKey(),
  codigo: varchar('codigo', { length: 100 }).notNull().unique(),
  tipo: mysqlEnum('tipo', couponTypes).notNull(),
  valor: decimal('valor', { precision: 10, scale: 2 }),
  usosMax: int('usos_max'),
  usosAtuais: int('usos_atuais').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
  validade: timestamp('validade'),
  pedidoMinimo: decimal('pedido_minimo', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Orders ─────────────────────────────────────────────────────────────────

export const orders = mysqlTable(
  'orders',
  {
    id: int('id').autoincrement().primaryKey(),
    numero: varchar('numero', { length: 50 }).notNull().unique(),
    status: mysqlEnum('status', orderStatuses).notNull().default('pendente'),
    clienteNome: varchar('cliente_nome', { length: 255 }).notNull(),
    clienteTelefone: varchar('cliente_telefone', { length: 20 }).notNull(),
    clienteEmail: varchar('cliente_email', { length: 255 }),
    endereco: json('endereco').$type<{
      logradouro: string
      numero: string
      complemento?: string
      bairro: string
      cidade: string
      estado: string
      cep: string
    }>().notNull(),
    deliverySlot: json('delivery_slot').$type<{
      data: string
      hora: string
      label: string
    }>(),
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    desconto: decimal('desconto', { precision: 10, scale: 2 }).notNull().default('0'),
    frete: decimal('frete', { precision: 10, scale: 2 }).notNull().default('0'),
    total: decimal('total', { precision: 10, scale: 2 }).notNull(),
    pagamentoTipo: mysqlEnum('pagamento_tipo', paymentTypes).notNull(),
    pagamentoStatus: mysqlEnum('pagamento_status', paymentStatuses).notNull().default('aguardando'),
    mpPaymentId: varchar('mp_payment_id', { length: 255 }),
    couponId: int('coupon_id').references(() => coupons.id),
    notas: text('notas'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index('orders_numero_idx').on(t.numero),
    index('orders_status_idx').on(t.status),
    index('orders_created_at_idx').on(t.createdAt),
  ]
)

// ── Order Items ────────────────────────────────────────────────────────────

export const orderItems = mysqlTable('order_items', {
  id: int('id').autoincrement().primaryKey(),
  orderId: int('order_id').notNull().references(() => orders.id),
  productId: int('product_id').references(() => products.id),
  nomeSnapshot: varchar('nome_snapshot', { length: 500 }).notNull(),
  precoSnapshot: decimal('preco_snapshot', { precision: 10, scale: 2 }).notNull(),
  imagemSnapshot: text('imagem_snapshot'),
  quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
  isKg: boolean('is_kg').notNull().default(false),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
})

// ── Banners ────────────────────────────────────────────────────────────────

export const banners = mysqlTable('banners', {
  id: int('id').autoincrement().primaryKey(),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  imagemUrl: text('imagem_url').notNull(),
  linkUrl: text('link_url'),
  ordem: int('ordem').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
  inicio: timestamp('inicio'),
  fim: timestamp('fim'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Scheduled Updates (automação) ─────────────────────────────────────────

export const scheduledUpdates = mysqlTable('scheduled_updates', {
  id: int('id').autoincrement().primaryKey(),
  productId: int('product_id').references(() => products.id),
  campo: mysqlEnum('campo', scheduledFields).notNull(),
  valorNovo: varchar('valor_novo', { length: 255 }).notNull(),
  executaEm: timestamp('executa_em').notNull(),
  executado: boolean('executado').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Types ──────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Promotion = typeof promotions.$inferSelect
export type Coupon = typeof coupons.$inferSelect
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type Banner = typeof banners.$inferSelect
export type ScheduledUpdate = typeof scheduledUpdates.$inferSelect
