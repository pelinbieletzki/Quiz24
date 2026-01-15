'use client'

import { useState } from 'react'
import Header from '@/components/Header'

export default function JoinPage() {
  const [code, setCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length >= 4) {
      window.location.href = `/play/${code.toUpperCase()}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
      <Header />
      
      <main className="flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Quiz beitreten
          </h1>
          <p className="text-xl text-white/90">
            Gib den Spiel-Code ein
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="card p-8">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="w-full px-6 py-4 text-4xl font-mono font-bold text-center rounded-xl border-2 border-[#0364c1] text-[#022d94] placeholder-gray-400 focus:outline-none focus:border-[#022d94] focus:ring-2 focus:ring-[#0364c1]/20 uppercase tracking-widest"
            />
            
            <button
              type="submit"
              disabled={code.trim().length < 4}
              className="w-full mt-6 btn-secondary text-xl py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Beitreten →
            </button>
          </div>
        </form>

        <a 
          href="/"
          className="mt-8 text-white/80 hover:text-white transition"
        >
          ← Zurück zur Startseite
        </a>
      </main>
    </div>
  )
}
