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
    // Giữ nguyên setTimeout để tránh lỗi cảnh báo setState trong React 18
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
    { header: 'Mã Đơn', accessor: 'code', render: (r) => <span className="font-bold text-blue-600 whitespace-nowrap">{r.code}</span> },
    { header: 'Loại', accessor: 'type', render: (r) => <span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${r.type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.type === 'sale' ? 'Bán hàng' : 'Nhập hàng'}</span> },
    { header: 'Khách/NCC', accessor: 'partner_id', render: (r) => <span className="whitespace-nowrap">{r.partner_id}</span> },
    { header: 'Tổng tiền', accessor: 'total', render: (r) => <span className="font-semibold text-slate-800 whitespace-nowrap">{r.total.toLocaleString()} đ</span> },
    { header: 'Thanh toán', accessor: 'payment_status', render: (r) => <span className={`font-semibold whitespace-nowrap ${r.payment_status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>{r.payment_status === 'paid' ? 'Đã trả đủ' : r.payment_status === 'partial' ? 'Cọc 1 phần' : 'Chưa trả'}</span> },
    { header: 'Trạng thái', accessor: 'status', render: (r) => <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold uppercase whitespace-nowrap">{r.status}</span> },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        {r.status === 'draft' && <button onClick={() => handleApprove(r.id)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded" title="Duyệt đơn"><CheckCircle size={18} /></button>}
        {r.payment_status !== 'paid' && r.type === 'sale' && <button onClick={() => handlePayment(r.id, r.total - r.paid_amount)} className="text-blue-600 hover:bg-blue-50 p-2 rounded" title="Thu tiền"><DollarSign size={18} /></button>}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h1>
        <button 
          onClick={() => { setFormData({ type: 'sale', partner_id: '', items: [] }); setIsModalOpen(true); }} 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm w-full sm:w-auto shrink-0"
        >
          <Plus size={18} /> Tạo đơn hàng
        </button>
      </div>

      <DataTable columns={columns} data={orders} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Modal: Mobile full width, Desktop 700px. Dùng flex-col để ghim header */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-800">Tạo Đơn Hàng Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1"><X size={20} /></button>
            </div>
            
            {/* Thanh cuộn áp dụng cho phần thân form */}
            <form onSubmit={handleSaveOrder} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* Grid: Mobile 1 cột, Desktop 2 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại đơn</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="sale">Đơn Bán Hàng</option>
                    <option value="purchase">Đơn Nhập Hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chọn Khách / NCC *</label>
                  <select required value={formData.partner_id} onChange={e => setFormData({...formData, partner_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Chọn --</option>
                    {partners.filter(p => p.type === (formData.type === 'sale' ? 'customer' : 'supplier')).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* KHỐI SẢN PHẨM */}
              <div className="border rounded-lg p-3 sm:p-4 mt-4 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-700">Sản phẩm</h4>
                  <button type="button" onClick={handleAddItemRow} className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition">
                    <Plus size={14}/> Thêm dòng
                  </button>
                </div>
                
                {formData.items.length === 0 && (
                  <p className="text-sm text-slate-500 italic text-center py-2">Chưa có sản phẩm nào. Bấm "Thêm dòng" để chọn.</p>
                )}

                {formData.items.map((row, idx) => (
                  // Mỗi dòng sản phẩm: Mobile xếp dọc, Desktop xếp ngang
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-end mb-4 sm:mb-2 p-3 sm:p-0 bg-white sm:bg-transparent rounded-lg border sm:border-0 shadow-sm sm:shadow-none">
                    
                    {/* Chọn sản phẩm (Full width) */}
                    <div className="flex-1">
                      <label className="text-xs mb-1 block font-medium text-slate-600">Sản phẩm</label>
                      <select required value={row.item_id} onChange={e => handleItemChange(idx, 'item_id', e.target.value)} className="w-full px-2 py-2 sm:py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Chọn --</option>
                        {items.filter(i => i.type === (formData.type === 'sale' ? 'product' : 'material')).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    
                    {/* Cụm SL + Đơn giá (Ngang hàng trên mobile) */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 sm:w-20 shrink-0">
                        <label className="text-xs mb-1 block font-medium text-slate-600">SL</label>
                        <input type="number" min="1" required value={row.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} className="w-full px-2 py-2 sm:py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex-1 sm:w-28 shrink-0">
                        <label className="text-xs mb-1 block font-medium text-slate-600">Đơn giá</label>
                        <input type="number" required value={row.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} className="w-full px-2 py-2 sm:py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                      
                      {/* Nút xóa (Nằm bên phải SL + Giá) */}
                      <button type="button" onClick={() => handleRemoveItemRow(idx)} className="text-red-500 hover:bg-red-100 bg-red-50 p-2 rounded mb-0.5 sm:mb-0 transition shrink-0">
                        <Trash2 size={16}/>
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* TỔNG TIỀN & NÚT LƯU */}
              <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-4 border-t gap-4">
                <p className="text-lg font-bold w-full sm:w-auto text-center sm:text-left">
                  Tổng: <span className="text-blue-600">{calculateTotal().toLocaleString()} đ</span>
                </p>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 w-full sm:w-auto font-bold">
                  Lưu Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}