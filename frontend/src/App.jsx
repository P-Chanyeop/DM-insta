import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import FlowsPage from './pages/FlowsPage'
import AutomationPage from './pages/AutomationPage'
import LiveChatPage from './pages/LiveChatPage'
import BroadcastPage from './pages/BroadcastPage'
import SequencesPage from './pages/SequencesPage'
import ContactsPage from './pages/ContactsPage'
import GrowthPage from './pages/GrowthPage'
import AnalyticsPage from './pages/AnalyticsPage'
import TemplatesPage from './pages/TemplatesPage'
import SettingsPage from './pages/SettingsPage'
import FlowBuilderPage from './pages/FlowBuilderPage'
import SequenceBuilderPage from './pages/SequenceBuilderPage'
import BroadcastBuilderPage from './pages/BroadcastBuilderPage'
import LegalPage from './pages/LegalPage'
import GroupBuyPage from './pages/GroupBuyPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="flows" element={<FlowsPage />} />
        <Route path="flows/builder" element={<FlowBuilderPage />} />
        <Route path="flows/builder/:id" element={<FlowBuilderPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="livechat" element={<LiveChatPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="broadcast/builder" element={<BroadcastBuilderPage />} />
        <Route path="sequences" element={<SequencesPage />} />
        <Route path="sequences/builder" element={<SequenceBuilderPage />} />
        <Route path="sequences/builder/:id" element={<SequenceBuilderPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="growth" element={<GrowthPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="group-buys" element={<GroupBuyPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
