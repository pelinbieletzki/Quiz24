'use client'

import { useEffect, useState } from 'react'
import { supabase, Quiz } from '@/lib/supabase'
import Link from 'next/link'
import Header from '@/components/Header'

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

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Quiz wirklich löschen?')) return
    
    await supabase.from('quizzes').delete().eq('id', quizId)
    setQuizzes(quizzes.filter(q => q.id !== quizId))
  }

  const startGame = async (quizId: string) => {
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
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-[#022d94] text-xl">Laden...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header showProfile />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#022d94]">Meine Quizzes</h1>
        </div>

        {/* Create New Quiz Button */}
        <Link
          href="/quiz/new"
          className="block w-full p-6 mb-6 card border-2 border-dashed border-[#0364c1] hover:border-[#022d94] transition group text-center"
        >
          <span className="text-5xl mb-2 block text-[#022d94] font-light">+</span>
          <span className="text-lg text-[#022d94] font-semibold group-hover:text-[#0364c1]">
            Neues Quiz erstellen
          </span>
        </Link>

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <div className="text-center py-12 card">
            <p className="text-gray-500 text-lg">Du hast noch keine Quizzes erstellt. Erstellte Quizzes werden hier angezeigt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="card p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-[#022d94]">{quiz.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Erstellt: {new Date(quiz.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startGame(quiz.id)}
                      className="btn-secondary text-sm"
                    >
                      ▶ Starten
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz.id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-semibold"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
