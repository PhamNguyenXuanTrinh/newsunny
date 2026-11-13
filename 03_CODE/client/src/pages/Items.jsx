import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Search, Plus, Edit2, X, Trash2, Package, Boxes, Box, RefreshCw, Save, Loader2, Activity, MapPin } from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY_FORM = { type:'product', barcode:'', name:'', unit:'m2', price_in:'', price_out:'', price_floor:'', min_stock:'', max_stock:'', spec_thickness:'', spec_width:'', spec_length:'', weight:'', location:'' };

export default function Items() {
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [refreshing,setRefreshing] = useState(false);
  const [search,setSearch] = useState('');
  const [filterType,setFilterType] = useState('all');
  const [isModalOpen,setIsModalOpen] = useState(false);
  const [currentItem,setCurrentItem] = useState(null);
  const [formData,setFormData] = useState(EMPTY_FORM);

  const fetchItems = async (manual=false) => {
    if(manual) setRefreshing(true);
    try {
      const res = await api.get('/items');
      setItems(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch(err) {
      console.error('Fetch items error:',err);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(()=>{
    let active=true;
    const timer=setTimeout(()=>{
      api.get('/items').then(res=>{if(active)setItems(Array.isArray(res.data?.data)?res.data.data:[]);}).catch(console.error).finally(()=>{if(active)setLoading(false);});
    },0);
    return()=>{active=false;clearTimeout(timer);};
  },[]);

  const stats=useMemo(()=>({
    total:items.length,
    products:items.filter(x=>x.type==='product').length,
    materials:items.filter(x=>x.type==='material').length,
    value:items.reduce((s,x)=>s+(Number(x.price_out)||0),0)
  }),[items]);

  const filteredItems=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return items.filter(x=>{
      const matchType=filterType==='all'||x.type===filterType;
      const matchSearch=!q||[x.code,x.name,x.barcode,x.location].some(v=>String(v||'').toLowerCase().includes(q));
      return matchType&&matchSearch;
    });
  },[items,search,filterType]);

  const money=n=>(Number(n)||0).toLocaleString('vi-VN');

  const handleAddNew=()=>{
    setCurrentItem(null); setFormData(EMPTY_FORM); setIsModalOpen(true);
  };

  const handleEdit=item=>{
    setCurrentItem(item);
    setFormData({
      type:item.type||'product', barcode:item.barcode||'', name:item.name||'', unit:item.unit||'m2',
      price_in:item.price_in??'', price_out:item.price_out??'', price_floor:item.price_floor??'',
      min_stock:item.min_stock??'', max_stock:item.max_stock??'', spec_thickness:item.spec_thickness??'',
      spec_width:item.spec_width??'', spec_length:item.spec_length??'', weight:item.weight??'', location:item.location||''
    });
    setIsModalOpen(true);
  };

  const closeModal=()=>{if(!saving){setIsModalOpen(false);setCurrentItem(null);}};

  const handleSave=async e=>{
    e.preventDefault();
    if(saving)return;
    setSaving(true);
    try{
      const payload={
        type:formData.type, barcode:formData.barcode.trim()||null, name:formData.name.trim(), unit:formData.unit.trim(),
        price_in:Number(formData.price_in)||0, price_out:Number(formData.price_out)||0, price_floor:Number(formData.price_floor)||0,
        min_stock:Number(formData.min_stock)||0, max_stock:Number(formData.max_stock)||0,
        spec_thickness:formData.spec_thickness?Number(formData.spec_thickness):null,
        spec_width:formData.spec_width?Number(formData.spec_width):null,
        spec_length:formData.spec_length?Number(formData.spec_length):null,
        weight:formData.weight?Number(formData.weight):null, location:formData.location.trim()||null
      };
      if(currentItem)await api.patch(`/items/${currentItem.id}`,payload);
      else await api.post('/items',payload);
      setIsModalOpen(false); setCurrentItem(null); setFormData(EMPTY_FORM); await fetchItems();
    }catch(err){alert('Lỗi: '+(err.response?.data?.error||err.message));}
    finally{setSaving(false);}
  };

  const handleDelete=async id=>{
    if(!window.confirm('Ngừng kinh doanh mặt hàng này?'))return;
    try{await api.delete(`/items/${id}`);await fetchItems();}
    catch(err){alert('Lỗi: '+(err.response?.data?.error||err.message));}
  };

  const columns=[
    {header:'Mã hàng',accessor:'code',render:r=><span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">{r.code}</span>},
    {header:'Tên hàng hóa',accessor:'name',render:r=><div><p className="font-semibold text-slate-800">{r.name}</p>{r.location&&<p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400"><MapPin size={10}/>{r.location}</p>}</div>},
    {header:'Phân loại',accessor:'type',render:r=><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${r.type==='product'?'bg-blue-50 text-blue-700':'bg-violet-50 text-violet-700'}`}>{r.type==='product'?'Thành phẩm':'Vật tư'}</span>},
    {header:'ĐVT',accessor:'unit'},
    {header:'Giá nhập',accessor:'price_in',render:r=>Number(r.price_in)>0?<span className="whitespace-nowrap font-semibold text-slate-600">{money(r.price_in)} đ</span>:'-'},
    {header:'Giá bán',accessor:'price_out',render:r=>Number(r.price_out)>0?<span className="whitespace-nowrap font-bold text-emerald-600">{money(r.price_out)} đ</span>:'-'},
    {header:'Thao tác',accessor:'id',render:r=><div className="flex gap-1"><button onClick={()=>handleEdit(r)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Edit2 size={15}/></button><button onClick={()=>handleDelete(r.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={15}/></button></div>}
  ];

  const cards=[
    ['Tổng hàng hóa',stats.total,Package,'bg-slate-100 text-slate-600'],
    ['Thành phẩm',stats.products,Box,'bg-blue-50 text-blue-600'],
    ['Vật tư',stats.materials,Boxes,'bg-violet-50 text-violet-600']
  ];

  return <div className="mx-auto w-full max-w-[1600px] animate-[pageIn_.4s_ease-out]">
    <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-blue-600"><Activity size={13}/> Kinh doanh & Kho</div><h1 className="text-xl font-black text-slate-900 md:text-2xl">Quản lý Hàng hóa</h1><p className="mt-1 text-xs text-slate-500">Quản lý vật tư, thành phẩm, giá bán và định mức tồn kho.</p></div>
      <button onClick={handleAddNew} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5"><Plus size={17}/> Thêm hàng hóa</button>
    </section>

    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map(([label,value,Icon,color],i)=><div key={label} style={{animationDelay:`${i*60}ms`}} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-[cardIn_.4s_ease-out_both] transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Icon size={20}/></div><div><p className="text-[10px] font-semibold text-slate-400">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p></div></div></div>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
        <div className="flex gap-2 overflow-x-auto">
          {[['all','Tất cả'],['product','Thành phẩm'],['material','Vật tư']].map(([v,label])=><button key={v} onClick={()=>setFilterType(v)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold transition ${filterType===v?'bg-slate-900 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label}</button>)}
        </div>
        <div className="flex gap-2"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm mã, tên, vị trí..." className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-blue-300 focus:bg-white sm:w-60"/></div><button onClick={()=>fetchItems(true)} className="flex h-9 items-center gap-2 rounded-xl border px-3 text-[11px] font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600"><RefreshCw size={14} className={refreshing?'animate-spin':''}/></button></div>
      </div>
      <div className="p-2"><DataTable columns={columns} data={filteredItems} loading={loading}/></div>
    </section>

    {isModalOpen&&<div onMouseDown={e=>e.target===e.currentTarget&&closeModal()} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-[800px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-[modalIn_.25s_ease-out]">
        <div className="flex items-center justify-between border-b p-5"><div><h3 className="font-bold text-slate-900">{currentItem?'Cập nhật hàng hóa':'Thêm hàng hóa mới'}</h3><p className="mt-1 text-[10px] text-slate-400">{currentItem?`Mã ${currentItem.code} · Không thể chỉnh sửa`:`Mã sẽ tự sinh theo loại: TPxxx hoặc VTxxx`}</p></div><button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500"><X size={18}/></button></div>

        <form onSubmit={handleSave} className="overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Field label="Phân loại *"><select value={formData.type} onChange={e=>setFormData({...formData,type:e.target.value})} className="item-input"><option value="product">Thành phẩm</option><option value="material">Vật tư</option></select></Field>
            <Field label="Đơn vị tính *"><input required value={formData.unit} onChange={e=>setFormData({...formData,unit:e.target.value})} className="item-input" placeholder="m2, kg..."/></Field>
            <div className="sm:col-span-2"><Field label="Tên hàng hóa *"><input required value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} className="item-input"/></Field></div>

            <Field label="Mã vạch"><input value={formData.barcode} onChange={e=>setFormData({...formData,barcode:e.target.value})} className="item-input"/></Field>
            <div className="sm:col-span-2 md:col-span-3"><Field label="Vị trí lưu kho"><input value={formData.location} onChange={e=>setFormData({...formData,location:e.target.value})} className="item-input" placeholder="VD: Kệ A1, Kho B"/></Field></div>

            <Field label="Giá nhập"><input type="number" min="0" value={formData.price_in} onChange={e=>setFormData({...formData,price_in:e.target.value})} className="item-input"/></Field>
            <Field label="Giá bán"><input type="number" min="0" value={formData.price_out} onChange={e=>setFormData({...formData,price_out:e.target.value})} className="item-input font-bold text-emerald-600"/></Field>
            <Field label="Giá sàn"><input type="number" min="0" value={formData.price_floor} onChange={e=>setFormData({...formData,price_floor:e.target.value})} className="item-input font-bold text-red-600"/></Field>
            <Field label="Trọng lượng (kg)"><input type="number" min="0" step="0.001" value={formData.weight} onChange={e=>setFormData({...formData,weight:e.target.value})} className="item-input"/></Field>

            <Field label="Tồn tối thiểu"><input type="number" min="0" step="0.1" value={formData.min_stock} onChange={e=>setFormData({...formData,min_stock:e.target.value})} className="item-input"/></Field>
            <Field label="Tồn tối đa"><input type="number" min="0" step="0.1" value={formData.max_stock} onChange={e=>setFormData({...formData,max_stock:e.target.value})} className="item-input"/></Field>
            <Field label="Độ dày"><input type="number" min="0" step="0.01" value={formData.spec_thickness} onChange={e=>setFormData({...formData,spec_thickness:e.target.value})} className="item-input"/></Field>
            <Field label="Chiều rộng"><input type="number" min="0" step="0.01" value={formData.spec_width} onChange={e=>setFormData({...formData,spec_width:e.target.value})} className="item-input"/></Field>
            <Field label="Chiều dài"><input type="number" min="0" step="0.01" value={formData.spec_length} onChange={e=>setFormData({...formData,spec_length:e.target.value})} className="item-input"/></Field>
          </div>

          {!currentItem&&<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-700">Không cần nhập mã. <b>Thành phẩm → TPxxx</b>, <b>Vật tư → VTxxx</b>. Backend tự tạo khi lưu.</div>}

          <div className="mt-6 flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row"><button type="button" onClick={closeModal} disabled={saving} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Hủy</button><button disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-lg disabled:opacity-50">{saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} {saving?'Đang lưu...':'Lưu hàng hóa'}</button></div>
        </form>
      </div>
    </div>}

    <style>{`
      @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
      .item-input{width:100%;height:42px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;color:#334155;outline:none;transition:.2s}
      .item-input:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
    `}</style>
  </div>;
}

function Field({label,children}) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>{children}</label>;
}