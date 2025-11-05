import { useEffect, useRef, useState } from 'react';
import './App.css';
import AuthPage from './Login';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ChatApp from './Chatapp';
import ChatPage from './ChatPage';
import ProfileForm from './EditProfile';
import SignupPage from './Signup';
import ErrorPage from './ErrorPage';

function App() {
  const token = sessionStorage.getItem('token');
  const username = sessionStorage.getItem('username');
  
  const navigate = useNavigate();
  const location = useLocation(); // ✅ FIXED: added location hook
  const [userStatuses, setUserStatuses] = useState({}); // ✅ FIXED: added state

  // 🔹 Redirect mobile users to /chat instead of /chatpage
  useEffect(() => {
    if (window.innerWidth < 600) {
      if (location.pathname === '/chatpage') {
        navigate('/chat');
      }
    }
  }, [location, navigate]);

  const onlineStatusSocket = useRef(null);

  // 🔹 Handle WebSocket for online/offline tracking
  useEffect(() => {
    if (!token) return; // Don't set up WebSocket if token is not present

    onlineStatusSocket.current = new WebSocket(`ws://127.0.0.1:8000/ws/online/`);

    const sendOnlineStatus = (status) => {
      if (onlineStatusSocket.current && onlineStatusSocket.current.readyState === WebSocket.OPEN) {
        onlineStatusSocket.current.send(JSON.stringify({
          'username': username,
          'online_status': status
        }));
      }
    };

    const handleBeforeUnload = () => {
      sendOnlineStatus(false);
    };

    onlineStatusSocket.current.onopen = () => {
      console.log("CONNECTED TO ONLINE STATUS CONSUMER");
      sendOnlineStatus(true);
    };

    onlineStatusSocket.current.onclose = () => {
      console.log("DISCONNECTED FROM ONLINE STATUS CONSUMER");
    };

    onlineStatusSocket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.username !== username) {
        setUserStatuses(prevStatuses => ({
          ...prevStatuses,
          [data.username]: data.online_status ? true : false
        }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (onlineStatusSocket.current) {
        sendOnlineStatus(false);
        onlineStatusSocket.current.close();
      }
    };
  }, [username, token]);

  return (
    <div className="m-0 px-0 py-0">
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/chat" element={<ChatApp />} />
        <Route path="/chatpage" element={<ChatPage />} />
        <Route path="/edit-profile" element={<ProfileForm />} />
        <Route path="/404" element={<ErrorPage />} />
      </Routes>
    </div>
  );
}

// ✅ Router wrapper (since useNavigate/useLocation must be inside a Router)
export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
