import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import { PetProvider } from './game/store.jsx'

import './styles/tokens.css'
import './styles/global.css'
import './styles/screens.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY && import.meta.env.PROD) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY — add it to your .env (see .env.example)')
}

const tree = (
  <HashRouter>
    <PetProvider>
      <App />
    </PetProvider>
  </HashRouter>
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        {tree}
      </ClerkProvider>
    ) : (
      // Local preview without a Clerk key: the public marketing page renders;
      // auth-gated routes (/play, /zoo) won't work until a key is set in .env.
      tree
    )}
  </React.StrictMode>
)
