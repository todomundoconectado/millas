'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Email ou senha incorretos.')
      } else {
        router.push(redirect)
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20">
      <h1 className="font-headline font-bold text-xl text-on-surface mb-6">Entrar</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
            placeholder="admin@supermillas.com.br"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-error text-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full btn-primary-gradient text-on-primary py-3 rounded-xl font-bold text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Entrando...
            </>
          ) : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
