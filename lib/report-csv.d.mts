export function safeCsvCell(value: unknown): string;
export interface CsvJob {
  job_code: string;
  product: string;
  status: string;
  created_at: string;
  original_price_paise: number;
}
export function jobsCsv(jobs: CsvJob[]): string;
