import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
const label=/^[A-Za-z0-9_.:-]{1,128}$/;
const actorId=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const hashFormat=/^[0-9a-f]{64}$/;
const safeToken=/^[!-~]{1,8192}$/;
const scopes=['sell.fulfillment.readonly','sell.finances','commerce.identity.readonly'];
const now="floor(extract(epoch from statement_timestamp())*1000)::bigint";
function check({actor,account,environment}) {
  if(!actorId.test(actor??'') || !label.test(account??'') || environment!=='sandbox')
    throw new Error('A verified sandbox Admin binding is required');
}
export function marketplaceStateStore(db) {
  return {
    async stage({hash,actor,account,expectedSubject,environment,expiresAt}) {
      check({actor,account,environment});
      if(!hashFormat.test(hash??'') || !label.test(expectedSubject??'') || !Number.isSafeInteger(expiresAt))
        throw new Error('Invalid marketplace consent intent');
      const result=await db.query('insert into marketplace84.consent_intent '+
        '(state_hash,actor,account,expected_subject,environment,expires_ms) '+
        'select $1,$2,$3,$4,$5,$6 where $6::bigint>'+now+' and $6::bigint<='+now+'+600000',
        [hash,actor,account,expectedSubject,environment,expiresAt]);
      if(result.rowCount!==1) throw new Error('Marketplace consent intent expired');
    },
    async take({hash,actor,environment}) {
      if (!actorId.test(actor??'') || environment!=='sandbox' || !hashFormat.test(hash??'')) return null;
      const {rows}=await db.query('delete from marketplace84.consent_intent '+
        'where state_hash=$1 and actor=$2 and environment=$3 and expires_ms>'+now+
        ' returning actor,account,expected_subject as "expectedSubject",environment,expires_ms as "expiresAt"',
        [hash,actor,environment]);
      return rows[0] ? {...rows[0],expiresAt:Number(rows[0].expiresAt)} : null;
    }
  };
}
export function marketplaceCustody(db,{keys,activeVersion}) {
  const keyFor = version => {
    const key = keys.get(version);
    if(!label.test(version??'') || !Buffer.isBuffer(key) || key.length!==32) throw new Error('Custody key version unavailable');
    return key;
  };
  keyFor(activeVersion);
  const aad = b => Buffer.from(JSON.stringify(['marketplace84',b.environment,b.account,b.subject,b.actor]));
  function seal(binding,token) {
    const iv=randomBytes(12);
    const cipher=createCipheriv('aes-256-gcm',keyFor(activeVersion),iv,{authTagLength:16});
    cipher.setAAD(aad(binding));
    const bytes=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
    return {version:activeVersion,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),
      ciphertext:bytes.toString('base64url')};
  }
  function unseal(binding,envelope) {
    try {
      const iv=Buffer.from(envelope.iv,'base64url');
      const tag=Buffer.from(envelope.tag,'base64url');
      const bytes=Buffer.from(envelope.ciphertext,'base64url');
      if(iv.length!==12 || tag.length!==16 || bytes.length<1 || bytes.length>8192) throw new Error('Invalid envelope');
      const decipher=createDecipheriv('aes-256-gcm',keyFor(envelope.version),iv,{authTagLength:16});
      decipher.setAAD(aad(binding));decipher.setAuthTag(tag);
      const token=Buffer.concat([decipher.update(bytes),decipher.final()]).toString('utf8');
      if(!safeToken.test(token)) throw new Error('Invalid plaintext');
      return token;
    } catch {throw new Error('Marketplace credentials could not be verified');}
  }
  return {
    async bind({refreshToken,expiresAt,requestedScopes,...binding}) {
      check(binding);
      if(!label.test(binding.subject??'') || !safeToken.test(refreshToken??'') || !Number.isSafeInteger(expiresAt) ||
         !Array.isArray(requestedScopes) || requestedScopes.length!==scopes.length || scopes.some(s=>!requestedScopes.includes(s)))
        throw new Error('Invalid seller credential binding');
      const result=await db.query('insert into marketplace84.seller_custody (account,subject,actor,expires_ms,envelope) '+
        'select $1,$2,$3,$4,$5 where $4::bigint>'+now+' on conflict(account) do update set '+
        'expires_ms=excluded.expires_ms,envelope=excluded.envelope where '+
        'seller_custody.subject=excluded.subject and seller_custody.actor=excluded.actor',
        [binding.account,binding.subject,binding.actor,expiresAt,seal(binding,refreshToken)]);
      if(result.rowCount!==1) throw new Error('Existing seller binding differs or expired');
    },
    async status(binding) {
      check(binding);
      const {rows}=await db.query('select expires_ms as "expiresAt" from marketplace84.seller_custody '+
        'where account=$1 and actor=$2',[binding.account,binding.actor]);
      return rows[0] ? {expiresAt:Number(rows[0].expiresAt),readsVerified:false} : null;
    },
    // Trusted server only. Never return this value to the browser.
    async refreshCredential(binding) {
      check(binding);
      const {rows}=await db.query('select subject,envelope from marketplace84.seller_custody '+
        'where account=$1 and actor=$2 and expires_ms>'+now,[binding.account,binding.actor]);
      if(!rows[0]) return null;
      return {subject:rows[0].subject,refreshToken:unseal({...binding,subject:rows[0].subject},rows[0].envelope)};
    }
  };
}
