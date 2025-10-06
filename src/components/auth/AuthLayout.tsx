import React from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Hero Panel - Hidden on mobile, visible on md+ */}
      <div className="hidden md:flex flex-col justify-center px-12 lg:px-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
            <Search className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Keyword Foundry Pro
          </h1>
          
          <p className="text-lg text-gray-600 leading-relaxed">
            Unlock powerful SEO insights with professional keyword research, SERP analysis, and competitive intelligence tools designed for modern marketers.
          </p>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600 mb-1">10K+</div>
              <div className="text-sm text-gray-600">Keywords Analyzed</div>
            </div>
            <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 shadow-sm">
              <div className="text-2xl font-bold text-indigo-600 mb-1">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex items-center justify-center px-4 py-12 md:px-8 lg:px-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
