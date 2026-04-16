import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AccountProvider } from './components/AccountContext'
import PageLoader from './components/PageLoader'

// Eager: 랜딩/인증은 첫 화면이므로 즉시 로드
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardLayout from './layouts/DashboardLayout'

// Lazy: 대시보드 내부 페이지들은 코드 스플리팅
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const FlowsPage = lazy(() => import('./pages/FlowsPage'))
const FlowBuilderPage = lazy(() => import('./pages/FlowBuilderPage'))
const AutomationPage = lazy(() => import('./pages/AutomationPage'))
const LiveChatPage = lazy(() => import('./pages/LiveChatPage'))
const BroadcastPage = lazy(() => import('./pages/BroadcastPage'))
const BroadcastBuilderPage = lazy(() => import('./pages/BroadcastBuilderPage'))
const SequencesPage = lazy(() => import('./pages/SequencesPage'))
const SequenceBuilderPage = lazy(() => import('./pages/SequenceBuilderPage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const GrowthPage = lazy(() => import('./pages/GrowthPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const GroupBuyPage = lazy(() => import('./pages/GroupBuyPage'))
const AgencyPage = lazy(() => import('./pages/AgencyPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))

export default function App() {
  return (
    <AccountProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/terms" element={<Suspense fallback={<PageLoader />}><LegalPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><LegalPage /></Suspense>} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/auth/callback" element={<Suspense fallback={<PageLoader />}><AuthCallbackPage /></Suspense>} />
      <Route path="/app/onboarding" element={<Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense>} />
      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="flows" element={<Suspense fallback={<PageLoader />}><FlowsPage /></Suspense>} />
        <Route path="flows/builder" element={<Suspense fallback={<PageLoader />}><FlowBuilderPage /></Suspense>} />
        <Route path="flows/builder/:id" element={<Suspense fallback={<PageLoader />}><FlowBuilderPage /></Suspense>} />
        <Route path="automation" element={<Suspense fallback={<PageLoader />}><AutomationPage /></Suspense>} />
        <Route path="livechat" element={<Suspense fallback={<PageLoader />}><LiveChatPage /></Suspense>} />
        <Route path="broadcast" element={<Suspense fallback={<PageLoader />}><BroadcastPage /></Suspense>} />
        <Route path="broadcast/builder" element={<Suspense fallback={<PageLoader />}><BroadcastBuilderPage /></Suspense>} />
        <Route path="sequences" element={<Suspense fallback={<PageLoader />}><SequencesPage /></Suspense>} />
        <Route path="sequences/builder" element={<Suspense fallback={<PageLoader />}><SequenceBuilderPage /></Suspense>} />
        <Route path="sequences/builder/:id" element={<Suspense fallback={<PageLoader />}><SequenceBuilderPage /></Suspense>} />
        <Route path="contacts" element={<Suspense fallback={<PageLoader />}><ContactsPage /></Suspense>} />
        <Route path="growth" element={<Suspense fallback={<PageLoader />}><GrowthPage /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
        <Route path="templates" element={<Suspense fallback={<PageLoader />}><TemplatesPage /></Suspense>} />
        <Route path="group-buys" element={<Suspense fallback={<PageLoader />}><GroupBuyPage /></Suspense>} />
        <Route path="agency" element={<Suspense fallback={<PageLoader />}><AgencyPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
      </Route>
    </Routes>
    </AccountProvider>
  )
}
