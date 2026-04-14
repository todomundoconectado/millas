import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function listCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.ativo, true))
    .orderBy(asc(categories.ordem), asc(categories.nome))
}

export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number]
