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
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <h2 className="text-3xl font-bold text-center mb-8 text-white">
          {isLogin ? 'Willkommen zurück!' : 'Account erstellen'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              placeholder="deine@email.de"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.includes('erstellt') ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Laden...' : isLogin ? 'Einloggen' : 'Registrieren'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-300 hover:text-white transition text-sm"
          >
            {isLogin ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Einloggen'}
          </button>
        </div>
      </div>
    </div>
  )
}
