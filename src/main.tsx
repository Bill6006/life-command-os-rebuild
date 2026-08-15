import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from './features/shell/AppShell'
import './styles/tokens.css'
import './styles/base.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root was not found')

createRoot(container).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
)
