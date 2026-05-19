import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  const btn =
    'px-3 py-1.5 text-sm rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-xs text-gray-500">
        {total} result{total !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${btn} text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={`${btn} text-gray-400 hover:bg-gray-700`}>
              1
            </button>
            {start > 2 && <span className="text-gray-600 px-1">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btn} ${
              p === page
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-gray-600 px-1">…</span>}
            <button onClick={() => onPageChange(totalPages)} className={`${btn} text-gray-400 hover:bg-gray-700`}>
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${btn} text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
