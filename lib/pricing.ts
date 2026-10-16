export type QuoteInput={originalRupees:number; effort:number; manualLaborRupees?:number;partsRupees?:number;shippingRupees?:number;discountRupees?:number;taxPercent?:number};
export type PriceResult={bracket:'low'|'review'|'high';laborPaise:number;partsPaise:number;shippingPaise:number;discountPaise:number;taxPaise:number;totalPaise:number;taxBp:number};
function validNumber(value:number,label:string){if(!Number.isFinite(value)||value<0)throw new Error(`${label} must be a nonnegative number`)}
export function toPaise(rupees:number){validNumber(rupees,'Amount');return Math.round((rupees+Number.EPSILON)*100)}
export function priceQuote(input:QuoteInput):PriceResult {
 const {originalRupees,effort}=input;
 validNumber(originalRupees,'Original price');if(!Number.isInteger(effort)||effort<0||effort>100)throw new Error('Effort must be an integer from 0 to 100');
 const bracket=effort>50?'high':effort<30?'low':'review';
 if(bracket!=='high'&&input.manualLaborRupees===undefined)throw new Error('Manual labour amount is required for 50% effort or below');
 const original=toPaise(originalRupees);
 const laborPaise=bracket==='high'?Math.round(original/2):toPaise(input.manualLaborRupees!);
 const partsPaise=toPaise(input.partsRupees??0),shippingPaise=toPaise(input.shippingRupees??0),discountPaise=toPaise(input.discountRupees??0);
 const subtotal= laborPaise+partsPaise+shippingPaise;
 if(discountPaise>subtotal)throw new Error('Discount exceeds subtotal');
 const taxPercent=input.taxPercent??18;if(!Number.isFinite(taxPercent)||taxPercent<0||taxPercent>100)throw new Error('Tax percent must be between 0 and 100');
 const taxBp=Math.round(taxPercent*100), taxable=subtotal-discountPaise, taxPaise=Math.round(taxable*taxBp/10000);
 return {bracket,laborPaise,partsPaise,shippingPaise,discountPaise,taxPaise,totalPaise:taxable+taxPaise,taxBp};
}
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
