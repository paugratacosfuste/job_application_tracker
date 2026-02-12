import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle } from 'lucide-react'

export default function SignUpPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email.trim() || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Job Tracker</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create your account</p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle className="h-12 w-12 text-[#7CB518] mx-auto" />
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Check your email</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                We've sent a confirmation link to <strong className="text-[hsl(var(--foreground))]">{email}</strong>.
                Click the link to activate your account.
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-sm text-[#489FB5] hover:underline font-medium"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Account
                </Button>
              </form>
              <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-[#489FB5] hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
