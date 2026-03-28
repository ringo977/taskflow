// eslint-disable-next-line no-unused-vars
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'

const ManualPage = lazy(() => import('./pages/ManualPage'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/taskflow">
    <Routes>
      <Route path="/manual" element={<Suspense fallback={<div style={{ padding: 32, color: 'var(--tx3)' }}>Loading…</div>}><ManualPage /></Suspense>} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
)
