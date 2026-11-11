import { useEffect, useState } from 'react';
import api from '../api';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Search } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Stock() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStock = () => {
    setLoading(true);
    api.get('/stock-ledger')
      .then(res => setLedger(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchStock(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredLedger = ledger.filter(row => 
    (row.item_name && row.item_name.toLowerCase().includes(search.toLowerCase())) ||
    (row.item_code && row.item_code.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { header: 'Thời gian', accessor: 'created_at', render: (r) => (
      <span className="text-slate-600 text-sm whitespace-nowrap">
        {new Date(r.created_at).toLocaleString('vi-VN')}
      </span>
    )},
    { header: 'Mã hàng', accessor: 'item_code', render: (r) => <span className="font-bold text-slate-700">{r.item_code}</span> },
    { header: 'Tên hàng hóa', accessor: 'item_name', render: (r) => <span className="font-medium text-slate-800">{r.item_name}</span> },
    { header: 'Loại giao dịch', accessor: 'type', render: (r) => {
      if (r.type === 'in') return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold w-max"><ArrowDownToLine size={14}/> Nhập kho</span>;
      if (r.type === 'out') return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold w-max"><ArrowUpFromLine size={14}/> Xuất kho</span>;
      return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold w-max"><RefreshCw size={14}/> Điều chỉnh</span>;
    }},
    { header: 'Số lượng', accessor: 'qty', render: (r) => (
      <span className={`font-bold ${r.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
        {r.type === 'in' ? '+' : '-'}{Number(r.qty).toLocaleString('vi-VN')}
      </span>
    )},
    { header: 'Nguồn gốc', accessor: 'ref_type', render: (r) => {
      if (r.ref_type === 'order') return <span className="text-sm text-slate-500">Từ Đơn hàng (ID: {r.ref_id})</span>;
      if (r.ref_type === 'work_order') return <span className="text-sm text-slate-500">Từ Sản xuất</span>;
      if (r.ref_type === 'initial') return <span className="text-sm text-slate-500 italic">Tồn kho ban đầu</span>;
      return <span className="text-sm text-slate-500">Nhập tay</span>;
    }}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lịch sử Kho</h1>
          <p className="text-slate-500 text-sm mt-1">Nhật ký Nhập / Xuất kho của toàn bộ hàng hóa.</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Tìm theo tên hoặc mã hàng..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>
      </div>

      {/* Bảng Dữ liệu */}
      <DataTable columns={columns} data={filteredLedger} loading={loading} />
      
      <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <p><b>Lưu ý:</b> Đây là sổ cái kho (Append-only). Mọi giao dịch đều được ghi nhận vĩnh viễn, không thể sửa hay xóa để đảm bảo tính minh bạch cho kiểm toán.</p>
      </div>
    </div>
  );
}