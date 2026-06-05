// App.jsx — Router principal do GESPUB.AI
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MetaProvider } from './context/MetaContext'
import { AppProvider } from './context/AppContext'
import ErrorBoundary from './components/ErrorBoundary'

// Layouts
import PlatformLayout from './components/layout/PlatformLayout'
import AdminLayout from './components/admin/AdminLayout'

// Páginas
import Login from './pages/Login'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import Dashboard from './pages/platform/Dashboard'
import Campaigns from './pages/platform/Campaigns'
import AdSets from './pages/platform/AdSets'
import Ads from './pages/platform/Ads'
import Agents from './pages/platform/Agents'
import Rules from './pages/platform/Rules'
import Insights from './pages/platform/Insights'
import Connections from './pages/platform/Connections'

// Páginas Admin
import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAgentsRules from './pages/admin/AdminAgentsRules'
import AdminLogs from './pages/admin/AdminLogs'
import AdminSettings from './pages/admin/AdminSettings'

// Rota protegida — redireciona para login se não autenticado
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  // Permite acesso quando voltando do OAuth do Facebook (code+state na URL).
  // detectSessionInUrl: false no Supabase garante que o código não é interceptado.
  const sp = new URLSearchParams(window.location.search)
  if (sp.get('code') && sp.get('state')) return children
  if (!isAuthenticated) return <Navigate to="/" replace />
  return children
}

// Rota admin — redireciona se não for admin
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

// Rota de login — redireciona se já autenticado
function PublicRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Páginas públicas (sem autenticação) */}
      <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
      <Route path="/termos-de-uso" element={<TermsOfUse />} />

      {/* Plataforma — rotas protegidas */}
      <Route
        element={
          <ProtectedRoute>
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/campanhas" element={<Campaigns />} />
        <Route path="/conjuntos" element={<AdSets />} />
        <Route path="/anuncios" element={<Ads />} />
        <Route path="/agentes" element={<Agents />} />
        <Route path="/regras" element={<Rules />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/conexoes" element={<Connections />} />
      </Route>

      {/* Admin — rotas admin */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/usuarios" element={<AdminUsers />} />
        <Route path="/admin/agentes-regras" element={<AdminAgentsRules />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/configuracoes" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <MetaProvider>
            <AppProvider>
              <AppRoutes />
            </AppProvider>
          </MetaProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
