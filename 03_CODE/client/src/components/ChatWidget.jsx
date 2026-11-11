import { useState, useRef, useEffect } from 'react';
import api from '../api';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Xin chào! Tôi là Trợ lý AI. Tôi có thể giúp gì cho bạn?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {isOpen ? (
        <div className="w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slide-up">
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2"><Bot size={20} /><span className="font-bold">Trợ lý AI</span></div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded"><X size={20} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[75%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-slate-400 text-xs ml-10">AI đang phân tích...</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="Hỏi AI..." 
                className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <button type="submit" disabled={loading} className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50"><Send size={18} /></button>
            </div>
            {/* Bộ đếm ký tự */}
            <div className="text-right text-[10px] text-slate-400 mt-1 mr-2">{input.length} / 10.000</div>
          </form>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40 transition-transform hover:scale-105">
          <MessageSquare size={28} />
        </button>
      )}
    </div>
  );
}