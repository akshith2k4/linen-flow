/**
 * CSV Export Utility
 * Provides type-safe CSV generation and download functionality
 */

export interface CSVHeader<T> {
  key: keyof T;
  label: string;
}

/**
 * Escapes CSV cell values and handles special characters
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes by doubling them
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates CSV content from data array
 */
function generateCsvContent<T>(
  data: T[],
  headers: CSVHeader<T>[]
): string {
  const headerRow = headers.map(h => h.label).join(',');
  
  const rows = data.map(item =>
    headers.map(h => escapeCsvCell(item[h.key])).join(',')
  );
  
  return [headerRow, ...rows].join('\n');
}

/**
 * Triggers browser download of CSV file
 */
function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function - generates and downloads CSV file
 * 
 * @param data - Array of objects to export
 * @param headers - Column definitions with keys and labels
 * @param filename - Name of the downloaded file (without extension)
 * 
 * @example
 * exportToCSV(
 *   orders,
 *   [
 *     { key: 'id', label: 'Order ID' },
 *     { key: 'customerName', label: 'Customer' }
 *   ],
 *   'orders-export'
 * );
 */
export function exportToCSV<T>(
  data: T[],
  headers: CSVHeader<T>[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  const csvContent = generateCsvContent(data, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.csv`;
  
  downloadCsv(csvContent, fullFilename);
}
