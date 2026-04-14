import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-4xl filled">storefront</span>
            <span className="font-headline font-extrabold text-2xl text-on-surface">Super Millas</span>
          </div>
          <p className="text-on-surface-variant text-sm">Painel Administrativo</p>
        </div>

        <Suspense fallback={<div className="bg-surface-container-lowest rounded-2xl p-8 h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
