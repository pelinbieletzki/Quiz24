'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        window.location.href = '/dashboard'
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Account erstellt! Du kannst dich jetzt einloggen.')
        setIsLogin(true)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten'
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-lg p-6 border-2 border-[#ffbb1e]">
        {/* Join Button - inside card at top */}
        <a 
          href="/join"
          className="block w-full mb-4 py-2 px-4 bg-[#ffbb1e] text-[#022d94] font-bold rounded text-center hover:bg-[#ffcc4d] transition text-sm"
        >
          Mit Code beitreten →
        </a>

        <div className="border-t border-gray-200 pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#0364c1]"
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#0364c1]"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div className={`p-2 rounded text-xs ${message.includes('erstellt') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[#0364c1] text-white font-semibold rounded hover:bg-[#0470d4] transition text-sm disabled:opacity-50"
            >
              {loading ? 'Laden...' : isLogin ? 'Einloggen' : 'Registrieren'}
            </button>
          </form>

          <div className="mt-3 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#0364c1] hover:text-[#022d94] transition text-xs"
            >
              {isLogin ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Einloggen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
