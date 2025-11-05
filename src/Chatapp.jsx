import { useState, useEffect, useRef } from 'react';
import { Send, Search, Phone, Video, Smile, MoreVertical, Edit2, Trash2, Check, X, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ChatApp() {
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [contacts, setRecentChats] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [search, setsearch] = useState([]);
  const [token] = useState(sessionStorage.getItem('token'));
  const your_id = sessionStorage.getItem('your_id');
  const username = sessionStorage.getItem('username');
  let user_id = sessionStorage.getItem('user_id');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  const navigate = useNavigate();

  const chatSocket = useRef(null);
  const messageComponent = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch chat profile & history
  const fetchalldata = async () => {
    if (!user_id) return;
    const response = await fetch(`http://127.0.0.1:8000/api/accounts/chat_profile/${user_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await response.json();
    setsearch(json);
    console.log(json);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchallmessage = async () => {
    if (!user_id) return;
    const response = await fetch(`http://127.0.0.1:8000/api/chat/chatHistory/${user_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await response.json();

    if (Array.isArray(json) && json.length > 0 && Array.isArray(json[0])) {
      const historyMessages = json[0].map((m, index) => ({
        id: m.id || index,
        sender: m.sender,
        message: m.Message,
        position: m.sender !== username ? 'left' : 'right',
        time: m.time,
        date: m.date,
        message_type: m.message_type || 'text'
      }));
      setMessages(historyMessages);
    }
  };

  // Chat WebSocket
  useEffect(() => {
    if (!user_id || !token) return;
    fetchalldata();
    fetchallmessage();

    chatSocket.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${user_id}/?token=${token}`);

    chatSocket.current.onopen = () => console.log('Chat WebSocket connected');

    chatSocket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log("Incoming:", data);

      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;

      const position = data.username !== username ? 'left' : 'right';

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: data.message,
          message_type: data.message_type || 'text',
          position,
          time: formattedTime,
          date: formattedDate,
        },
      ]);
    };

    chatSocket.current.onclose = () => console.log('Chat WebSocket closed');
    chatSocket.current.onerror = (err) => console.error('Chat WebSocket error:', err);

    return () => chatSocket.current?.close();
  }, [user_id, token, username]);

  // Recent chats WebSocket
  useEffect(() => {
    if (!your_id) return;
    messageComponent.current = new WebSocket(`ws://127.0.0.1:8000/ws/recent/${your_id}/`);

    messageComponent.current.onopen = () => console.log('MessageComponent connected');
    messageComponent.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setRecentChats(data.recent_chats);
      console.log('recent', data);
    };

    messageComponent.current.onclose = () => console.log('MessageComponent disconnected');
    return () => messageComponent.current?.close();
  }, [your_id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send text message
  const sendMessage = () => {
    if (!message.trim()) return;
    if (chatSocket.current && chatSocket.current.readyState === WebSocket.OPEN) {
      chatSocket.current.send(JSON.stringify({ message, username, message_type: "text" }));
      setMessage('');
    } else {
      console.error('WebSocket is not open.');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // File upload
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat/uploads/", {
        method: "POST",
        
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const fileUrl = data.file_url;

      if (chatSocket.current && chatSocket.current.readyState === WebSocket.OPEN) {
        chatSocket.current.send(
          JSON.stringify({
            message: fileUrl,
            username,
            message_type: "file",
          })
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: fileUrl,
          message_type: "file",
          position: "right",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        },
      ]);
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  const handleContactClick = (contact) => {
    sessionStorage.setItem('user_id', contact.userid);
    setActiveContact(contact);
    setMessages([]);

    if (isMobile) {
      navigate(`/chatpage`);
    } else {
      fetchallmessage();
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/chat/message/${messageId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        } else {
          alert('Failed to delete message');
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message');
      }
    }
  };

  const handleEditMessage = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditedText(currentText);
  };

  const handleSaveEdit = async (messageId) => {
    if (!editedText.trim()) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/chat/message/${messageId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editedText }),
      });

      if (response.ok) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, message: editedText } : m
        ));
        setEditingMessageId(null);
        setEditedText("");
      } else {
        alert('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedText("");
  };

  return (
    <div className="h-screen bg-gray-100 flex border-gray-200 p-4">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 flex flex-col ${isMobile ? 'w-full' : 'w-80'}`}>
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact, i) => (
            <div
              key={i}
              onClick={() => handleContactClick(contact)}
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition ${
                activeContact?.userid === contact.userid ? 'bg-blue-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                <img src={contact.image} alt={contact.name} className="object-cover w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate">{contact.name}</h3>
                <p className="text-sm text-gray-500 truncate">Updated {contact.last_updated}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {!isMobile && (
        <div className="flex-1 flex flex-col">
          {activeContact ? (
            <>
              <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    <img src={activeContact.image} alt="avatar" className="object-cover w-full h-full" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">{activeContact.name}</h2>
                    <p className="text-xs text-gray-500">{activeContact.online_status ? 'Active now' : 'Offline'}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.position === 'right' ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div className="relative group max-w-md">
                      {editingMessageId === m.id ? (
                        <div className="flex items-center gap-2 bg-white p-3 rounded-2xl shadow-lg">
                          <input
                            type="text"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(m.id)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 bg-red-500 text-white rounded hover:bg-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              m.position === 'right'
                                ? 'bg-blue-500 text-white rounded-br-sm'
                                : 'bg-white text-gray-800 rounded-bl-sm'
                            }`}
                          >
                            {m.message_type === 'file' ? (
                              m.message.match(/\.(jpeg|jpg|png|gif|mp4|webm)$/i) ? (
                                <img src={m.message} alt="Uploaded file" className="max-w-xs rounded-lg" />
                              ) : (
                                <a
                                  href={m.message}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline break-all"
                                >
                                  {m.message.split('/').pop()}
                                </a>
                              )
                            ) : (
                              <p>{m.message}</p>
                            )}
                            <p
                              className={`text-xs mt-1 flex justify-end ${
                                m.position === 'right' ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {m.time}
                            </p>
                          </div>

                          {m.position === 'right' && hoveredMessageId === m.id && (
                            <div className="absolute -top-8 right-0 flex gap-2 bg-white shadow-lg rounded-lg p-1">
                              <button
                                onClick={() => handleEditMessage(m.id, m.message)}
                                className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                title="Edit message"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="p-1 hover:bg-gray-100 rounded text-red-600"
                                title="Delete message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-4 flex items-end gap-2">
                <div
                  onClick={handleUploadClick}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                </div>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full bg-transparent focus:outline-none text-gray-800"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full transition transform hover:scale-105"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a chat to start messaging
            </div>
          )}
        </div>
      )}
    </div>
  );
}
