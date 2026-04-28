'use client'

import { useRef, useState, useTransition } from 'react'

interface Props {
  productId: number
  currentImages: string[]
  updateImagesAction: (formData: FormData) => Promise<void>
}

const MIN_WIDTH = 600
const MIN_HEIGHT = 600

function checkImageResolution(file: File): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }) }
    img.src = url
  })
}

export default function ImageUploadSection({ productId, currentImages, updateImagesAction }: Props) {
  const [images, setImages] = useState<string[]>(currentImages)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lowResWarning, setLowResWarning] = useState<{ file: File; width: number; height: number } | null>(null)

  async function uploadFile(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('pasta', `produtos/${productId}`)
    const res = await fetch('/api/admin/imagens', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erro ao fazer upload')
    return data.url as string
  }

  async function handleFiles(files: FileList) {
    setError(null)
    const uploaded: string[] = []

    for (const file of Array.from(files)) {
      const { width, height } = await checkImageResolution(file)

      if (width > 0 && (width < MIN_WIDTH || height < MIN_HEIGHT)) {
        // Pausar e perguntar sobre baixa resolução
        setLowResWarning({ file, width, height })
        return // processa um arquivo por vez quando há aviso
      }

      setUploading(true)
      try {
        uploaded.push(await uploadFile(file))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha de rede ao enviar imagem')
      }
      setUploading(false)
    }

    if (uploaded.length > 0) setImages(prev => [...prev, ...uploaded])
  }

  async function confirmLowRes() {
    if (!lowResWarning) return
    const file = lowResWarning.file
    setLowResWarning(null)
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setImages(prev => [...prev, url])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha de rede ao enviar imagem')
    }
    setUploading(false)
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  function moveImage(from: number, to: number) {
    setImages(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  function handleSave() {
    const fd = new FormData()
    fd.append('imagens', images.join('\n'))
    startTransition(() => updateImagesAction(fd))
  }

  return (
    <div className="mt-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="text-base font-bold text-on-surface mb-1">Imagens</h2>
      <p className="text-xs text-on-surface-variant mb-1">
        Upload automático — converte para WebP otimizado. Arraste ou clique para adicionar.
        A primeira imagem é a principal.
      </p>
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-on-surface-variant bg-surface-container rounded-xl px-4 py-2.5">
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-primary">check_circle</span> Mínimo 600×600 px</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-primary">check_circle</span> Fundo branco ou neutro</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-primary">check_circle</span> Produto centralizado</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-primary">check_circle</span> JPG, PNG ou WebP</span>
      </div>

      {/* Aviso de baixa resolução */}
      {lowResWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <p className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Imagem com baixa resolução ({lowResWarning.width}×{lowResWarning.height} px)
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Recomendamos no mínimo {MIN_WIDTH}×{MIN_HEIGHT} px para boa qualidade na loja. Imagens pequenas podem ficar pixeladas ou borradas.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmLowRes}
              className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
            >
              Adicionar mesmo assim
            </button>
            <button
              type="button"
              onClick={() => setLowResWarning(null)}
              className="px-4 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-outline-variant/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-colors mb-4"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin" style={{ animationDuration: '1s' }}>
              progress_activity
            </span>
            <p className="text-sm text-on-surface-variant">Convertendo para WebP...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-outline-variant text-3xl">upload</span>
            <p className="text-sm text-on-surface-variant">
              <span className="text-primary font-medium">Clique para escolher</span> ou arraste imagens aqui
            </p>
            <p className="text-xs text-on-surface-variant">JPG, PNG, WebP, GIF — máx 10 MB cada</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/30 px-4 py-2 rounded-xl mb-4">{error}</p>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img, i) => (
            <div
              key={img + i}
              className="relative w-24 h-24 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0 group"
            >
              <img src={img} alt={`Imagem ${i + 1}`} className="w-full h-full object-contain p-1" />
              {/* Principal badge */}
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-on-primary rounded px-1 py-0.5 leading-none">
                  Principal
                </span>
              )}
              {/* Número */}
              <span className="absolute top-1 right-1 text-[9px] font-bold bg-black/50 text-white rounded px-1">
                {i + 1}
              </span>
              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center gap-1 pb-1 opacity-0 group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    className="w-6 h-6 rounded bg-white/90 text-on-surface text-xs flex items-center justify-center"
                    title="Mover para cima"
                  >
                    ←
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="w-6 h-6 rounded bg-error text-on-error text-xs flex items-center justify-center"
                  title="Remover imagem"
                >
                  ✕
                </button>
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    className="w-6 h-6 rounded bg-white/90 text-on-surface text-xs flex items-center justify-center"
                    title="Mover para baixo"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || uploading}
          className="px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar imagens'}
        </button>
        {images.length === 0 && (
          <p className="text-xs text-on-surface-variant">Nenhuma imagem adicionada.</p>
        )}
        {images.length > 0 && (
          <p className="text-xs text-on-surface-variant">{images.length} imagem{images.length !== 1 ? 'ns' : ''}</p>
        )}
      </div>
    </div>
  )
}
