const allowed = 'https://prwmowexhonguvtiywsy.supabase.co';
Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', {status:405});
  if (Deno.env.get('SUPABASE_URL') !== allowed) return new Response('Isolated staging required', {status:503});
  const signature = request.headers.get('stripe-signature');
  if (!signature || signature.length > 4096) return new Response('Signature required', {status:400});
  const reader = request.body?.getReader();
  if (!reader) return new Response('Body required', {status:400});
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 98304) {
        await reader.cancel();
        return new Response('Payload too large', {status:413});
      }
      chunks.push(value);
    }
    const raw = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk,offset);
      offset += chunk.byteLength;
    }
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!key) return new Response('Receiver unavailable', {status:503});
    const response = await fetch(allowed+'/rest/v1/rpc/convergence92_receive', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(12000),
      headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({p_raw:new TextDecoder('utf-8',{fatal:true}).decode(raw),p_signature:signature})
    });
    const result = await response.json();
    if (!response.ok) {
      const invalid = ['22023','28000'].includes(result?.code);
      return Response.json({outcome:invalid?'invalid':'requires-review'}, {status:invalid?400:503});
    }
    if (result.outcome === 'unattached') return Response.json({outcome:'requires-review'}, {status:503});
    return Response.json(result);
  } catch {
    return Response.json({outcome:'requires-review'}, {status:503});
  } finally {
    reader.releaseLock();
  }
});
