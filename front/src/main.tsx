import { Buffer } from 'buffer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Some transitive Midnight SDK deps reference the Node Buffer global directly
// instead of importing from 'buffer' — polyfill it before anything else runs.
globalThis.Buffer ??= Buffer

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
