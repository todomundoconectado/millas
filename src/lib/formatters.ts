/**
 * Formatadores para o mercado brasileiro
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata valor para R$ 12,90 */
export function formatBRL(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'R$ 0,00'
  return BRL.format(num)
}

/** Calcula % de desconto entre preço original e atual */
export function calcDesconto(precoDe: number | string, preco: number | string): number {
  const de = typeof precoDe === 'string' ? parseFloat(precoDe) : precoDe
  const por = typeof preco === 'string' ? parseFloat(preco) : preco
  if (!de || de <= por) return 0
  return Math.round(((de - por) / de) * 100)
}

/** Formata CEP: 12345678 → 12345-678 */
export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return cep
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

/** Formata telefone: 11999998888 → (11) 99999-8888 */
export function formatTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return tel
}

/** Formata quantidade: 1.500 kg, 3 un */
export function formatQtd(quantidade: number | string, isKg: boolean): string {
  const num = typeof quantidade === 'string' ? parseFloat(quantidade) : quantidade
  if (isKg) {
    return `${num.toFixed(3).replace('.', ',')} kg`
  }
  return `${Math.round(num)} un`
}

/** Busca CEP via ViaCEP e retorna dados de endereço */
export async function buscarCEP(cep: string): Promise<{
  logradouro: string
  bairro: string
  cidade: string
  estado: string
} | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    }
  } catch {
    return null
  }
}
