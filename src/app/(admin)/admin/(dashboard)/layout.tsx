import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0 ml-0 md:ml-64">
        <div className="p-6 md:p-8 max-w-screen-xl">
          {children}
        </div>
      </main>
    </div>
  )
}
