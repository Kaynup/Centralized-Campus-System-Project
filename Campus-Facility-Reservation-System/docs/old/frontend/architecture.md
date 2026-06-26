# Frontend Architecture Code Documentation

This document explains the React application architecture, state management contexts, and API clients.

---

## 1. Authentication Context (`AuthContext.jsx`)

The auth provider manages the token state, login actions, and local session caching:
```javascript
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const { access_token, user: userData } = response.data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 2. Notification Context (`NotificationContext.jsx`)

Manages client-side polling for notifications and updates preference configurations:
```javascript
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const markAsRead = async (id) => {
    await notificationApi.markRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(c => Math.max(0, c - 1));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

---

## 3. Booking API Clients (`bookingApi.js`)

Uses axios to request reservation previews and cancel active bookings:
```javascript
import axios from 'axios';
import { setupMockInterceptor } from './mockInterceptor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const apiClient = axios.create({ baseURL: API_URL });

setupMockInterceptor(apiClient);

export const bookingApi = {
  create: (bookingData) => apiClient.post('/api/v1/bookings/', bookingData),
  // ...
};
```

---

## 4. Shared Utilities (`slotUtils.js`)

Centralizes the logic required to normalize and aggregate overlapping/consecutive time slots across the entire application:
- Unifies `groupConsecutiveSlots` and `slotsAreMergeable`.
- Ensures both the "Calendar" and "My Reservations" pages merge 10-minute slot intervals identically.

---

## 5. Global API Interceptors (`mockInterceptor.js` & `apiClient.js`)

- **Mock Interceptor**: Development logic (e.g., bypassing network requests) is extracted into `mockInterceptor.js`, keeping React contexts clean.
- **Graceful Unauth Redirects**: Instead of hard refreshing (`window.location.href`) on 401s, the API client broadcasts a custom `auth-unauthorized` event which the `AuthContext` catches to execute an in-router `navigate('/login')`.

---

## 6. Admin Tools & Utilities

The `/admin` routes include tools exclusively available to administrators:
- **System Logs (`SystemLogsPage.jsx`)**: Provides an audit trail for backend activities.
- **User Bulk Upload (`AdminUserUploadPage.jsx`)**: Connects to `userApi.js` to upload a CSV file via `FormData`, allowing the rapid bulk provisioning of students and professors into the database. Features a client-side `FileReader` parser to instantly preview uploaded CSV data and filter rows by role natively in the browser before submitting the batch request.
