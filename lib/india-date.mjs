// Convert UTC timestamps to a calendar day in India, regardless of browser locale.
const indiaDayFormat = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
export function indiaDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid timestamp');
  const parts = Object.fromEntries(indiaDayFormat.formatToParts(date).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function createdOnIndiaDay(timestamp, chosenDay) { return !chosenDay || indiaDay(timestamp) === chosenDay; }
