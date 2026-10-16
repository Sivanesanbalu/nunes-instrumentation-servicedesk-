import { jobsCsv } from './report-csv.mjs';
import { createdOnIndiaDay } from './india-date.mjs';

/** Export every authorized job from Supabase in deterministic pages.
 * Fail closed on partial queries; no truncated report should be downloaded.
 */
export async function allJobsCsv(client, date = '', pageSize = 500) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('Invalid page size');
  const rows = [];
  let offset = 0;
  let total = null;
  for (;;) {
    const response = await client.from('service_jobs')
      .select('id,job_code,product,status,effort,original_price_paise,customer_id,created_at', { count: 'exact' })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (response.error) throw new Error(`Report export failed at row ${offset}: ${response.error.message}`);
    if (!Array.isArray(response.data)) throw new Error('Report export returned invalid data');
    if (!Number.isSafeInteger(response.count) || response.count < 0) throw new Error('Report export count unavailable; cannot verify completeness');
    if (total === null) total = response.count;
    if (response.count !== total) throw new Error('Report changed during export; retry to avoid an inconsistent report');
    if (offset + response.data.length < total && response.data.length !== pageSize) throw new Error('Report export truncated by server page limit');
    rows.push(...response.data.filter(job => createdOnIndiaDay(job.created_at, date)));
    if (offset + response.data.length >= total) break;
    if (response.data.length === 0) throw new Error('Report export made no progress');
    offset += pageSize;
    if (offset > 1_000_000) throw new Error('Export exceeds safety limit; use a server-side report');
  }
  return jobsCsv(rows);
}
