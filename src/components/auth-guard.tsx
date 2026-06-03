"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  children: React.ReactNode
  requireAdmin?: boolean
  /** Na trasach klienta: admin jest automatycznie przenoszony do swojego panelu. */
  redirectAdminToPanel?: boolean
}

export function AuthGuard({ children, requireAdmin = false, redirectAdminToPanel = false }: Props) {
  const { profile, loading, isAdmin } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!profile) { router.replace('/login'); return }
    if (requireAdmin && !isAdmin) { router.replace('/dashboard'); return }
    if (redirectAdminToPanel && isAdmin) { router.replace('/admin/clients'); return }
  }, [profile, loading, isAdmin, requireAdmin, redirectAdminToPanel, router])

  if (loading) return (
    <div className="p-8 space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )

  if (!profile) return null
  if (requireAdmin && !isAdmin) return null
  return <>{children}</>
}
