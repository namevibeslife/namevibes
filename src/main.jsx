import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Only loaded in mock mode, so production bundles never include the mock layer
const MockBadge = import.meta.env.MODE === 'mock'
  ? React.lazy(() => import('./mock/MockBadge.jsx'))
  : null

// Service worker only in production builds; in dev it would cache files and hide your edits
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.error('Service worker registration failed:', error))
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {MockBadge && (
      <React.Suspense fallback={null}>
        <MockBadge />
      </React.Suspense>
    )}
  </React.StrictMode>,
)
