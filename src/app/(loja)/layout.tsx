import Navbar from '@/components/loja/Navbar'
import Footer from '@/components/loja/Footer'

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-[72px] md:pt-[88px]">
        {children}
      </main>
      <Footer />
    </>
  )
}
