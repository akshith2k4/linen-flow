export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return "-";
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateStr).toLocaleString('en-US', options || defaultOptions);
  } catch {
    return dateStr;
  }
}
