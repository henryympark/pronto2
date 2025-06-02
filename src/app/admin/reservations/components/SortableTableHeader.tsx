"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortableColumn } from '../types/sortTypes';

interface SortableTableHeaderProps {
  column: SortableColumn;
  children: React.ReactNode;
  onSort: (column: SortableColumn, isShiftPressed: boolean) => void;
  sortState?: {
    direction: 'asc' | 'desc';
    order: number;
    isMultiSort: boolean;
  } | null;
  className?: string;
}

export default function SortableTableHeader({
  column,
  children,
  onSort,
  sortState,
  className = '',
}: SortableTableHeaderProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSort(column, e.shiftKey);
  };

  const getSortIcon = () => {
    if (!sortState) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    }

    return sortState.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-blue-600" />
      : <ArrowDown className="h-3 w-3 text-blue-600" />;
  };

  const getSortOrderBadge = () => {
    if (!sortState?.isMultiSort) return null;
    
    return (
      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-blue-600 rounded-full">
        {sortState.order}
      </span>
    );
  };

  return (
    <th 
      className={`py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors user-select-none ${className}`}
      onClick={handleClick}
      title={`클릭하여 정렬, Shift+클릭으로 다중 정렬`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center">
          {children}
          {getSortOrderBadge()}
        </span>
        {getSortIcon()}
      </div>
    </th>
  );
} 