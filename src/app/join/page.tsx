'use client'

import { useState } from 'react'

export default function JoinPage() {
  const [code, setCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length >= 4) {
      window.location.href = `/play/${code.toUpperCase()}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 mb-4">
          Quiz24
        </h1>
        <p className="text-xl text-gray-300">
          Gib den Spiel-Code ein
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={6}
            className="w-full px-6 py-4 text-4xl font-mono font-bold text-center rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase tracking-widest"
          />
          
          <button
            type="submit"
            disabled={code.trim().length < 4}
            className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Beitreten →
          </button>
        </div>
      </form>

      <a 
        href="/"
        className="mt-8 text-gray-400 hover:text-white transition"
      >
        ← Zurück zur Startseite
      </a>
    </div>
  )
}
