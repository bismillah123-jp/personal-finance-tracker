import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider, AuthProvider } from '@/components/providers'
import { PWAProvider } from '@/components/pwa-provider'
import DashboardPage from '@/app/dashboard/page'
import TransactionsPage from '@/app/transactions/page'
import BudgetingPage from '@/app/budgeting/page'
import InvestmentsPage from '@/app/investments/page'
import DebtsPage from '@/app/debts/page'
import SettingsPage from '@/app/settings/page'
import LoginPage from '@/app/auth/login/page'
import RegisterPage from '@/app/auth/register/page'
import ForgotPasswordPage from '@/app/auth/forgot-password/page'
import AIAssistantPage from '@/app/ai/page'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PWAProvider>
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/budgeting" element={<BudgetingPage />} />
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/debts" element={<DebtsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/ai" element={<AIAssistantPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </PWAProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
