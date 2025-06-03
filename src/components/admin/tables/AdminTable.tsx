'use client';

import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminLoadingState } from '../common/AdminLoadingState';
import { AdminEmptyState } from '../common/AdminEmptyState';

export interface AdminTableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
}

interface AdminTableProps<T = any> {
  columns: AdminTableColumn<T>[];
  data: T[];
  loading?: boolean;
  empty?: {
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  className?: string;
}

export function AdminTable<T = any>({ 
  columns, 
  data, 
  loading = false,
  empty,
  rowKey = 'id' as keyof T,
  onRowClick,
  className 
}: AdminTableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] || index);
  };

  if (loading) {
    return <AdminLoadingState type="table" />;
  }

  if (data.length === 0 && empty) {
    return <AdminEmptyState {...empty} />;
  }

  return (
    <div className={`rounded-md border ${className || ''}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={column.key}
                style={{ width: column.width }}
                className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}
              >
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => (
            <TableRow 
              key={getRowKey(record, index)}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onRowClick?.(record, index)}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render 
                    ? column.render(
                        column.dataIndex ? record[column.dataIndex] : record, 
                        record, 
                        index
                      )
                    : column.dataIndex 
                      ? String(record[column.dataIndex] || '') 
                      : ''
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 