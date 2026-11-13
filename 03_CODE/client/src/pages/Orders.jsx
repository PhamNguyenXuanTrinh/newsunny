import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Plus, X, CheckCircle, DollarSign, Trash2, Search, RefreshCw,
  ShoppingCart, Package, Wallet, Clock3, Loader2, Save,
  ReceiptText, AlertTriangle, CheckCircle2, XCircle, Eye,
  User, MapPin, CalendarDays, CreditCard
} from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY = {
  type: 'sale',
  partner_id: '',
  items: [],
  discount: '',
  tax_amount: '',
  shipping_fee: '',
  delivery_address: '',
  due_date: '',
  note: '',
  require_full_payment: false
};

const money = (n) => Number(n || 0).toLocaleString('vi-VN');
const formatDate = (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '—';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [popup, setPopup] = useState(null);
  const [confirmBox, setConfirmBox] = useState(null);

  const [form, setForm] = useState(EMPTY);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('transfer');
  const [payNote, setPayNote] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const showPopup = (type, title, message) => {
    setPopup({ type, title, message });
  };

  const getPartner = (id) =>
    partners.find((p) => Number(p.id) === Number(id));

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const [orderRes, partnerRes, itemRes] = await Promise.all([
        api.get('/orders'),
        api.get('/partners'),
        api.get('/items')
      ]);

      setOrders(Array.isArray(orderRes.data?.data) ? orderRes.data.data : []);
      setPartners(Array.isArray(partnerRes.data?.data) ? partnerRes.data.data : []);
      setItems(Array.isArray(itemRes.data?.data) ? itemRes.data.data : []);
    } catch (e) {
      showPopup(
        'error',
        'Không tải được dữ liệu',
        e.response?.data?.error || e.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

useEffect(() => {
  const load = async () => {
    await fetchData();
  };

  load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const subTotal = useMemo(() => {
    return form.items.reduce((sum, row) => {
      return sum + Number(row.qty || 0) * Number(row.unit_price || 0);
    }, 0);
  }, [form.items]);

  const finalTotal = Math.max(
    0,
    subTotal -
      Number(form.discount || 0) +
      Number(form.tax_amount || 0) +
      Number(form.shipping_fee || 0)
  );

  const stats = useMemo(() => ({
    total: orders.length,
    sale: orders.filter((x) => x.type === 'sale').length,
    pending: orders.filter((x) =>
      ['draft', 'pending'].includes(x.status)
    ).length,
    debt: orders
      .filter((x) => x.type === 'sale')
      .reduce((sum, x) => {
        return sum + Math.max(
          0,
          Number(x.total || 0) - Number(x.paid_amount || 0)
        );
      }, 0)
  }), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const p = getPartner(order.partner_id);

      const matchType =
        typeFilter === 'all' || order.type === typeFilter;

      const matchStatus =
        statusFilter === 'all' || order.status === statusFilter;

      const matchSearch =
        !q ||
        [
          order.code,
          order.partner_name,
          p?.code,
          p?.name,
          order.status
        ].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );

      return matchType && matchStatus && matchSearch;
    });
  }, [orders, partners, search, typeFilter, statusFilter]);

  const addRow = () => {
    setForm((old) => ({
      ...old,
      items: [
        ...old.items,
        { item_id: '', qty: 1, unit_price: 0 }
      ]
    }));
  };

  const removeRow = (index) => {
    setForm((old) => ({
      ...old,
      items: old.items.filter((_, i) => i !== index)
    }));
  };

  const changeRow = (index, key, value) => {
    setForm((old) => {
      const rows = [...old.items];
      rows[index] = { ...rows[index], [key]: value };

      if (key === 'item_id') {
        const selected = items.find(
          (item) => Number(item.id) === Number(value)
        );

        if (selected) {
          rows[index].unit_price =
            old.type === 'sale'
              ? Number(selected.price_out || 0)
              : Number(selected.price_in || 0);
        }
      }

      return { ...old, items: rows };
    });
  };

  const changeType = (type) => {
    setForm((old) => ({
      ...old,
      type,
      partner_id: '',
      items: []
    }));
  };

  const saveOrder = async (e) => {
    e.preventDefault();

    if (!form.partner_id) {
      return showPopup(
        'warning',
        'Chưa chọn đối tác',
        form.type === 'sale'
          ? 'Vui lòng chọn khách hàng.'
          : 'Vui lòng chọn nhà cung cấp.'
      );
    }

    if (!form.items.length) {
      return showPopup(
        'warning',
        'Thiếu sản phẩm',
        'Vui lòng thêm ít nhất một sản phẩm hoặc vật tư.'
      );
    }

    if (form.items.some((x) => !x.item_id || Number(x.qty) <= 0)) {
      return showPopup(
        'warning',
        'Dữ liệu chưa hợp lệ',
        'Kiểm tra lại sản phẩm và số lượng.'
      );
    }

    setSaving(true);

    try {
      await api.post('/orders', {
        ...form,
        partner_id: Number(form.partner_id),
        items: form.items.map((x) => ({
          item_id: Number(x.item_id),
          qty: Number(x.qty),
          unit_price: Number(x.unit_price)
        })),
        discount: Number(form.discount || 0),
        tax_amount: Number(form.tax_amount || 0),
        shipping_fee: Number(form.shipping_fee || 0),
        due_date: form.due_date || null
      });

      setCreateModal(false);
      setForm(EMPTY);
      await fetchData();

      showPopup(
        'success',
        'Tạo đơn thành công',
        'Đơn hàng đã được lưu vào hệ thống.'
      );
    } catch (e) {
      showPopup(
        'error',
        'Không thể tạo đơn',
        e.response?.data?.error || e.message
      );
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (order) => {
    setDetailLoading(true);
    setDetail({ code: order.code });

    try {
      const res = await api.get(`/orders/${order.id}`);
      setDetail(res.data?.data || null);
    } catch (e) {
      setDetail(null);

      showPopup(
        'error',
        'Không xem được chi tiết',
        e.response?.data?.error || e.message
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const askApprove = (order) => {
    setConfirmBox({
      title: 'Duyệt đơn hàng?',
      message: `Bạn muốn duyệt đơn ${order.code}? Hệ thống sẽ cập nhật tồn kho.`,
      order
    });
  };

  const approveOrder = async () => {
    if (!confirmBox?.order) return;

    const order = confirmBox.order;
    setConfirmBox(null);
    setSaving(true);

    try {
      await api.post(`/orders/${order.id}/approve`);
      setDetail(null);
      await fetchData();

      showPopup(
        'success',
        'Duyệt thành công',
        `Đơn ${order.code} đã được duyệt và cập nhật kho.`
      );
    } catch (e) {
      showPopup(
        'error',
        'Không thể duyệt đơn',
        e.response?.data?.error || e.message
      );
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (order) => {
    const remaining = Math.max(
      0,
      Number(order.total || 0) - Number(order.paid_amount || 0)
    );

    setDetail(null);
    setPayModal(order);
    setPayAmount(remaining);
    setPayMethod('transfer');
    setPayNote('');
  };

  const submitPayment = async (e) => {
    e.preventDefault();

    if (!payModal) return;

    const remaining = Math.max(
      0,
      Number(payModal.total || 0) -
        Number(payModal.paid_amount || 0)
    );

    const amount = Number(payAmount);

    if (amount <= 0 || amount > remaining) {
      return showPopup(
        'warning',
        'Số tiền không hợp lệ',
        `Số tiền tối đa có thể thu là ${money(remaining)} đ.`
      );
    }

    setSaving(true);

    try {
      const code = payModal.code;

      await api.post(`/orders/${payModal.id}/payments`, {
        amount,
        method: payMethod,
        note: payNote || null
      });

      setPayModal(null);
      await fetchData();

      showPopup(
        'success',
        'Thu tiền thành công',
        `Đã thu ${money(amount)} đ cho đơn ${code}.`
      );
    } catch (e) {
      showPopup(
        'error',
        'Không thể thu tiền',
        e.response?.data?.error || e.message
      );
    } finally {
      setSaving(false);
    }
  };

  const statusText = (status) => ({
    draft: 'Nháp',
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    delivered: 'Đã giao',
    done: 'Hoàn tất',
    cancelled: 'Đã hủy'
  }[status] || status);

  const statusClass = (status) => ({
    draft: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    delivered: 'bg-violet-50 text-violet-700',
    done: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-600'
  }[status] || 'bg-slate-100 text-slate-600');

  const columns = [
    {
      header: 'Mã đơn',
      accessor: 'code',
      render: (r) => (
        <div>
          <b className="text-blue-600">{r.code}</b>
          <p className="text-[10px] text-slate-400">#{r.id}</p>
        </div>
      )
    },
    {
      header: 'Loại',
      accessor: 'type',
      render: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
          r.type === 'sale'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {r.type === 'sale' ? 'Bán hàng' : 'Nhập hàng'}
        </span>
      )
    },
    {
      header: 'Khách hàng / NCC',
      accessor: 'partner_id',
      render: (r) => {
        const p = getPartner(r.partner_id);

        return (
          <div>
            <b className="text-xs">
              {r.partner_name || p?.name || `ID ${r.partner_id}`}
            </b>
            <p className="text-[10px] text-slate-400">
              {p?.code || '—'}
            </p>
          </div>
        );
      }
    },
    {
      header: 'Tổng tiền',
      accessor: 'total',
      render: (r) => (
        <div>
          <b className="text-xs">{money(r.total)} đ</b>
          {r.type === 'sale' && (
            <p className="text-[10px] text-slate-400">
              Đã thu: {money(r.paid_amount)} đ
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Thanh toán',
      accessor: 'payment_status',
      render: (r) => (
        <b className={`text-[11px] ${
          r.payment_status === 'paid'
            ? 'text-emerald-600'
            : r.payment_status === 'partial'
              ? 'text-amber-600'
              : 'text-red-500'
        }`}>
          {r.payment_status === 'paid'
            ? 'Đã trả đủ'
            : r.payment_status === 'partial'
              ? 'Một phần'
              : 'Chưa thanh toán'}
        </b>
      )
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(r.status)}`}>
          {statusText(r.status)}
        </span>
      )
    },
    {
      header: 'Thao tác',
      accessor: 'id',
      render: (r) => (
        <div className="flex gap-1">
          <button
            onClick={() => openDetail(r)}
            title="Chi tiết đơn"
            className="act text-violet-600 hover:bg-violet-50"
          >
            <Eye size={16} />
          </button>

          {r.status === 'draft' && (
            <button
              onClick={() => askApprove(r)}
              title="Duyệt đơn"
              className="act text-emerald-600 hover:bg-emerald-50"
            >
              <CheckCircle size={16} />
            </button>
          )}

          {r.type === 'sale' && r.payment_status !== 'paid' && (
            <button
              onClick={() => openPayment(r)}
              title="Thu tiền"
              className="act text-blue-600 hover:bg-blue-50"
            >
              <DollarSign size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  const statCards = [
    {
      label: 'Tổng đơn hàng',
      value: stats.total,
      icon: ShoppingCart,
      cls: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Đơn bán hàng',
      value: stats.sale,
      icon: ReceiptText,
      cls: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: 'Chờ xử lý',
      value: stats.pending,
      icon: Clock3,
      cls: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'Công nợ phải thu',
      value: `${money(stats.debt)} đ`,
      icon: Wallet,
      cls: 'bg-violet-50 text-violet-600'
    }
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] animate-[pageIn_.4s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-blue-600">
            <Package size={13} /> Kinh doanh & Kho
          </p>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl">
            Quản lý Đơn hàng
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Tạo, thanh toán, duyệt và xem chi tiết đơn hàng.
          </p>
        </div>

        <button
          onClick={() => {
            setForm(EMPTY);
            setCreateModal(true);
          }}
          className="btn-main"
        >
          <Plus size={17} /> Tạo đơn hàng
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.cls}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400">
                    {card.label}
                  </p>
                  <p className="truncate text-lg font-black">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b p-4 xl:flex-row xl:items-center">
          <div>
            <b className="text-sm">Danh sách đơn hàng</b>
            <p className="text-[10px] text-slate-400">
              {filtered.length} / {orders.length} đơn
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="control"
            >
              <option value="all">Tất cả loại</option>
              <option value="sale">Bán hàng</option>
              <option value="purchase">Nhập hàng</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="control"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="delivered">Đã giao</option>
              <option value="done">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm đơn hàng..."
                className="search"
              />
            </div>

            <button
              onClick={() => fetchData(true)}
              className="act border"
              title="Làm mới"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>

        <div className="p-2">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
          />
        </div>
      </div>

      {detail && (
        <Modal
          wide
          close={() => {
            if (!detailLoading) setDetail(null);
          }}
        >
          <div className="modal-head">
            <div>
              <b>Chi tiết đơn hàng {detail.code}</b>
              <p>Thông tin đầy đủ của đơn hàng</p>
            </div>
            <button onClick={() => setDetail(null)}>
              <X size={18} />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="max-h-[80vh] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoBox
                  icon={User}
                  label={detail.type === 'sale' ? 'Khách hàng' : 'Nhà cung cấp'}
                  value={detail.partner_name}
                  sub={detail.partner_code}
                />

                <InfoBox
                  icon={CalendarDays}
                  label="Ngày tạo"
                  value={formatDate(detail.created_at)}
                  sub={`Người tạo: ${detail.creator_name || '—'}`}
                />

                <InfoBox
                  icon={CreditCard}
                  label="Thanh toán"
                  value={
                    detail.payment_status === 'paid'
                      ? 'Đã thanh toán'
                      : detail.payment_status === 'partial'
                        ? 'Thanh toán một phần'
                        : 'Chưa thanh toán'
                  }
                  sub={`Đã thu ${money(detail.paid_amount)} đ`}
                />

                <InfoBox
                  icon={MapPin}
                  label="Giao hàng"
                  value={detail.delivery_address || 'Chưa có địa chỉ'}
                  sub={
                    detail.due_date
                      ? `Hạn: ${formatDate(detail.due_date)}`
                      : 'Không có hạn'
                  }
                />
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border">
                <div className="bg-slate-50 px-4 py-3 text-xs font-bold">
                  Sản phẩm / vật tư ({detail.items?.length || 0})
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-[10px] text-slate-400">
                        <th className="p-3">Sản phẩm</th>
                        <th className="p-3 text-right">SL</th>
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>

                    <tbody>
                      {detail.items?.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-0"
                        >
                          <td className="p-3">
                            <b>{item.item_name}</b>
                            <p className="text-[10px] text-slate-400">
                              {item.item_code} · {item.unit}
                            </p>
                          </td>

                          <td className="p-3 text-right">
                            {money(item.qty)}
                          </td>

                          <td className="p-3 text-right">
                            {money(item.unit_price)} đ
                          </td>

                          <td className="p-3 text-right font-bold">
                            {money(
                              item.amount ??
                              Number(item.qty) * Number(item.unit_price)
                            )} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <b className="text-xs">Lịch sử thanh toán</b>

                  {!detail.payments?.length ? (
                    <p className="mt-4 text-xs text-slate-400">
                      Chưa có thanh toán.
                    </p>
                  ) : (
                    detail.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="mt-3 flex justify-between border-b pb-3 text-xs last:border-0"
                      >
                        <div>
                          <b>
                            {payment.method === 'cash'
                              ? 'Tiền mặt'
                              : payment.method === 'momo'
                                ? 'MoMo'
                                : 'Chuyển khoản'}
                          </b>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(payment.paid_at)} · {payment.creator_name || '—'}
                          </p>
                          {payment.note && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              {payment.note}
                            </p>
                          )}
                        </div>

                        <b className="text-emerald-600">
                          +{money(payment.amount)} đ
                        </b>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-xs">
                  <MoneyRow
                    label="Tạm tính"
                    value={`${money(detail.sub_total)} đ`}
                  />
                  <MoneyRow
                    label="Giảm giá"
                    value={`-${money(detail.discount)} đ`}
                  />
                  <MoneyRow
                    label="Thuế"
                    value={`${money(detail.tax_amount)} đ`}
                  />
                  <MoneyRow
                    label="Vận chuyển"
                    value={`${money(detail.shipping_fee)} đ`}
                  />

                  <div className="my-3 border-t" />

                  <MoneyRow
                    label="Tổng cộng"
                    value={`${money(detail.total)} đ`}
                    bold
                  />
                  <MoneyRow
                    label="Đã thanh toán"
                    value={`${money(detail.paid_amount)} đ`}
                    green
                  />
                  <MoneyRow
                    label="Còn lại"
                    value={`${money(detail.remaining)} đ`}
                    red
                  />
                </div>
              </div>

              {detail.note && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  <b>Ghi chú: </b>
                  {detail.note}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                {detail.status === 'draft' && (
                  <button
                    onClick={() => askApprove(detail)}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
                  >
                    Duyệt đơn
                  </button>
                )}

                {detail.type === 'sale' &&
                  detail.payment_status !== 'paid' && (
                    <button
                      onClick={() => openPayment(detail)}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"
                    >
                      Thu tiền
                    </button>
                  )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {createModal && (
        <Modal
          wide
          close={() => {
            if (!saving) setCreateModal(false);
          }}
        >
          <div className="modal-head">
            <div>
              <b>Tạo đơn hàng mới</b>
              <p>Hệ thống tự động sinh mã đơn</p>
            </div>

            <button onClick={() => setCreateModal(false)}>
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={saveOrder}
            className="max-h-[80vh] overflow-y-auto p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loại đơn *">
                <select
                  value={form.type}
                  onChange={(e) => changeType(e.target.value)}
                  className="input"
                >
                  <option value="sale">Đơn bán hàng</option>
                  <option value="purchase">Đơn nhập hàng</option>
                </select>
              </Field>

              <Field
                label={
                  form.type === 'sale'
                    ? 'Khách hàng *'
                    : 'Nhà cung cấp *'
                }
              >
                <select
                  required
                  value={form.partner_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      partner_id: e.target.value
                    })
                  }
                  className="input"
                >
                  <option value="">-- Chọn --</option>

                  {partners
                    .filter((p) =>
                      p.type === (
                        form.type === 'sale'
                          ? 'customer'
                          : 'supplier'
                      )
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <b className="text-xs">
                  {form.type === 'sale'
                    ? 'Thành phẩm'
                    : 'Vật tư nhập'}
                </b>

                <button
                  type="button"
                  onClick={addRow}
                  className="text-xs font-bold text-blue-600"
                >
                  + Thêm dòng
                </button>
              </div>

              {!form.items.length && (
                <div className="rounded-xl border border-dashed bg-white p-6 text-center text-xs text-slate-400">
                  Chưa có sản phẩm. Nhấn “+ Thêm dòng”.
                </div>
              )}

              {form.items.map((row, index) => (
                <div
                  key={index}
                  className="mb-2 grid gap-2 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_90px_140px_40px]"
                >
                  <select
                    required
                    value={row.item_id}
                    onChange={(e) =>
                      changeRow(index, 'item_id', e.target.value)
                    }
                    className="input"
                  >
                    <option value="">-- Chọn sản phẩm --</option>

                    {items
                      .filter((item) =>
                        item.type === (
                          form.type === 'sale'
                            ? 'product'
                            : 'material'
                        )
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                  </select>

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={row.qty}
                    onChange={(e) =>
                      changeRow(index, 'qty', e.target.value)
                    }
                    className="input"
                    placeholder="SL"
                  />

                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={row.unit_price}
                    onChange={(e) =>
                      changeRow(index, 'unit_price', e.target.value)
                    }
                    className="input"
                    placeholder="Đơn giá"
                  />

                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    <Trash2 size={15} className="mx-auto" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Giảm giá">
                <input
                  type="number"
                  min="0"
                  value={form.discount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discount: e.target.value
                    })
                  }
                  className="input"
                />
              </Field>

              <Field label="Thuế">
                <input
                  type="number"
                  min="0"
                  value={form.tax_amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tax_amount: e.target.value
                    })
                  }
                  className="input"
                />
              </Field>

              <Field label="Phí vận chuyển">
                <input
                  type="number"
                  min="0"
                  value={form.shipping_fee}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      shipping_fee: e.target.value
                    })
                  }
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Hạn thanh toán">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      due_date: e.target.value
                    })
                  }
                  className="input"
                />
              </Field>

              <Field label="Địa chỉ giao hàng">
                <input
                  value={form.delivery_address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      delivery_address: e.target.value
                    })
                  }
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Ghi chú">
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      note: e.target.value
                    })
                  }
                  className="input min-h-[80px] py-3"
                />
              </Field>
            </div>

            {form.type === 'sale' && (
              <label className="mt-4 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.require_full_payment}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      require_full_payment: e.target.checked
                    })
                  }
                />
                Yêu cầu thanh toán đủ trước khi duyệt
              </label>
            )}

            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <div>
                <small className="text-slate-400">
                  Tạm tính: {money(subTotal)} đ
                </small>
                <b className="block text-xl text-blue-600">
                  {money(finalTotal)} đ
                </b>
              </div>

              <button
                disabled={saving}
                className="btn-main disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Lưu đơn
              </button>
            </div>
          </form>
        </Modal>
      )}

      {payModal && (
        <Modal
          close={() => {
            if (!saving) setPayModal(null);
          }}
        >
          <div className="modal-head">
            <div>
              <b>Thu tiền {payModal.code}</b>
              <p>
                Còn{' '}
                {money(
                  Math.max(
                    0,
                    Number(payModal.total || 0) -
                      Number(payModal.paid_amount || 0)
                  )
                )}{' '}
                đ
              </p>
            </div>

            <button onClick={() => setPayModal(null)}>
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={submitPayment}
            className="space-y-4 p-5"
          >
            <Field label="Số tiền *">
              <input
                required
                type="number"
                min="1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Phương thức">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="input"
              >
                <option value="transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option>
              </select>
            </Field>

            <Field label="Ghi chú">
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="input"
              />
            </Field>

            <button
              disabled={saving}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Xác nhận thu tiền
            </button>
          </form>
        </Modal>
      )}

      {confirmBox && (
        <Modal close={() => setConfirmBox(null)}>
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>

            <b className="text-lg">{confirmBox.title}</b>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {confirmBox.message}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmBox(null)}
                className="h-10 flex-1 rounded-xl bg-slate-100 text-xs font-bold"
              >
                Hủy
              </button>

              <button
                onClick={approveOrder}
                className="h-10 flex-1 rounded-xl bg-emerald-600 text-xs font-bold text-white"
              >
                Duyệt đơn
              </button>
            </div>
          </div>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'error' ? (
              <XCircle
                className="mx-auto mb-3 text-red-500"
                size={44}
              />
            ) : popup.type === 'warning' ? (
              <AlertTriangle
                className="mx-auto mb-3 text-amber-500"
                size={44}
              />
            ) : (
              <CheckCircle2
                className="mx-auto mb-3 text-emerald-500"
                size={44}
              />
            )}

            <b className="text-lg">{popup.title}</b>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {popup.message}
            </p>

            <button
              onClick={() => setPopup(null)}
              className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white"
            >
              Đã hiểu
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes pageIn{
          from{opacity:0;transform:translateY(8px)}
          to{opacity:1;transform:none}
        }
        @keyframes popIn{
          from{opacity:0;transform:scale(.96) translateY(8px)}
          to{opacity:1;transform:none}
        }
        .input,.control,.search{
          width:100%;height:42px;border:1px solid #e2e8f0;
          border-radius:12px;background:#f8fafc;padding:0 12px;
          font-size:12px;outline:none;transition:.2s;
        }
        .input:focus,.control:focus,.search:focus{
          border-color:#93c5fd;background:white;
          box-shadow:0 0 0 3px #dbeafe;
        }
        .control{height:36px;width:auto}
        .search{height:36px;padding-left:34px}
        .act{
          display:flex;height:36px;width:36px;align-items:center;
          justify-content:center;border-radius:10px;transition:.2s;
        }
        .btn-main{
          display:flex;height:40px;align-items:center;justify-content:center;
          gap:7px;border-radius:12px;
          background:linear-gradient(90deg,#2563eb,#4f46e5);
          padding:0 16px;font-size:12px;font-weight:700;color:white;
          box-shadow:0 8px 20px rgba(37,99,235,.18);
        }
        .modal-bg{
          position:fixed;inset:0;z-index:100;display:flex;
          align-items:center;justify-content:center;
          background:rgba(15,23,42,.58);padding:12px;
          backdrop-filter:blur(5px);
        }
        .modal-box{
          width:100%;overflow:hidden;border-radius:24px;background:white;
          box-shadow:0 25px 70px rgba(15,23,42,.3);
          animation:popIn .2s ease-out;
        }
        .modal-head{
          display:flex;align-items:center;justify-content:space-between;
          border-bottom:1px solid #f1f5f9;padding:18px 20px;
        }
        .modal-head b{font-size:14px;color:#0f172a}
        .modal-head p{margin-top:2px;font-size:10px;color:#94a3b8}
        .modal-head button{color:#94a3b8;transition:.2s}
        .modal-head button:hover{color:#0f172a}
        @media(prefers-reduced-motion:reduce){
          *{animation:none!important;transition:none!important}
        }
      `}</style>
    </div>
  );
}

function Modal({ children, close, wide = false }) {
  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close?.();
      }}
    >
      <div
        className={`modal-box ${
          wide ? 'max-w-[900px]' : 'max-w-[420px]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoBox({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <Icon size={15} className="mb-2 text-blue-600" />
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <b className="mt-1 block truncate text-xs text-slate-800">
        {value || '—'}
      </b>
      <p className="mt-1 truncate text-[10px] text-slate-400">
        {sub || '—'}
      </p>
    </div>
  );
}

function MoneyRow({ label, value, bold, green, red }) {
  let valueClass = '';

  if (green) valueClass = 'font-bold text-emerald-600';
  if (red) valueClass = 'font-bold text-red-600';

  return (
    <div className={`mb-2 flex justify-between ${bold ? 'text-sm font-black' : ''}`}>
      <span className={bold ? 'text-slate-800' : 'text-slate-500'}>
        {label}
      </span>
      <span className={valueClass}>
        {value}
      </span>
    </div>
  );
}