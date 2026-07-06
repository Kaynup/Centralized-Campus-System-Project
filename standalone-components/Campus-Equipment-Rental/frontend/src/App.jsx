import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import StudentDashboard from './pages/StudentDashboard'
import InventoryPage from './pages/InventoryPage'
import RentalsPage from './pages/RentalsPage'

function App() {
  return (
    <BrowserRouter>

      <Routes>
      
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/rentals" element={<RentalsPage />} />

        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App