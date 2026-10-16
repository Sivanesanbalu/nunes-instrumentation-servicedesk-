'use client';
import {useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {money} from '@/lib/pricing';

type Snapshot = Record<string, unknown>;
type Detail = {quote_code:string;status:string;created_at:string;effort:number;labor_paise:number;parts_paise:number;shipping_paise:number;discount_paise:number;tax_paise:number;total_paise:number;tax_bp:number;customer_snapshot:Snapshot;product_snapshot:Snapshot};
const field=(obj:Snapshot,key:string)=>String(obj[key]??'');
export const normalizeWhatsapp=(phone:string):string|null=>{const digits=phone.replace(/[^0-9]/g,'');const number=digits.length===10?'91'+digits:digits;return /^91[6-9][0-9]{9}$/.test(number)?number:null};
export const whatsappQuoteLink=(phone:string,code:string,totalPaise:number):string|null=>{
 const number=normalizeWhatsapp(phone);
 if(!number)return null;
 const message=`Hello, please find the quotation ${code} from Nunes Instrumentation. Estimated total: ${money(totalPaise)}. Please contact our service team to review and confirm. The quotation PDF will be sent separately.`;
 return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};
export function QuoteDocument({client}:{client:SupabaseClient}){
 const [id,setId]=useState(''),[detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function fetchQuote(){setBusy(true);setError('');setDetail(null);try{
  const {data,error}=await client.from('service_quotes').select('quote_code,status,created_at,effort,labor_paise,parts_paise,shipping_paise,discount_paise,tax_paise,total_paise,tax_bp,customer_snapshot,product_snapshot').eq('quote_code',id.trim()).maybeSingle();
  if(error)throw error;if(!data)throw Error('Quotation not found');setDetail(data as Detail);
 }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 const approved=detail&&['approved_by_owner','sent','accepted','rejected'].includes(detail.status);
 const share=approved&&detail?whatsappQuoteLink(field(detail.customer_snapshot,'phone'),detail.quote_code,detail.total_paise):null;
 return <section className="panel"><div className="quote-controls"><h2>Quotation PDF / WhatsApp</h2><p className="muted">Open a quotation, print it or save as PDF using your browser. WhatsApp opens a draft only; attach the downloaded PDF manually, then confirm sharing in Quotation actions.</p><label>Quotation reference (e.g. NQ-2026-000001)<input value={id} onChange={e=>setId(e.target.value)} placeholder="NQ-2026-000001"/></label><div className="actions"><button disabled={busy||!id.trim()} onClick={()=>void fetchQuote()}>{busy?'Loading…':'Load quotation'}</button>{approved&&<button className="secondary" onClick={()=>window.print()}>Print / Save PDF</button>}{share&&<a className="quote-link" href={share} target="_blank" rel="noopener noreferrer">Open WhatsApp draft</a>}</div>{error&&<p className="error" role="alert">{error}</p>}</div>
 {detail&&<article className="printable-quote"><header><div><h1>NUNES INSTRUMENTATION</h1><p>Repair service quotation</p></div><div><b>{detail.quote_code}</b><p>{new Date(detail.created_at).toLocaleDateString('en-IN')}</p></div></header><hr/><div><strong>To</strong><p>{field(detail.customer_snapshot,'company_name')}<br/>{field(detail.customer_snapshot,'contact_person')}<br/>{field(detail.customer_snapshot,'address')}<br/>{field(detail.customer_snapshot,'phone')} · {field(detail.customer_snapshot,'email')}</p></div><div><strong>Instrument</strong><p>{field(detail.product_snapshot,'product')} — {field(detail.product_snapshot,'model')}<br/>Serial: {field(detail.product_snapshot,'serial_number')}<br/>Job: {field(detail.product_snapshot,'job_code')}</p></div><div className="tablewrap"><table><thead><tr><th>Particulars</th><th>Amount</th></tr></thead><tbody><tr><td>Repair labour ({detail.effort}% effort)</td><td>{money(detail.labor_paise)}</td></tr><tr><td>Parts</td><td>{money(detail.parts_paise)}</td></tr><tr><td>Shipping</td><td>{money(detail.shipping_paise)}</td></tr><tr><td>Discount</td><td>− {money(detail.discount_paise)}</td></tr><tr><td>Tax ({(detail.tax_bp/100).toFixed(2)}%)</td><td>{money(detail.tax_paise)}</td></tr><tr><th>Total estimated amount</th><th>{money(detail.total_paise)}</th></tr></tbody></table></div><p><b>Status:</b> {detail.status.replaceAll('_',' ')}. This document is a quotation, not proof of payment or successful delivery.</p><p className="muted">Final service terms, warranty, validity and company statutory details must be confirmed by authorized staff before sharing.</p></article>}
 </section>
}
