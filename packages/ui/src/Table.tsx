import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
}

const tableStyles: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
};

const theadStyles: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
  borderBottom: '2px solid var(--color-border, #e5e5e5)',
};

const thStyles: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--color-text, #1a1a1a)',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'background-color 0.15s ease',
};

const thContentStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const tdStyles: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
  color: 'var(--color-text, #1a1a1a)',
};

const trStyles: React.CSSProperties = {
  transition: 'background-color 0.15s ease',
};

const emptyStyles: React.CSSProperties = {
  padding: '48px 16px',
  textAlign: 'center',
  color: '#6b7280',
};

function SortIcon({ direction }: { direction: 'asc' | 'desc' | undefined }) {
  if (!direction) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity={0.3}>
        <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {direction === 'asc' ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : (
        <path d="M12 5v14M5 12l7 7 7-7" />
      )}
    </svg>
  );
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  sortKey,
  sortDirection,
  onSort,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const handleThClick = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  if (data.length === 0) {
    return (
      <div style={{ border: '1px solid var(--color-border, #e5e5e5)', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={tableStyles}>
          <thead style={theadStyles}>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ ...thStyles, width: col.width, cursor: 'default' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={emptyStyles}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--color-border, #e5e5e5)', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={tableStyles}>
        <thead style={theadStyles}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ ...thStyles, width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                onClick={() => handleThClick(col.key, col.sortable)}
              >
                <div style={thContentStyles}>
                  {col.header}
                  {col.sortable && <SortIcon direction={sortKey === col.key ? sortDirection : undefined} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)} style={trStyles}>
              {columns.map((col) => (
                <td key={col.key} style={tdStyles}>
                  {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const paginationStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '16px',
};

const pageButtonStyles: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--color-border, #e5e5e5)',
  borderRadius: '6px',
  backgroundColor: 'var(--color-bg, #ffffff)',
  color: 'var(--color-text, #1a1a1a)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const pageButtonActiveStyles: React.CSSProperties = {
  ...pageButtonStyles,
  backgroundColor: '#3b82f6',
  borderColor: '#3b82f6',
  color: '#ffffff',
};

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showPages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
  const endPage = Math.min(totalPages, startPage + showPages - 1);

  if (endPage - startPage + 1 < showPages) {
    startPage = Math.max(1, endPage - showPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div style={paginationStyles}>
      <button
        style={{ ...pageButtonStyles, opacity: currentPage === 1 ? 0.5 : 1 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          style={page === currentPage ? pageButtonActiveStyles : pageButtonStyles}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        style={{ ...pageButtonStyles, opacity: currentPage === totalPages ? 0.5 : 1 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}
