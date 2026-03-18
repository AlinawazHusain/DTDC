import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  return (
    <AppContext.Provider value={{ sidebarOpen, toggleSidebar, toasts, addToast }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
