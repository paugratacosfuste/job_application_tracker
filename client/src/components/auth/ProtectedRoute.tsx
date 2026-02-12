import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
        <Loader2 className="h-8 w-8 animate-spin text-[#489FB5]" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/welcome" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
