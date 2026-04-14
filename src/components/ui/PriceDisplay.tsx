import { formatBRL, calcDesconto } from '@/lib/formatters'

interface PriceDisplayProps {
  preco: number | string
  precoDe?: number | string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function PriceDisplay({ preco, precoDe, size = 'md', className = '' }: PriceDisplayProps) {
  const hasDe = precoDe && parseFloat(String(precoDe)) > parseFloat(String(preco))
  const desconto = hasDe ? calcDesconto(precoDe!, preco) : 0

  const sizeMap = {
    sm: { preco: 'text-base', de: 'text-xs', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { preco: 'text-xl', de: 'text-sm', badge: 'text-[10px] px-2 py-0.5' },
    lg: { preco: 'text-3xl', de: 'text-base', badge: 'text-xs px-2 py-1' },
  }

  const s = sizeMap[size]

  return (
    <div className={`flex items-end gap-2 flex-wrap ${className}`}>
      {hasDe && (
        <span className={`line-through text-on-surface-variant ${s.de}`}>
          {formatBRL(precoDe!)}
        </span>
      )}
      <span className={`font-headline font-extrabold text-primary leading-none ${s.preco}`}>
        {formatBRL(preco)}
      </span>
      {desconto > 0 && (
        <span className={`rounded-full bg-error text-on-error font-bold leading-none ${s.badge}`}>
          -{desconto}%
        </span>
      )}
    </div>
  )
}
