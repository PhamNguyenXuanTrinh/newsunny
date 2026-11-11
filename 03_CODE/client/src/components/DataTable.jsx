import { useState } from 'react'; // Đã bỏ useEffect
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({ columns, data, loading, rowsPerPage = 5 }) {
  const [currentPage, setCurrentPage] = useState(1);
  // Lưu lại độ dài data trước đó để so sánh
  const [prevDataLength, setPrevDataLength] = useState(data?.length || 0);

  // CÁCH CHUẨN CỦA REACT 18: Cập nhật state ngay trong lúc render (Không dùng useEffect)
  if ((data?.length || 0) !== prevDataLength) {
    setPrevDataLength(data?.length || 0);
    setCurrentPage(1); // Reset về trang 1 nếu data thay đổi (VD: khi search)
  }

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse bg-white rounded-xl border border-slate-200">Đang tải dữ liệu...</div>;
  if (!data || data.length === 0) return <div className="p-10 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">Không có dữ liệu.</div>;

  // Logic phân trang
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage)); // Đảm bảo ít nhất là 1 trang
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              {columns.map((col, idx) => (
                <th key={idx} className="p-4 font-semibold whitespace-nowrap">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50 transition">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="p-4 text-slate-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* THANH PHÂN TRANG (Đã tối ưu cho Mobile) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
            Hiển thị <span className="font-medium text-slate-800">{indexOfFirstItem + 1}</span> đến <span className="font-medium text-slate-800">{Math.min(indexOfLastItem, data.length)}</span> trong tổng số <span className="font-medium text-slate-800">{data.length}</span> dòng
          </div>
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              Trang {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}