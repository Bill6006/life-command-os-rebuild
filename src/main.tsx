import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryProvider } from './features/memory/MemoryProvider'
import { AppShell } from './features/shell/AppShell'
import './styles/tokens.css'
import './styles/base.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root was not found')

createRoot(container).render(
  <StrictMode>
    {/* One store and one clock above the whole shell, so Now and the QA
        laboratory are looking at the same history at the same moment. */}
    <MemoryProvider>
      <AppShell />
    </MemoryProvider>
  </StrictMode>,
)
