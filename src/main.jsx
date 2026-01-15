import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { ThemeProvider } from './components/ThemeContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { LanguageProvider } from './i18n'

// 🛡️ Inicializar sistemas de segurança máxima
import { initializeSecuritySystems } from './lib/securityCenter.js'

// Inicializar segurança assim que a app carrega
initializeSecuritySystems().then((success) => {
  if (success) {
    console.log('🔒 Booklyo Security Systems: ACTIVE');
  }
}).catch((error) => {
  console.warn('⚠️ Security initialization warning:', error.message);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <UserProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </UserProvider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>,
)

