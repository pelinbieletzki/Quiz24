'use client'

import { useEffect, useState } from 'react'
import { supabase, Quiz } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/'
      return
    }
    setUser(user)
    loadQuizzes(user.id)
  }

  const loadQuizzes = async (userId: string) => {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
    
    setQuizzes(data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Quiz wirklich löschen?')) return
    
    await supabase.from('quizzes').delete().eq('id', quizId)
    setQuizzes(quizzes.filter(q => q.id !== quizId))
  }

  const startGame = async (quizId: string) => {
    // Generate 6-character code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        quiz_id: quizId,
        host_id: user?.id,
        join_code: joinCode,
        status: 'lobby'
      })
      .select()
      .single()

    if (error) {
      alert('Fehler beim Starten: ' + error.message)
      return
    }

    window.location.href = `/host/${data.join_code}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Meine Quizzes</h1>
            <p className="text-gray-400 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-300 hover:text-white transition"
          >
            Ausloggen
          </button>
        </div>

        {/* Create New Quiz Button */}
        <Link
          href="/quiz/new"
          className="block w-full p-6 mb-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-2 border-dashed border-purple-500/50 rounded-xl text-center hover:border-purple-400 transition group"
        >
          <span className="text-5xl mb-2 block group-hover:scale-110 transition">➕</span>
          <span className="text-xl text-white font-semibold">Neues Quiz erstellen</span>
        </Link>

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Du hast noch keine Quizzes erstellt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{quiz.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Erstellt: {new Date(quiz.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startGame(quiz.id)}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition"
                    >
                      ▶ Starten
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
