import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'

// Landing
import LandingPage from './pages/landing/LandingPage'

// App pages
import BookingsPage  from './pages/bookings/BookingsPage'
import InvoicesPage  from './pages/invoices/InvoicesPage'
import InvoiceGeneratorPage from './pages/invoices/InvoiceGeneratorPage'
import ClientsPage   from './pages/clients/ClientsPage'
import RatesPage     from './pages/rates/RatesPage'
import SettingsPage  from './pages/settings/SettingsPage'
import LoginPage  from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

// 404
import NotFoundPage  from './pages/NotFoundPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing */}
          <Route path="/"  element={<LandingPage />} />
          <Route path="/login"  element={<LoginPage />}  />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="invoice-generator" element={<InvoiceGeneratorPage />} />

          {/* App (authenticated) routes */}
          <Route path="/app">
            <Route index element={<Navigate to="/app/bookings" replace />} />
            <Route path="bookings"  element={<BookingsPage />}  />
            <Route path="invoices"  element={<InvoicesPage />}  />
            <Route path="clients"   element={<ClientsPage />}   />
            <Route path="rates"     element={<RatesPage />}     />
            <Route path="settings"  element={<SettingsPage />}  />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
