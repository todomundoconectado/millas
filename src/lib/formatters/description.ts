const BOLD_KEYWORDS = [
  // Informações nutricionais
  'ingredientes', 'informação nutricional', 'informações nutricionais',
  'valor energético', 'proteínas', 'carboidratos', 'gorduras', 'fibra', 'fibras',
  'sódio', 'açúcares', 'calorias', 'kcal', 'porção', 'vitamina',
  // Produto
  'composição', 'contém', 'não contém', 'alérgenos', 'alérgico',
  'validade', 'prazo de validade', 'peso líquido', 'volume', 'unidade',
  'modo de preparo', 'modo de usar', 'como usar', 'conservação',
  'armazenar', 'temperatura', 'refrigerado', 'congelado',
  // Qualidade
  'sem conservante', 'sem glúten', 'sem lactose', 'orgânico', 'integral',
  'artesanal', 'natural', 'origem', 'procedência',
]

function boldKeywords(html: string): string {
  let result = html
  for (const kw of BOLD_KEYWORDS) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<![<>\\w])(${escaped})(?![\\w])`, 'gi')
    result = result.replace(regex, '<strong>$1</strong>')
  }
  return result
}

function hasHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

function plainTextToHtml(text: string): string {
  // Divide em parágrafos por linhas duplas ou ponto final + espaço + maiúscula
  const paras = text
    .split(/\n{2,}/)
    .flatMap(block => {
      // Dentro de cada bloco, divide frases longas demais (> 300 chars)
      if (block.length > 300) {
        return block
          .split(/(?<=[.!?])\s+(?=[A-ZÁÀÃÂÉÊÍÓÕÔÚÇ])/)
          .filter(s => s.trim())
      }
      return [block.trim()]
    })
    .filter(p => p.trim())

  return paras.map(p => `<p>${p.trim()}</p>`).join('\n')
}

function cleanHtml(html: string): string {
  return html
    // Remove atributos de estilo inline e classes
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    // Transforma <br> em parágrafo separado se entre blocos de texto
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
    // Garante que parágrafos tenham espaço adequado (não toca no conteúdo)
    .replace(/<\/p>\s*<p>/gi, '</p>\n<p>')
    // Remove divs/spans desnecessários mantendo o conteúdo
    .replace(/<\/?(?:div|span)[^>]*>/gi, '')
    // Remove parágrafos vazios
    .replace(/<p>\s*<\/p>/gi, '')
    .trim()
}

export function formatProductDescription(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return ''

  let html: string

  if (hasHtmlTags(raw)) {
    html = cleanHtml(raw)
  } else {
    html = plainTextToHtml(raw)
  }

  html = boldKeywords(html)

  return html
}
