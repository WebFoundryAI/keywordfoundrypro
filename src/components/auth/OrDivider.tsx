import React from 'react'

export function OrDivider() {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex-1 border-t border-gray-300" />
      <span className="text-sm text-gray-500 font-medium">or</span>
      <div className="flex-1 border-t border-gray-300" />
    </div>
  )
}
