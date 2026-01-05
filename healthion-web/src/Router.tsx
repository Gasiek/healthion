import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/app-layout'
import { AuthGuard } from './components/auth-guard'
import NotMatch from './pages/NotMatch'
import Dashboard from './pages/Dashboard'
import Sample from './pages/Sample'
import ComingSoon from './pages/ComingSoon'
import Profile from './pages/Profile'
import HeartRate from './pages/HeartRate'
import Workouts from './pages/Workouts'
import Sleep from './pages/Sleep'
import Activity from './pages/Activity'
import Recovery from './pages/Recovery'
import Body from './pages/Body'
import Settings from './pages/Settings'

export default function Router() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="" element={
                    <AuthGuard>
                        <Dashboard />
                    </AuthGuard>
                } />
                <Route path="heart-rate" element={
                    <AuthGuard>
                        <HeartRate />
                    </AuthGuard>
                } />
                <Route path="workouts" element={
                    <AuthGuard>
                        <Workouts />
                    </AuthGuard>
                } />
                <Route path="sleep" element={
                    <AuthGuard>
                        <Sleep />
                    </AuthGuard>
                } />
                <Route path="activity" element={
                    <AuthGuard>
                        <Activity />
                    </AuthGuard>
                } />
                <Route path="recovery" element={
                    <AuthGuard>
                        <Recovery />
                    </AuthGuard>
                } />
                <Route path="body" element={
                    <AuthGuard>
                        <Body />
                    </AuthGuard>
                } />
                <Route path="settings" element={
                    <AuthGuard>
                        <Settings />
                    </AuthGuard>
                } />
                <Route path="profile" element={
                    <AuthGuard>
                        <Profile />
                    </AuthGuard>
                } />
                <Route path="sample" element={
                    <AuthGuard>
                        <Sample />
                    </AuthGuard>
                } />
                <Route path="feature" element={<ComingSoon />} />
                <Route path="*" element={<NotMatch />} />
            </Route>
        </Routes>
    )
}
