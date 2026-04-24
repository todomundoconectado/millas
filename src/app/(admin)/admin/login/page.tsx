import { Suspense } from 'react'
import Image from 'next/image'
import LoginForm from './LoginForm'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Image src="/logo-millas.png" alt="Super Millas" width={240} height={80} className="h-24 w-auto object-contain" />
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
