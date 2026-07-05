import { Navigate, Route, Routes } from "react-router-dom";
import InventoryPage from "./pages/InventoryPage";
import RentalsPage from "./pages/RentalsPage";
import StudentDashboard from "./pages/StudentDashboard";

export default function EquipmentRoutes() {
  return (
    <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="rentals" element={<RentalsPage />} />
      <Route path="*" element={<Navigate to="/equipment" replace />} />
    </Routes>
  );
}
