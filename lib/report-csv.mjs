/** Escape untrusted data for spreadsheet-compatible CSV downloads.
 * Formula-like prefixes must be neutralized before opening in Excel/Sheets.
 */
export function safeCsvCell(value) {
  const raw = String(value ?? '');
  const dangerous = /^[\s\u0000-\u001f]*[=+@-]/u.test(raw);
  const protectedValue = dangerous ? "'" + raw : raw;
  return '"' + protectedValue.replaceAll('"', '""') + '"';
}

export function jobsCsv(jobs) {
  const columns = ['Job ID', 'Product', 'Status', 'Created at', 'Original price (INR)'];
  const lines = [columns, ...jobs.map(j => [
    j.job_code, j.product, j.status, j.created_at,
    (j.original_price_paise / 100).toFixed(2)
  ])];
  return '\uFEFF' + lines.map(row => row.map(safeCsvCell).join(',')).join('\r\n') + '\r\n';
}
