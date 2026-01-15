'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleChangePassword = async () => {
    const email = (await supabase.auth.getUser()).data.user?.email
    if (email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        alert('Fehler: ' + error.message)
      } else {
        alert('Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.')
      }
    }
    setIsOpen(false)
  }

  const handleDeleteProfile = async () => {
    if (!confirm('Bist du sicher, dass du dein Profil löschen möchtest? Alle deine Quizzes werden unwiderruflich gelöscht.')) {
      return
    }

    if (!confirm('Diese Aktion kann NICHT rückgängig gemacht werden. Dein Account wird vollständig gelöscht. Wirklich fortfahren?')) {
      return
    }

    setIsDeleting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Kein Benutzer gefunden')
        return
      }

      // Call the server API to delete the account
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Löschen')
      }

      // Sign out locally
      await supabase.auth.signOut()

      alert('Dein Profil wurde vollständig gelöscht.')
      window.location.href = '/'
    } catch (error) {
      console.error('Error deleting profile:', error)
      alert('Fehler beim Löschen des Profils. Bitte versuche es erneut.')
    } finally {
      setIsDeleting(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/10 transition"
        aria-label="Profil"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <a
            href="/statistics"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            📊 Statistiken
          </a>
          <button
            onClick={handleChangePassword}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            🔑 Passwort ändern
          </button>
          <hr className="my-1 border-gray-200" />
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            🚪 Ausloggen
          </button>
          <button
            onClick={handleDeleteProfile}
            disabled={isDeleting}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            {isDeleting ? '⏳ Löschen...' : '🗑️ Profil löschen'}
          </button>
        </div>
      )}
    </div>
  )
}
