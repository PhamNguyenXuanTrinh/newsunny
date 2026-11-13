import { useEffect, useState } from 'react';
import api from '../api';
import { Bot, User, Clock } from 'lucide-react';

export default function ChatHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.get('/chat-history').then(res => setHistory(res.data.data)).catch(console.error).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Đang tải lịch sử...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Lịch sử Chat AI</h1><p className="text-slate-500 text-sm mt-1">Xem lại các câu hỏi và câu trả lời trước đây.</p></div>
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-500">Chưa có lịch sử trò chuyện nào.</div>
        ) : (
          history.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-600'}`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] mt-2 flex items-center gap-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}><Clock size={12} /> {new Date(msg.created_at).toLocaleString('vi-VN')}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}