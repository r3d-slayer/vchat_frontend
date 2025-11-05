import { useState, useEffect, useRef } from "react";
import { Send, Smile, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ChatPage() {
  const navigate = useNavigate();

  // ✅ Session data
  const user_id = sessionStorage.getItem("user_id");
  const token = sessionStorage.getItem("token");
  const username = sessionStorage.getItem("username");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState({});
  const chatSocket = useRef(null);
  const messagesEndRef = useRef(null);

  // 🟢 Fetch chat profile
  const fetchProfile = async () => {
    if (!user_id) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/accounts/chat_profile/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setSearch(json[0]);
      console.log(json[0])
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  // 🟢 Fetch chat history
  const fetchMessages = async () => {
    if (!user_id) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/chat/chatHistory/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
     

      if (Array.isArray(json) && json.length > 0 && Array.isArray(json[0])) {
        const historyMessages = json[0].map((m) => ({
          sender: m.sender,
          message: m.Message,
          position: m.sender !== username ? "left" : "right",
          time: m.time,
          date: m.date,
        }));
        setMessages(historyMessages);
        
      }
    } catch (err) {
      console.error("Message fetch error:", err);
    }
  };

  // 🟢 WebSocket connection
  useEffect(() => {
    if (!user_id || !token) return;

    fetchProfile();
    fetchMessages();
 

    chatSocket.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${user_id}/?token=${token}`);

    chatSocket.current.onopen = () => console.log("Chat WebSocket connected");
    chatSocket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const now = new Date();
      const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(now.getFullYear()).slice(-2)}`;

      const position = data.username !== username ? "left" : "right";
      setMessages((prev) => [
        ...prev,
        { message: data.message, position, time: formattedTime, date: formattedDate },
      ]);
    };

    chatSocket.current.onclose = () => console.log("Chat WebSocket closed");
    chatSocket.current.onerror = (err) => console.error("WebSocket error:", err);

    return () => chatSocket.current?.close();
  }, [user_id, token, username]);

  // 🟢 Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🟢 Send message
  const sendMessage = () => {
    if (!message.trim()) return;
    if (chatSocket.current && chatSocket.current.readyState === WebSocket.OPEN) {
      chatSocket.current.send(JSON.stringify({ message, username }));
      setMessage("");
    } else {
      console.error("WebSocket not open");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 🟢 UI
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 flex items-center gap-3 border-b">
        <button onClick={() => navigate("/chat")} className="md:hidden">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <img src={search.image} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div>
            <h2 className="font-semibold text-gray-800">{search.full_name}</h2>
            <p className="text-xs text-gray-500">
              {search.online_status ? "Active now" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.position === "right" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-4 py-2 rounded-2xl max-w-md ${
                m.position === "right"
                  ? "bg-blue-500 text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm"
              }`}
            >
              <p>{m.message}</p>
              <p className="text-xs text-gray-300 mt-1 flex justify-end">{m.time}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-3 flex items-center gap-2">
        <Smile className="w-6 h-6 text-gray-600" />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 focus:outline-none"
        />
        <button
          onClick={sendMessage}
          className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full transition"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
