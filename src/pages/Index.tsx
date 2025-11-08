import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Search } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { OrDivider } from '@/components/auth/OrDivider'
import { getAppBaseUrl } from '@/lib/env'
import { trackSignIn } from '@/lib/analytics'
import { setRememberMePreference } from '@/lib/auth/rememberMe'
import { Checkbox } from '@/components/ui/checkbox'

export default function SignIn() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true) // Default to true for better UX
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

      // Set Remember Me preference
      setRememberMePreference(rememberMe);

      // Track successful sign in
      trackSignIn('email');

      // AuthProvider handles all redirects - just show success
      toast({ title: 'Signed in', description: 'Welcome back!' })
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
        redirectTo: `${getAppBaseUrl()}/auth/update-password`,
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
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Column - Hero Content (≈35% width) */}
      <div className="w-full md:w-[35%] flex flex-col justify-center px-6 py-8 md:px-8 lg:px-12 bg-background border-r border-border">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full space-y-6"
        >
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Keyword Foundry Pro
            </h1>
            <p className="text-lg font-semibold text-muted-foreground">
              Advanced Keyword Intelligence for Technical SEO
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unlock SEO potential with real-time, data-driven insights. A professional-grade keyword research platform built for technical SEO experts who demand accuracy and speed.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Real-time Data</h3>
                <p className="text-xs text-muted-foreground">Access live search volume and competition metrics.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Difficulty Score</h3>
                <p className="text-xs text-muted-foreground">Leverage advanced algorithms to measure true ranking difficulty.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Intent Analysis</h3>
                <p className="text-xs text-muted-foreground">Automatically classify search intent to align content strategies.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Secure Export & Storage</h3>
                <p className="text-xs text-muted-foreground">Save, manage, and export keyword data with complete confidence.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Column - Sign In Form (≈65% width) */}
      <div className="w-full md:w-[65%] flex items-center justify-center px-6 py-12 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl bg-card border border-border p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-sm text-muted-foreground mb-6">Sign in to access your research tools</p>

            {/* OAuth Section */}
            <div className="space-y-4 mb-6">
              <OAuthButtons />
              <OrDivider />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="off"
                    name="email-new"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    name="password-new"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readonly')}
                    className="w-full rounded-lg border border-border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              {/* Links Row */}
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>
                <Link to="/auth/sign-up" className="text-muted-foreground hover:text-foreground hover:underline font-medium">
                  Create account
                </Link>
              </div>

              {/* Submit Button with Gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-2.5 font-medium hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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
                  className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <p className="text-sm text-destructive">{error}</p>
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
        </motion.div>
      </div>
    </div>
  )
}
