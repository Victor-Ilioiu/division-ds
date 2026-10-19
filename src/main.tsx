import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import App from './App.tsx'
import { onCaughtError } from './onCaughtError'

createRoot(document.getElementById('root')!, { onCaughtError }).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
