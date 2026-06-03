import { AuthGuard } from "@/components/auth-guard"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard redirectAdminToPanel>{children}</AuthGuard>
}
