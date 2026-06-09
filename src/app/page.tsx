"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      router.replace(user ? '/dashboard' : '/login')
    })
  }, [router])
  return <div style={{ minHeight: "100vh", background: "#16151a" }} />
}
