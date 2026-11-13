import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Plus, X, Upload, AlertTriangle, Target, TrendingUp, Search,
  CheckCircle2, Clock3, ListTodo, Activity, Sparkles, Send,
  Loader2, UserRound, CalendarDays, CircleDot, XCircle,
  Banknote, Eye, FileCheck2
} from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY = {
  title:'', assignee_id:'', task_type:'kpi', kpi_weight:10,
  revenue_value:0, start_date:'', due:''
};

const PERIODS = [
  {key:'day',label:'Hôm nay'},
  {key:'week',label:'Tuần này'},
  {key:'month',label:'Tháng này'},
  {key:'quarter',label:'Quý này'},
  {key:'year',label:'Năm nay'}
];

const money = n => Number(n || 0).toLocaleString('vi-VN') + ' đ';

export default function Tasks() {
  const [tasks,setTasks] = useState([]);
  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [userRole,setUserRole] = useState('');
  const [period,setPeriod] = useState('month');
  const [search,setSearch] = useState('');
  const [modal,setModal] = useState(false);
  const [evidenceModal,setEvidenceModal] = useState(false);
  const [detail,setDetail] = useState(null);
  const [currentTask,setCurrentTask] = useState(null);
  const [evidence,setEvidence] = useState('');
  const [form,setForm] = useState(EMPTY);
  const [popup,setPopup] = useState(null);

  const message = (type,title,text) => setPopup({type,title,text});

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(currentUser.role || '');

      const res = await api.get(`/tasks?period=${period}`);
      setTasks(Array.isArray(res.data?.data) ? res.data.data : []);

      if (['giam_doc','ke_toan','to_truong'].includes(currentUser.role)) {
        try {
          const userRes = await api.get('/users');
          setUsers(Array.isArray(userRes.data) ? userRes.data : userRes.data?.data || []);
        } catch {
          setUsers([]);
        }
      }
    } catch (err) {
      setTasks([]);
      message('error','Không tải được công việc',err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(),0);
    return () => clearTimeout(timer);
  },[period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(x =>
      [x.title,x.assignee_name,x.status,x.task_type]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
  },[tasks,search]);

  const stats = useMemo(() => {
    const done = tasks.filter(x => x.status === 'done').length;
    const late = tasks.filter(x =>
      x.status !== 'done' && x.due && new Date(x.due) < new Date()
    ).length;
    const revenue = tasks
      .filter(x => x.task_type === 'revenue')
      .reduce((s,x) => s + Number(x.revenue_value || 0),0);

    return {
      total:tasks.length,
      done,
      late,
      revenue,
      rate:tasks.length ? done / tasks.length * 100 : 0
    };
  },[tasks]);

  const change = (key,value) => setForm(x => ({...x,[key]:value}));

  const openCreate = () => {
    setForm({...EMPTY});
    setModal(true);
  };

  const saveTask = async e => {
    e.preventDefault();

    if (!form.assignee_id) {
      message('warning','Chưa chọn người nhận','Vui lòng chọn nhân viên nhận công việc.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        assignee_id:Number(form.assignee_id),
        kpi_weight:form.task_type === 'kpi' ? Number(form.kpi_weight) : 0,
        revenue_value:form.task_type === 'revenue' ? Number(form.revenue_value) : 0,
        start_date:form.start_date || null
      };

      await api.post('/tasks',payload);
      setModal(false);
      await fetchData();
      message('success','Giao việc thành công','Công việc mới đã được ghi nhận vào hệ thống.');
    } catch (err) {
      message('error','Không thể giao việc',err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEvidence = task => {
    setCurrentTask(task);
    setEvidence('');
    setEvidenceModal(true);
  };

  const submitEvidence = async e => {
    e.preventDefault();

    if (!evidence.trim()) {
      message('warning','Thiếu bằng chứng','Vui lòng nhập nội dung báo cáo hoặc đường dẫn bằng chứng.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/tasks/${currentTask.id}`,{
        status:'done',
        evidence:evidence.trim()
      });

      setEvidenceModal(false);
      setCurrentTask(null);
      setEvidence('');
      await fetchData();
      message('success','Đã hoàn thành công việc','Báo cáo và bằng chứng đã được gửi thành công.');
    } catch (err) {
      message('error','Không thể gửi báo cáo',err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const isLate = task =>
    task.status !== 'done' && task.due && new Date(task.due) < new Date();

  const statusBadge = task => {
    if (task.status === 'done')
      return <span className="status bg-emerald-50 text-emerald-700"><CheckCircle2 size={12}/> Hoàn thành</span>;

    if (isLate(task))
      return <span className="status bg-red-50 text-red-600"><AlertTriangle size={12}/> Trễ hạn</span>;

    if (task.status === 'doing')
      return <span className="status bg-blue-50 text-blue-700"><Activity size={12}/> Đang làm</span>;

    return <span className="status bg-slate-100 text-slate-600"><Clock3 size={12}/> Chờ làm</span>;
  };

  const columns = [
    {
      header:'Công việc',accessor:'title',
      render:r => (
        <button onClick={() => setDetail(r)} className="group flex min-w-[230px] items-center gap-3 text-left">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            r.task_type === 'revenue'
              ? 'bg-violet-50 text-violet-600'
              : 'bg-blue-50 text-blue-600'
          }`}>
            {r.task_type === 'revenue' ? <TrendingUp size={16}/> : <Target size={16}/>}
          </div>
          <div>
            <p className="font-bold text-slate-800 transition group-hover:text-blue-600">{r.title}</p>
            <p className="mt-0.5 text-[9px] text-slate-400">#{r.code || r.id}</p>
          </div>
        </button>
      )
    },
    {
      header:'Người nhận',accessor:'assignee_name',
      render:r => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <UserRound size={13}/>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {r.assignee_name || `ID ${r.assignee_id}`}
          </span>
        </div>
      )
    },
    {
      header:'Loại công việc',accessor:'task_type',
      render:r => r.task_type === 'revenue'
        ? <span className="status bg-violet-50 text-violet-700"><Banknote size={12}/> {money(r.revenue_value)}</span>
        : <span className="status bg-blue-50 text-blue-700"><Target size={12}/> KPI ×{r.kpi_weight}</span>
    },
    {
      header:'Hạn chót',accessor:'due',
      render:r => (
        <div className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${isLate(r) ? 'text-red-500' : 'text-slate-600'}`}>
          <CalendarDays size={13}/>
          {r.due ? new Date(r.due).toLocaleDateString('vi-VN') : '—'}
        </div>
      )
    },
    {
      header:'Trạng thái',accessor:'status',
      render:r => statusBadge(r)
    },
    {
      header:'Thao tác',accessor:'id',
      render:r => (
        <div className="flex gap-1">
          <button onClick={() => setDetail(r)} className="action-btn text-slate-500 hover:bg-slate-100" title="Chi tiết">
            <Eye size={15}/>
          </button>

          {r.status !== 'done' && (
            <button onClick={() => openEvidence(r)} className="action-btn text-blue-600 hover:bg-blue-50" title="Báo cáo hoàn thành">
              <Upload size={15}/>
            </button>
          )}
        </div>
      )
    }
  ];

  const cards = [
    {label:'Tổng công việc',value:stats.total,sub:'Trong kỳ đang chọn',icon:ListTodo,color:'bg-blue-50 text-blue-600'},
    {label:'Đã hoàn thành',value:stats.done,sub:`Tỷ lệ ${stats.rate.toFixed(1)}%`,icon:CheckCircle2,color:'bg-emerald-50 text-emerald-600'},
    {label:'Đang trễ hạn',value:stats.late,sub:'Cần ưu tiên xử lý',icon:AlertTriangle,color:'bg-rose-50 text-rose-600'},
    {label:'Giá trị doanh thu',value:money(stats.revenue),sub:'Từ việc loại doanh thu',icon:TrendingUp,color:'bg-violet-50 text-violet-600'}
  ];

  return (
    <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
            <Sparkles size={12}/> Hiệu suất & Công việc
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Công việc & KPI</h1>
          <p className="mt-1 text-xs text-slate-500">Theo dõi nhiệm vụ, tiến độ, KPI và công việc tạo doanh thu.</p>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative lg:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm công việc..." className="search-box"/>
          </div>

          <div className="overflow-x-auto">
            <div className="flex w-max rounded-xl bg-slate-100 p-1">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`period-btn ${period === p.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {['giam_doc','ke_toan','to_truong'].includes(userRole) && (
            <button onClick={openCreate} className="main-btn">
              <Plus size={16}/> Giao việc mới
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card,i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{animationDelay:`${i*70}ms`}} className="stat-card animate-[cardIn_.45s_ease-out_both]">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
                <Icon size={20}/>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400">{card.label}</p>
                <p className="truncate text-lg font-black text-slate-900">{card.value}</p>
                <p className="truncate text-[9px] text-slate-400">{card.sub}</p>
              </div>
              <div className="shine"/>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="flex items-center gap-2">
              <CircleDot size={16} className="text-blue-600"/>
              <b className="text-sm text-slate-800">Danh sách công việc</b>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Hiển thị {filtered.length}/{tasks.length} công việc
            </p>
          </div>

          <div className="hidden rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 sm:block">
            {stats.rate.toFixed(1)}% hoàn thành
          </div>
        </div>

        <div className="p-2">
          <DataTable columns={columns} data={filtered} loading={loading}/>
        </div>
      </div>

      {modal && (
        <Modal wide close={() => !saving && setModal(false)}>
          <div className="modal-top">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <ListTodo size={19}/>
              </div>
              <div>
                <h3 className="font-black text-white">Giao việc mới</h3>
                <p className="text-[10px] text-blue-100">Thiết lập nhiệm vụ và mục tiêu</p>
              </div>
            </div>
            <button onClick={() => setModal(false)} className="close-btn"><X size={18}/></button>
          </div>

          <form onSubmit={saveTask} className="max-h-[78vh] overflow-y-auto p-5">
            <Field label="Tên công việc *">
              <input
                required
                value={form.title}
                onChange={e => change('title',e.target.value)}
                className="input"
                placeholder="VD: Kiểm tra máy dệt, thu nợ khách hàng..."
              />
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Người nhận *">
                <select required value={form.assignee_id} onChange={e => change('assignee_id',e.target.value)} className="input">
                  <option value="">-- Chọn --</option>
                  {users.filter(u => u.role !== 'giam_doc').map(u =>
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  )}
                </select>
              </Field>

              <Field label="Ngày bắt đầu">
                <input type="date" value={form.start_date} onChange={e => change('start_date',e.target.value)} className="input"/>
              </Field>

              <Field label="Hạn chót *">
                <input required type="date" value={form.due} onChange={e => change('due',e.target.value)} className="input"/>
              </Field>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="mb-3 text-[11px] font-black text-blue-900">Loại công việc</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => change('task_type','kpi')}
                  className={`task-type ${form.task_type === 'kpi' ? 'border-blue-500 bg-white shadow-sm' : 'border-transparent'}`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Target size={17}/></div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800">Công việc KPI</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">Đánh giá năng suất, lương thưởng</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => change('task_type','revenue')}
                  className={`task-type ${form.task_type === 'revenue' ? 'border-emerald-500 bg-white shadow-sm' : 'border-transparent'}`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp size={17}/></div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800">Công việc doanh thu</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">Thu nợ, chốt đơn, tạo doanh thu</p>
                  </div>
                </button>
              </div>

              <div className="mt-4 border-t border-blue-100 pt-4">
                {form.task_type === 'kpi' ? (
                  <Field label="Trọng số KPI *">
                    <select value={form.kpi_weight} onChange={e => change('kpi_weight',e.target.value)} className="input bg-white">
                      <option value="1">1 - Việc phụ</option>
                      <option value="5">5 - Việc bình thường</option>
                      <option value="10">10 - Việc quan trọng</option>
                      <option value="20">20 - Việc cực kỳ quan trọng</option>
                    </select>
                  </Field>
                ) : (
                  <Field label="Doanh thu dự kiến (VNĐ) *">
                    <input
                      required
                      type="number"
                      min="0"
                      step="100000"
                      value={form.revenue_value}
                      onChange={e => change('revenue_value',e.target.value)}
                      className="input bg-white font-black text-emerald-600"
                    />
                  </Field>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal(false)} className="cancel-btn">Hủy</button>
              <button disabled={saving} className="main-btn disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
                Giao việc
              </button>
            </div>
          </form>
        </Modal>
      )}

      {evidenceModal && currentTask && (
        <Modal close={() => !saving && setEvidenceModal(false)}>
          <div className="modal-top">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><FileCheck2 size={19}/></div>
              <div>
                <h3 className="font-black text-white">Báo cáo hoàn thành</h3>
                <p className="max-w-[280px] truncate text-[10px] text-blue-100">{currentTask.title}</p>
              </div>
            </div>
            <button onClick={() => setEvidenceModal(false)} className="close-btn"><X size={18}/></button>
          </div>

          <form onSubmit={submitEvidence} className="p-5">
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={17}/>
                <p className="text-xs font-black">Xác nhận hoàn thành công việc</p>
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-emerald-700/70">
                Nhập kết quả thực hiện, ghi chú hoặc đường dẫn bằng chứng.
              </p>
            </div>

            <Field label="Bằng chứng hoàn thành *">
              <textarea
                required
                rows="6"
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                className="textarea"
                placeholder="VD: Đã hoàn thành kiểm tra. Link ảnh/tài liệu: ..."
              />
            </Field>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setEvidenceModal(false)} className="cancel-btn">Hủy</button>
              <button disabled={saving} className="success-btn disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>}
                Gửi báo cáo
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal wide close={() => setDetail(null)}>
          <div className="modal-top">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                {detail.task_type === 'revenue' ? <TrendingUp size={19}/> : <Target size={19}/>}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-100">Chi tiết công việc</p>
                <h3 className="truncate font-black text-white">{detail.title}</h3>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="close-btn"><X size={18}/></button>
          </div>

          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={UserRound} title="Người thực hiện" value={detail.assignee_name || `ID ${detail.assignee_id}`}/>
              <Info icon={CalendarDays} title="Hạn hoàn thành" value={detail.due ? new Date(detail.due).toLocaleDateString('vi-VN') : '—'}/>
              <Info icon={Activity} title="Trạng thái" value={detail.status === 'done' ? 'Hoàn thành' : isLate(detail) ? 'Trễ hạn' : detail.status === 'doing' ? 'Đang làm' : 'Chờ làm'}/>
              <Info icon={detail.task_type === 'revenue' ? Banknote : Target} title={detail.task_type === 'revenue' ? 'Doanh thu dự kiến' : 'Trọng số KPI'} value={detail.task_type === 'revenue' ? money(detail.revenue_value) : `×${detail.kpi_weight}`}/>
            </div>

            {detail.evidence && (
              <div className="mt-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Bằng chứng hoàn thành</p>
                <div className="whitespace-pre-wrap rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs leading-5 text-slate-700">
                  {detail.evidence}
                </div>
              </div>
            )}

            <button onClick={() => setDetail(null)} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600">
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'success'
              ? <div className="popup-icon bg-emerald-50 text-emerald-500"><CheckCircle2 size={30}/></div>
              : popup.type === 'warning'
                ? <div className="popup-icon bg-amber-50 text-amber-500"><AlertTriangle size={30}/></div>
                : <div className="popup-icon bg-red-50 text-red-500"><XCircle size={30}/></div>
            }
            <h3 className="mt-4 text-lg font-black text-slate-900">{popup.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{popup.text}</p>
            <button onClick={() => setPopup(null)} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600">
              Đã hiểu
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes cardIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
        .stat-card{position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:16px;box-shadow:0 5px 20px rgba(15,23,42,.04);transition:.3s}
        .stat-card:hover{transform:translateY(-4px);border-color:#dbeafe;box-shadow:0 18px 40px rgba(15,23,42,.09)}
        .shine{position:absolute;right:-25px;top:-25px;width:75px;height:75px;border-radius:999px;background:linear-gradient(135deg,rgba(59,130,246,.1),transparent);transition:.4s}
        .stat-card:hover .shine{transform:scale(1.5)}
        .main-btn,.success-btn{display:flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:12px;padding:0 17px;font-size:12px;font-weight:800;color:#fff;transition:.25s}
        .main-btn{background:linear-gradient(100deg,#2563eb,#4f46e5);box-shadow:0 8px 22px rgba(37,99,235,.22)}
        .success-btn{background:linear-gradient(100deg,#059669,#10b981);box-shadow:0 8px 22px rgba(5,150,105,.2)}
        .main-btn:hover,.success-btn:hover{transform:translateY(-2px)}
        .search-box,.input,.textarea{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-size:12px;outline:none;transition:.2s}
        .search-box{height:40px;padding:0 12px 0 34px}.input{height:42px;padding:0 12px}.textarea{padding:12px;resize:vertical;line-height:1.6}
        .search-box:focus,.input:focus,.textarea:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
        .period-btn{border-radius:9px;padding:6px 10px;font-size:10px;font-weight:800;white-space:nowrap;transition:.2s}
        .status{display:inline-flex;width:max-content;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:9px;font-weight:900;white-space:nowrap}
        .action-btn{display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:10px;transition:.2s}.action-btn:hover{transform:scale(1.08)}
        .task-type{display:flex;align-items:center;gap:10px;border-width:2px;border-radius:14px;padding:10px;transition:.2s}.task-type:hover{background:#fff}
        .cancel-btn{height:40px;border-radius:12px;background:#f1f5f9;padding:0 20px;font-size:12px;font-weight:700;color:#475569;transition:.2s}.cancel-btn:hover{background:#e2e8f0}
        .modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:12px;backdrop-filter:blur(7px)}
        .modal-box{width:100%;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
        .modal-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#2563eb,#4f46e5,#6366f1);padding:17px 20px}
        .close-btn{border-radius:12px;background:rgba(255,255,255,.1);padding:8px;color:rgba(255,255,255,.8);transition:.2s}.close-btn:hover{transform:rotate(90deg);background:rgba(255,255,255,.2)}
        .popup-icon{margin:auto;display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:22px;animation:modalIn .35s ease-out}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}

function Modal({children,close,wide=false}) {
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && close?.()}>
      <div className={`modal-box ${wide ? 'max-w-[650px]' : 'max-w-[440px]'}`}>{children}</div>
    </div>
  );
}

function Field({label,children}) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>{children}</label>;
}

function Info({icon:Icon,title,value}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon size={15}/></div>
      <div className="min-w-0"><p className="text-[9px] font-semibold text-slate-400">{title}</p><p className="truncate text-xs font-black text-slate-700">{value}</p></div>
    </div>
  );
}