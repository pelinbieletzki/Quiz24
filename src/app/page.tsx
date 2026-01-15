import AuthForm from '@/components/AuthForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 mb-4">
          Quiz24
        </h1>
        <p className="text-xl text-gray-300 max-w-md mx-auto">
          Erstelle Quizzes und spiele sie live mit Freunden!
        </p>
      </div>
      
      <AuthForm />
      
      <div className="mt-12 text-center">
        <p className="text-gray-400 mb-4">Oder tritt einem Quiz bei:</p>
        <a 
          href="/join"
          className="inline-block px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition"
        >
          Mit Code beitreten →
        </a>
      </div>
    </main>
  )
}
