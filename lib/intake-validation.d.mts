export function normalizeIndianMobile(value: unknown): string;
export function validateCustomerInput<T extends {company_name:string; contact_person:string;phone:string;email:string|null}>(value:T): Omit<T,'email'> & {email:string|null};
export function validateJobInput(value:{customer_id:string;product:string;problem:string;original_price:string|number;effort:string|number|null}):boolean;
