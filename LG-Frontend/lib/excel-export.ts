/**
 * Excel Export Utility
 * Provides type-safe Excel generation and download functionality using xlsx library
 */

import * as XLSX from 'xlsx';

export interface ExcelHeader<T> {
  key: keyof T;
  label: string;
}

/**
 * Main export function - generates and downloads Excel file
 * 
 * @param data - Array of objects to export
 * @param headers - Column definitions with keys and labels
 * @param filename - Name of the downloaded file (without extension)
 * 
 * @example
 * exportToExcel(
 *   orders,
 *   [
 *     { key: 'id', label: 'Order ID' },
 *     { key: 'customerName', label: 'Customer' }
 *   ],
 *   'orders-export'
 * );
 */
export function exportToExcel<T>(
  data: T[],
  headers: ExcelHeader<T>[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  // Create worksheet data with headers
  const wsData: any[][] = [];
  
  // Add header row
  wsData.push(headers.map(h => h.label));
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(h => {
      const value = item[h.key];
      return value ?? '';
    });
    wsData.push(row);
  });
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Auto-size columns
  const colWidths = headers.map((h, idx) => {
    const headerLength = h.label.length;
    const maxDataLength = Math.max(
      ...data.map(item => {
        const value = item[h.key];
        return String(value ?? '').length;
      })
    );
    return { wch: Math.max(headerLength, maxDataLength, 10) };
  });
  ws['!cols'] = colWidths;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, fullFilename);
}
