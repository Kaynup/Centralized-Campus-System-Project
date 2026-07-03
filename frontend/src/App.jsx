import {Routes, Route} from 'react-router-dom'
import { AuthProvider } from "./shared/context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Dashboard from './pages/Dashboard';
import Login from './pages/Login.jsx'
function App() {

  return (
    <>
      <AuthProvider>
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/login" element={<Login />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
      {/* /equipment/*, /facility/*, /marketplace/*, /wallet, /profile, /settings */}
    </Route>
  </Routes>
</AuthProvider>
    </>
  )
}

export default App
