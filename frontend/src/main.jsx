import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { PlanProvider } from './components/PlanContext'
import './styles/global.css'
import './styles/landing.css'
import './styles/dashboard-layout.css'
import './styles/pages.css'
import './styles/auth.css'
import './styles/onboarding.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PlanProvider>
          <App />
        </PlanProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
