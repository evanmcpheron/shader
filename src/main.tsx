import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { studioStore } from './app/studioStore'
import { LocalPersistence } from './persistence/localPersistence'

const persistence = new LocalPersistence(studioStore)
persistence.connectLifecycle()
import.meta.hot?.dispose(() => persistence.dispose())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App persistence={persistence} />
  </StrictMode>,
)
