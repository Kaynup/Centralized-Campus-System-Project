/**
 * Entry Point - React 18 Root Initialization
 * Sets up React DOM rendering, routing, and global styles
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Import global styles
import './styles/theme.css'
import './styles/globals.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
