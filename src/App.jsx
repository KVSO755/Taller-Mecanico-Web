import { BrowserRouter, Routes, Route } from 'react-router'

function EnConstruccion() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
        <h1 className="text-2xl font-bold text-slate-800">TallerApp</h1>
        <p className="mt-2 text-slate-600">En construcción</p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<EnConstruccion />} />
      </Routes>
    </BrowserRouter>
  )
}
