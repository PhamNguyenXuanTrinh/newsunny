import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, X, CheckCircle, DollarSign, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'sale', partner_id: '', items: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resOrders, resPartners, resItems] = await Promise.all([
        api.get('/orders'),
        api.get('/partners'),
        api.get('/items')
      ]);
      setOrders(resOrders.data.data);
      setPartners(resPartners.data.data);
      setItems(resItems.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleAddItemRow = () => {
    setFormData({ ...formData, items: [...formData.items, { item_id: '', qty: 1, unit_price: 0 }] });
  };

  const handleRemoveItemRow = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    if (field === 'item_id') {
      const selectedItem = items.find(i => i.id === Number(value));
      if (selectedItem) newItems[index].unit_price = formData.type === 'sale' ? selectedItem.price_out : selectedItem.price_in;
    }
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => formData.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        partner_id: Number(formData.partner_id),
        items: formData.items.map(i => ({ item_id: Number(i.item_id), qty: Number(i.qty), unit_price: Number(i.unit_price) }))
      };
      await api.post('/orders', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Duyệt đơn hàng này? Hệ thống sẽ tự động trừ kho.')) return;
    try {
      await api.post(`/orders/${id}/approve`);
      fetchData();
    } catch (err) { alert('Không thể duyệt: ' + (err.response?.data?.error || err.message)); }
  };

  const handlePayment = async (id, remaining) => {
    const amount = window.prompt(`Nhập số tiền thu (Còn nợ: ${remaining.toLocaleString()} đ):`, remaining);
    if (!amount || isNaN(amount)) return;
    try {
      await api.post(`/orders/${id}/payments`, { amount: Number(amount), method: 'transfer' });
      alert('Đã thu tiền thành công!');
      fetchData();
    } catch (err) { alert('Lỗi thu tiền: ' + (err.response?.data?.error || err.message)); }
  };

  const columns = [
    { header: 'Mã Đơn', accessor: 'code', render: (r) => <span className="font-bold text-blue-600">{r.code}</span> },
    { header: 'Loại', accessor: 'type', render: (r) => <span className={`px-2 py-1 rounded-md text-xs font-semibold ${r.type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.type === 'sale' ? 'Bán hàng' : 'Nhập hàng'}</span> },
    { header: 'Khách/NCC', accessor: 'partner_id' },
    { header: 'Tổng tiền', accessor: 'total', render: (r) => <span className="font-semibold text-slate-800">{r.total.toLocaleString()} đ</span> },
    { header: 'Thanh toán', accessor: 'payment_status', render: (r) => <span className={`font-semibold ${r.payment_status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>{r.payment_status === 'paid' ? 'Đã trả đủ' : r.payment_status === 'partial' ? 'Cọc 1 phần' : 'Chưa trả'}</span> },
    { header: 'Trạng thái', accessor: 'status', render: (r) => <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold uppercase">{r.status}</span> },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        {r.status === 'draft' && <button onClick={() => handleApprove(r.id)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded" title="Duyệt đơn"><CheckCircle size={18} /></button>}
        {r.payment_status !== 'paid' && r.type === 'sale' && <button onClick={() => handlePayment(r.id, r.total - r.paid_amount)} className="text-blue-600 hover:bg-blue-50 p-2 rounded" title="Thu tiền"><DollarSign size={18} /></button>}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h1>
        <button onClick={() => { setFormData({ type: 'sale', partner_id: '', items: [] }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"><Plus size={18} /> Tạo đơn hàng</button>
      </div>

      <DataTable columns={columns} data={orders} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center sticky top-0">
              <h3 className="font-bold text-lg text-slate-800">Tạo Đơn Hàng Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Loại đơn</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="sale">Đơn Bán Hàng</option><option value="purchase">Đơn Nhập Hàng</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Chọn Khách / NCC *</label><select required value={formData.partner_id} onChange={e => setFormData({...formData, partner_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">-- Chọn --</option>{partners.filter(p => p.type === (formData.type === 'sale' ? 'customer' : 'supplier')).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div className="border rounded-lg p-4 mt-4 bg-slate-50">
                <div className="flex justify-between items-center mb-2"><h4 className="font-semibold text-slate-700">Sản phẩm</h4><button type="button" onClick={handleAddItemRow} className="text-sm text-blue-600 font-medium flex items-center gap-1"><Plus size={14}/> Thêm dòng</button></div>
                {formData.items.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-end mb-2">
                    <div className="flex-1"><label className="text-xs mb-1 block">Sản phẩm</label><select required value={row.item_id} onChange={e => handleItemChange(idx, 'item_id', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm"><option value="">-- Chọn --</option>{items.filter(i => i.type === (formData.type === 'sale' ? 'product' : 'material')).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                    <div className="w-20"><label className="text-xs mb-1 block">SL</label><input type="number" min="1" required value={row.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
                    <div className="w-28"><label className="text-xs mb-1 block">Đơn giá</label><input type="number" required value={row.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm" /></div>
                    <button type="button" onClick={() => handleRemoveItemRow(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded mb-0.5"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t"><p className="text-lg font-bold">Tổng: <span className="text-blue-600">{calculateTotal().toLocaleString()} đ</span></p><button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-md">Lưu Đơn</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

