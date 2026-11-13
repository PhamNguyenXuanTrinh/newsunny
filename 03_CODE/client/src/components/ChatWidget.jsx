import { useState, useRef, useEffect } from 'react';
import api from '../api';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Xin chào! Tôi là Trợ lý AI. Tôi có thể giúp gì cho bạn?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => { 
    if (isOpen) {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (e) => {
    e.preventDefault(); 
    if (!input.trim() || loading) return;
    
    const currentInput = input;
    setMessages(prev => [...prev, { role: 'user', text: currentInput }]);
    setInput(''); 
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { 
        question: currentInput, 
        session_id: 'sess_web' 
      });
      
      // Xử lý xuống dòng cho câu trả lời của AI (nếu có)
      const formattedText = res.data.answer.replace(/\n/g, '<br/>');
      
      setMessages(prev => [...prev, { role: 'bot', text: formattedText, isHTML: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: 'Lỗi kết nối: ' + (err.response?.data?.error || err.message) 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 font-sans">
      {isOpen ? (
        <div className="w-[calc(100vw-32px)] max-w-[380px] sm:w-[380px] h-[70vh] sm:h-[550px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-up">
          
          {/* Header */}
          <div className="bg-blue-600 p-3 sm:p-4 flex justify-between items-center text-white shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot size={20} />
              </div>
              <div>
                <span className="font-bold text-sm sm:text-base block leading-none">Trợ lý AI</span>
                <span className="text-[10px] text-blue-100">SUNNY FLEX 3D</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-blue-700 p-1.5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Nội dung chat */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                {/* Bong bóng chat */}
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                  }`}
                >
                  {m.isHTML ? (
                    <div dangerouslySetInnerHTML={{ __html: m.text }} />
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
            
            {/* Hiệu ứng đang tải */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500">AI đang phân tích dữ liệu...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Form nhập */}
          <form onSubmit={handleSend} className="p-2 sm:p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Hỏi AI về công việc, SOP, KPI..." 
                rows="1"
                className="flex-1 px-4 py-2.5 bg-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-24 custom-scrollbar" 
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()} 
                className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 shrink-0 shadow-md"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
            <div className="flex justify-between items-center mt-1 px-1">
              <span className="text-[10px] text-slate-400">Enter để gửi, Shift+Enter để xuống dòng</span>
              <span className="text-[10px] text-slate-400">{input.length} / 10.000</span>
            </div>
          </form>
        </div>
      ) : (
        // Nút bong bóng chat khi đóng
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-transform hover:scale-105 relative group"
        >
          <MessageSquare size={26} />
          {/* Chấm đỏ thông báo */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
      )}
    </div>
  );
}