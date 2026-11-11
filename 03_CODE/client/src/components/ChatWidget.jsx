import { useState, useRef, useEffect } from 'react';
import api from '../api';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Xin chào! Tôi là Trợ lý AI. Tôi có thể giúp gì cho bạn?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { 
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault(); 
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const currentInput = input; 
    setInput(''); 
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { question: currentInput, session_id: 'sess_web' });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Lỗi: ' + (err.response?.data?.error || err.message) }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {isOpen ? (
        // KÍCH THƯỚC ĐÃ ĐƯỢC THU NHỎ LẠI
        // Mobile: Rộng tối đa 360px, cao 60% màn hình, tối đa 500px
        // PC: Rộng 360px, cao 500px
        <div className="w-[calc(100vw-32px)] max-w-[360px] sm:w-[360px] h-[60vh] sm:h-[500px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-up">
          
          <div className="bg-blue-600 p-3 sm:p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold text-sm sm:text-base">Trợ lý AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[75%] p-2.5 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-slate-400 text-xs ml-10 animate-pulse">AI đang trả lời...</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="p-2 sm:p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="Nhập câu hỏi..." 
                className="flex-1 px-3 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-blue-600 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
              >
                <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
            <div className="text-right text-[10px] text-slate-400 mt-1 mr-1">{input.length} / 10.000</div>
          </form>
        </div>
      ) : (
        // Nút bong bóng chat
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40 transition-transform hover:scale-105"
        >
          <MessageSquare size={24} className="md:w-7 md:h-7" />
        </button>
      )}
    </div>
  );
}