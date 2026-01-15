import AuthForm from '@/components/AuthForm'
import Header from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header />
      
      <main className="flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#022d94] leading-loose">
            Willkommen bei Quiz24
          </h1>
        </div>
        
        <AuthForm />
      </main>
    </div>
  )
}
