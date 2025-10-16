import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { OrDivider } from '@/components/auth/OrDivider'

export default function SignIn() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Clear fields on mount
  useEffect(() => {
    setEmail('')
    setPassword('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error

      // Check subscription status to determine redirect
      const { data: subscriptionData } = await supabase.rpc('get_user_subscription', {
        user_id_param: (await supabase.auth.getUser()).data.user?.id
      })
      
      console.log('SignIn subscription check:', subscriptionData)
      const hasActiveSubscription = subscriptionData?.[0]?.status === 'active'

      toast({ title: 'Signed in', description: 'Welcome back!' })
      navigate(hasActiveSubscription ? '/research' : '/pricing?new=true')
    } catch (err: any) {
      const errorMessage = err?.message || 'Unable to sign in. Please try again.'
      if (errorMessage.includes('Email not confirmed') || errorMessage.includes('email_not_confirmed')) {
        setError('Please verify your email before signing in. Check your inbox for the confirmation link.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    setError(null)
    setNotice(null)
    if (!email) {
      setError('Enter your email above first.')
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error

      setNotice('Password reset link sent! Check your email and click the link to set a new password.')
      toast({ 
        title: 'Reset email sent', 
        description: import.meta.env.DEV 
          ? 'Check your inbox. Dev tip: Email confirmation can be disabled in Supabase settings for faster testing (see PASSWORD_RESET_SETUP.md).'
          : 'Check your inbox for the password reset link.',
        duration: 8000
      })
    } catch (err: any) {
      setError(err?.message || 'Could not start password reset.')
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-sm text-gray-600 mb-6">Sign in to access your research tools</p>

        {/* OAuth Section */}
        <div className="space-y-4 mb-6">
          <OAuthButtons />
          <OrDivider />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email"
                type="email"
                autoComplete="off"
                name="email-new"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                name="password-new"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Links Row */}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleForgot}
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              Forgot password?
            </button>
            <Link to="/auth/sign-up" className="text-gray-600 hover:text-gray-900 hover:underline font-medium">
              Create account
            </Link>
          </div>

          {/* Submit Button with Gradient */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Error/Notice Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200"
            >
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200"
            >
              <p className="text-sm text-green-700">{notice}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  )
}
