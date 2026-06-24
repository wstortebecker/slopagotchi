import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { PetProvider } from './game/store.jsx'

import './styles/tokens.css'
import './styles/global.css'
import './styles/screens.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <PetProvider>
        <App />
      </PetProvider>
    </HashRouter>
  </React.StrictMode>
)
