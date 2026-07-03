import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/hooks/useAuth";

export default function Dashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="p-10">
      <h1>Dashboard</h1>

      <p>Welcome, {user?.name}</p>

      <button
        onClick={handleLogout}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
      >
        Logout
      </button>
    </div>
  );
}