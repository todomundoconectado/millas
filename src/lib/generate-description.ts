// Gera descrição de produto via Claude API seguindo o padrão Super Millas:
// 4 blocos (tagline + visão geral + diferenciais + CTA), 150-250 palavras, HTML simples

export async function gerarDescricao(params: {
  nome: string
  categoria?: string
  ean?: string
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const { nome, categoria, ean } = params

  const prompt = `Escreva uma descrição de produto para um supermercado online no Brasil.

Produto: ${nome}${categoria ? `\nCategoria: ${categoria}` : ''}${ean ? `\nCódigo EAN: ${ean}` : ''}

REGRAS OBRIGATÓRIAS:
- 150 a 250 palavras
- 4 parágrafos em HTML (use <p> e <strong> para negrito pontual, NUNCA <ul> ou <li>)
- Parágrafo 1: tagline impactante — 1 frase curta que captura a essência
- Parágrafo 2: visão geral — o que é, para quem, benefício principal (2-3 frases)
- Parágrafo 3: diferenciais — características específicas, qualidade, ingredientes se aplicável
- Parágrafo 4: encerramento com CTA suave — como usar, contexto, motivação de compra
- Tom: português formal-cotidiano, amigável e consultivo
- Benefício antes de feature (o que proporciona, não só o que é)
- Sem jargão técnico excessivo

Retorne APENAS o HTML dos 4 parágrafos, sem explicações.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    return text.trim() || null
  } catch {
    return null
  }
}
