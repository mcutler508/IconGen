import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LandingPage from './pages/LandingPage.tsx'

const App = lazy(() => import('./App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={
          <Suspense fallback={
            <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>
          }>
            <App />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
