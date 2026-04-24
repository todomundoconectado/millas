'use client'

interface Props {
  confirmMessage: string
  action: (formData: FormData) => Promise<void>
  hiddenFields?: Record<string, string | number>
  label?: string
  className?: string
}

export default function DeleteConfirmButton({
  confirmMessage,
  action,
  hiddenFields = {},
  label = 'Excluir',
  className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-error-container text-on-error-container hover:opacity-80 transition-opacity',
}: Props) {
  return (
    <form action={action}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault()
        }}
      >
        {label}
      </button>
    </form>
  )
}
