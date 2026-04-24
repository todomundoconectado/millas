'use client'

interface Props {
  categoryName: string
  categoryId: number
  deleteAction: (formData: FormData) => Promise<void>
}

export default function DeleteCategoryButton({ categoryName, categoryId, deleteAction }: Props) {
  return (
    <form action={deleteAction}>
      <input type="hidden" name="id" value={categoryId} />
      <button
        type="submit"
        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-error-container text-on-error-container hover:opacity-80 transition-opacity"
        onClick={(e) => {
          if (!confirm(`Excluir a categoria "${categoryName}"? Esta ação não pode ser desfeita.`)) {
            e.preventDefault()
          }
        }}
      >
        Excluir
      </button>
    </form>
  )
}
