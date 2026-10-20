'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Film,
  Check
} from 'lucide-react';

interface InteractiveDataGridProps {
  columns: string[];
  rows: Record<string, any>[];
  onSelectMovie?: (movieId: number, title?: string) => void;
  selectedMovieId?: number | null;
}

export default function InteractiveDataGrid({
  columns,
  rows,
  onSelectMovie,
  selectedMovieId,
}: InteractiveDataGridProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Sorting handler
  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Filter & Sort
  const processedRows = useMemo(() => {
    let result = [...rows];

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        )
      );
    }

    if (sortCol) {
      result.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [rows, filterText, sortCol, sortDir]);

  // CSV Export
  const handleExportCsv = () => {
    if (!columns.length || !processedRows.length) return;
    const header = columns.join(',');
    const body = processedRows
      .map((r) =>
        columns
          .map((c) => {
            const v = r[c];
            if (v === null || v === undefined) return '';
            const str = String(v).replace(/"/g, '""');
            return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
          })
          .join(',')
      )
      .join('\n');

    const csvContent = `${header}\n${body}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cineverse_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  if (!columns.length) {
    return (
      <div className="p-8 text-center text-xs text-[#8b98aa] font-mono">
        No active query results. Execute a query above to inspect tuples.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Grid Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search filter input */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141211] border border-[#2a3547] w-64">
          <Search className="w-3.5 h-3.5 text-[#8b98aa] shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter results..."
            className="flex-1 bg-transparent border-0 text-xs text-[#f7f8fb] placeholder-[#78716c] focus:outline-none font-mono"
          />
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#221f1c] hover:bg-[#2b2724] border border-[#2a3547] text-[#f7f8fb] font-mono text-[11px] transition-colors"
        >
          {copiedCsv ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Exported CSV</span>
            </>
          ) : (
            <>
              <Download className="w-3 h-3 text-[#ff6b57]" />
              <span>Export CSV ({processedRows.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-[#2a3547] overflow-hidden bg-[#080c12]">
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#1c1917] border-b border-[#2a3547] z-10 text-[11px] font-mono uppercase tracking-wider text-[#8b98aa]">
              <tr>
                {columns.map((col) => {
                  const isSorted = sortCol === col;
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-3.5 py-2.5 cursor-pointer hover:bg-white/5 transition-colors select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={isSorted ? 'text-[#ff6b57] font-bold' : ''}>
                          {col}
                        </span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#ff6b57]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#ff6b57]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-[#2a3547]" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {processedRows.map((row, idx) => {
                // If row has movie_id or title, see if it is selected
                const rowMovieId = row.movie_id ? Number(row.movie_id) : null;
                const isSelected = rowMovieId && selectedMovieId === rowMovieId;

                return (
                  <tr
                    key={idx}
                    onClick={() => {
                      if (onSelectMovie && (row.movie_id || row.title)) {
                        onSelectMovie(row.movie_id ? Number(row.movie_id) : 1, row.title);
                      }
                    }}
                    className={`hover:bg-white/[0.04] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#ff6b57]/15 border-l-2 border-[#ff6b57]' : ''
                    }`}
                  >
                    {columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined;
                      return (
                        <td key={col} className="px-3.5 py-2 whitespace-nowrap text-[#cfc2b6]">
                          {isNull ? (
                            <span className="text-[#78716c] italic">null</span>
                          ) : typeof val === 'number' ? (
                            <span className="text-[#fcd34d] font-bold">{val}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
