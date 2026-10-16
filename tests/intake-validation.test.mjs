import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIndianMobile,validateCustomerInput,validateJobInput} from '../lib/intake-validation.mjs';
test('normalizes supported Indian mobile formats',()=>{for(const s of ['9876543210','+91 98765 43210','919876543210']) assert.equal(normalizeIndianMobile(s),'+919876543210')});
test('rejects malformed Indian phone numbers',()=>{for(const s of ['1234','1234567890','+919876543210999','+12025550123']) assert.throws(()=>normalizeIndianMobile(s))});
test('validates and trims customer input',()=>{const c=validateCustomerInput({company_name:' ACME ',contact_person:' Sam ',phone:'9876543210',email:''});assert.equal(c.company_name,'ACME');assert.equal(c.email,null)});
test('rejects missing customer name or malformed email',()=>{assert.throws(()=>validateCustomerInput({company_name:'',contact_person:'Sam',phone:'9876543210',email:''}));assert.throws(()=>validateCustomerInput({company_name:'X',contact_person:'Sam',phone:'9876543210',email:'oops'}))});
test('requires a valid amount and whole-number repair effort',()=>{const j={customer_id:'abc',product:'pH meter',problem:'No display',original_price:'1000',effort:''};assert.equal(validateJobInput(j),true);for(const effort of ['-1','101','22.5','abc']) assert.throws(()=>validateJobInput({...j,effort}));for(const price of ['','-10','abc','Infinity']) assert.throws(()=>validateJobInput({...j,original_price:price}))});
