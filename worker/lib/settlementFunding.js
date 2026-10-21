"use strict";
const { distribute, distributeProRata, scoreOf, DUST_MICRO } = require("./rewards");
const { epochIdentity, epochScope, splitFundingPools } = require("./funding");

async function settleFundingEpoch(prisma, { epoch, since, until, config, consensus }) {
  return prisma.$transaction(async (tx) => {
    // Serialize all epochs for this chain; receipt consumption and payouts
    // commit together. A retry NEVER deletes an already-published entitlement.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(config.chainId)})`;
    const identity=epochIdentity(config);
    const existing = await tx.epoch.findUnique({ where: { epoch_number_chain_id_tipjar_address: {epoch_number:epoch,...identity} } });
    if (existing?.funding_finalized) return { reused: true, epoch };
    if (existing && await tx.reward.count({ where: { epoch_id: existing.id } })) {
      throw new Error("[settle] legacy epoch has entitlements; refusing to rewrite");
    }
    const scope = epochScope(config);
    const previous = await tx.epoch.findFirst({ where: { ...scope, epoch_number: { lt: epoch } }, orderBy: { epoch_number: "desc" } });
    let carryCom=0n, carryCrowd=0n;
    if (previous) {
      const paid = await tx.reward.groupBy({ by:["role"], where:{epoch_id:previous.id}, _sum:{amount_micro_usdg:true} });
      const spent = role => BigInt(paid.find(p=>p.role===role)?._sum.amount_micro_usdg || 0);
      carryCom = previous.comedian_micro_usdg - spent("comedian");
      carryCrowd = previous.crowd_micro_usdg - spent("crowd");
      if(carryCom<0n || carryCrowd<0n) throw new Error("[settle] negative rollover requires reconciliation");
    }
    const receipts = await tx.rewardFundingReceipt.findMany({ where: {
      chain_id:config.chainId, tipjar_address:config.tipJar.toLowerCase(),
      gateway_address:{ in:[config.gateway, ...(config.creatorSplitter ? [config.creatorSplitter] : [])].map(s=>s.toLowerCase()) },
      OR:[{general_epoch_id:null},{royalty_remaining_micro:{gt:0n}}],
    } });
    const funding = splitFundingPools(receipts);
    const comPool=funding.general*8000n/10000n + carryCom;
    const crowdPool=funding.general-funding.general*8000n/10000n + carryCrowd;
    const finals = await tx.outcome.findMany({ where:{decided_at:{gte:since,lt:until},bit:{chain_id:config.chainId}}, include:{bit:{include:{user:true,assignments:{where:{is_plant:false,voted_at:{not:null}},include:{juror:true}}}}} });
    const comedians=finals.filter(o=>["killed_it","bombed"].includes(o.result)).map(o=>({account:o.bit.user.wallet,score:scoreOf({win_strength:o.win_strength,fairness:o.fair_ratio,stage:o.bit.stage,comedian_tier:o.bit.user.comedian_tier})}));
    const crowd=[];
    for(const o of finals) for(const a of o.bit.assignments || []) if(consensus(o.result,a) && a.juror?.wallet) crowd.push({account:a.juror.wallet,score:Math.max(0.1,Number(a.vote_weight||1))});
    const row=await tx.epoch.upsert({where:{epoch_number_chain_id_tipjar_address:{epoch_number:epoch,...identity}},create:{epoch_number:epoch,start_at:since,end_at:until,...identity,tipjar_micro_usdg:funding.general,comedian_micro_usdg:comPool,crowd_micro_usdg:crowdPool,royalty_micro_usdg:0n,fee_in_base_units:funding.general},update:{tipjar_micro_usdg:funding.general,comedian_micro_usdg:comPool,crowd_micro_usdg:crowdPool,royalty_micro_usdg:0n,fee_in_base_units:funding.general}});
    async function writePayouts(pool, entries, role, allocation=distribute) {
      const dist=allocation(pool,entries);let paid=0n,count=0;
      for(const [wallet,amount] of dist.payouts) {
        if(amount<DUST_MICRO)continue;
        const user=await tx.user.findUnique({where:{wallet}});
        if(!user)continue;
        await tx.reward.create({data:{epoch_id:row.id,user_id:user.id,role,amount_micro_usdg:amount}});
        paid+=amount;count++;
      }
      return {paid,count};
    }
    const com=await writePayouts(comPool,comedians,"comedian");
    const jurors=await writePayouts(crowdPool,crowd,"crowd");
    let royaltyPaid=0n;
    const royaltyGroups=new Map();
    for(const r of receipts) {
      if(!r.general_epoch_id) await tx.rewardFundingReceipt.update({where:{id:r.id},data:{general_epoch_id:row.id}});
      if(!Array.isArray(r.contributors_json)||!r.contributors_json.length||r.royalty_remaining_micro<=0n)continue;
      const key=`${r.batch_id}:${JSON.stringify(r.contributors_json)}`;
      const group=royaltyGroups.get(key)||{receipts:[],amount:0n,manifest:r.contributors_json};
      group.receipts.push(r);group.amount+=BigInt(r.royalty_remaining_micro);royaltyGroups.set(key,group);
    }
    for(const group of royaltyGroups.values()) {
      const entries=group.manifest.map(c=>({account:c.wallet,score:Number(c.weight)}));
      if(entries.some(c=>!/^0x[0-9a-f]{40}$/i.test(c.account)||!Number.isFinite(c.score)||c.score<=0)) throw new Error("[settle] invalid snapshot contributor manifest");
      const paid=await writePayouts(group.amount,entries,"royalty",distributeProRata);
      royaltyPaid+=paid.paid;
      let consume=paid.paid;
      for(const receipt of group.receipts) {
        if(consume<=0n)break;
        const take=consume>receipt.royalty_remaining_micro?receipt.royalty_remaining_micro:consume;
        await tx.rewardFundingReceipt.update({where:{id:receipt.id},data:{royalty_remaining_micro:{decrement:take},last_royalty_epoch:epoch}});
        consume-=take;
      }
    }
    await tx.epoch.update({where:{id:row.id},data:{funding_finalized:true,royalty_micro_usdg:royaltyPaid,fee_in_base_units:funding.general+royaltyPaid}});
    return {epoch,comediansPaid:com.count,crowdPaid:jurors.count,royaltyPaid:royaltyPaid.toString(),generalMicro:funding.general.toString(),reservedRoyalty:funding.reservedRoyalty.toString(),rollover:(comPool+crowdPool-com.paid-jurors.paid).toString()};
  }, {isolationLevel:"Serializable",timeout:120000});
}
module.exports={settleFundingEpoch};
