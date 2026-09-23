import { test, mock } from 'node:test';
import * as schema from '../src/db/schema.ts';
const stateDb:any = { enrolled:false, attempted:false, calls:[] };
const tx:any = {
 execute:async()=>({ rows:[{id:1}] }),
 select:()=>({from:()=>({where:async()=>stateDb.enrolled ? [{bookingId:1}] : []})}),
};
mock.module('../src/db/index.ts',{namedExports:{db:{transaction:async(fn:any)=>fn(tx), select:()=>({from:()=>({where:async()=>[{id:1,depositAmount:1000}]})}),update:()=>({set:()=>({where:async()=>{}})})},schema}});
process.env.STRIPE_SECRET_KEY='sk_test_offline';
let providerCalls=0;
mock.module('stripe',{defaultExport:class { checkout={sessions:{create:async()=>{providerCalls++; return {id:'cs_test',url:'https://example.invalid'}}}} }});
const { createDepositLink } = await import('../src/server/deposits.ts');
import assert from 'node:assert/strict';
test('central legacy deposit entry rejects enrolled booking before provider',async()=>{
 stateDb.enrolled=true;
 await assert.rejects(createDepositLink(1),/enrolled/i);
 assert.equal(providerCalls,0);
 stateDb.enrolled=false;
});
import { RentalFlow } from '../src/server/rental-flow.ts';
mock.module('../src/server/email.ts',{namedExports:{sendWaiverPacket(){},sendDepositSettlement(){}}});
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
test('enrolled financial mutation routes reject before writes or refunds',async()=>{
 stateDb.enrolled=true;
 const caller=bookingsRouter.createCaller({isAdmin:true}) as any;
 await assert.rejects(caller.updateStatus({id:1,status:'cancelled'}),/enrolled/i);
 await assert.rejects(caller.update({id:1,total:100}),/enrolled/i);
 await assert.rejects(caller.markDepositPaid({bookingId:1}),/enrolled/i);
 await assert.rejects(caller.settleDeposit({bookingId:1}),/enrolled/i);
 stateDb.enrolled=false;
});

function fixture() {
 const state:any = { booking: { id:1, bookingRef:'TEST', source:'direct', status:'confirmed', paymentStatus:'pending', total:500, charterDate:'2026-12-26', depositStatus:'none', depositAmount:1000, customerEmail:'test@example.invalid', legacyDepositAttempt:true }, plan:null };
 let sends=0;
 const flow=new RentalFlow({ locked:async (_:any, fn:any)=>fn(state), send:async()=>{sends++}, checkout:async()=>{throw Error('no provider')}, retrieve:async()=>{throw Error('no provider')}, token:()=> 'token', now:()=>new Date('2026-12-01'), appUrl:'https://example.invalid' });
 return {state,flow,sends:()=>sends};
}
test('uncertain initial email remains an honest communication failure on repeated enrollment',async()=>{
 const f=fixture(); f.state.booking.legacyDepositAttempt=false;
 await f.flow.authorize(1,'deposit_first',true);
 f.state.plan.messages.initial='uncertain';
 await assert.rejects(f.flow.authorize(1,'deposit_first',true),/uncertain|manual review/i);
 assert.equal(f.sends(),1);
});

test('existing booking enrollment is release gated by default',async()=>{
 delete process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED;
 const { enrollRentalCollection } = await import('../src/server/rental-runtime.ts');
 await assert.rejects(enrollRentalCollection(1,true),/disabled|release gate/i);
});

test('durable unresolved legacy provider attempt prevents enrollment before any message',async()=>{
 const f=fixture();
 await assert.rejects(f.flow.authorize(1,'deposit_first',true), /legacy.*attempt/i);
 assert.equal(f.state.plan,null); assert.equal(f.sends(),0);
});
