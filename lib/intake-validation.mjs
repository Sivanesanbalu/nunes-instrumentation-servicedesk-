/** UI validation only; database constraints and RLS remain authoritative. */
export function normalizeIndianMobile(value) {
  const compact = String(value ?? '').replace(/[\s()-]/g, '');
  const digits = compact.startsWith('+91') ? compact.slice(3) : compact.startsWith('91') && compact.length === 12 ? compact.slice(2) : compact;
  if (!/^[6-9]\d{9}$/.test(digits)) throw new Error('Enter a valid 10-digit Indian mobile number');
  return `+91${digits}`;
}
export function validateCustomerInput(value) {
  if (!String(value.company_name ?? '').trim() || !String(value.contact_person ?? '').trim()) throw new Error('Company and contact person are required');
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value.email))) throw new Error('Enter a valid email address');
  return {...value, company_name:value.company_name.trim(), contact_person:value.contact_person.trim(), phone:normalizeIndianMobile(value.phone), email:value.email?.trim() || null};
}
export function validateJobInput(value) {
  if (!String(value.customer_id ?? '').trim() || !String(value.product ?? '').trim() || !String(value.problem ?? '').trim()) throw new Error('Customer, product and fault description are required');
  if (value.original_price === '' || value.original_price === null || !Number.isFinite(Number(value.original_price)) || Number(value.original_price) < 0 || Number(value.original_price) > 1e11) throw new Error('Original price must be a valid non-negative amount');
  if (value.effort !== '' && value.effort !== null && (!Number.isInteger(Number(value.effort)) || Number(value.effort)<0 || Number(value.effort)>100)) throw new Error('Repair effort must be a whole number from 0 to 100');
  return true;
}
