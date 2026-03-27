const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model, temperature } = req.body;
    
    const HUNYUAN_SECRET_ID = process.env.HUNYUAN_SECRET_ID;
    const HUNYUAN_SECRET_KEY = process.env.HUNYUAN_SECRET_KEY;

    if (!HUNYUAN_SECRET_ID || !HUNYUAN_SECRET_KEY) {
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const hunyuanMessages = messages.map(msg => ({
      Role: msg.role === 'assistant' ? 'assistant' : 'user',
      Content: msg.content
    }));

    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const payload = {
      Model: model || 'hunyuan-lite',
      Messages: hunyuanMessages,
      Temperature: temperature || 0.7,
      TopP: 0.8
    };

    const response = await callHunyuanApi(HUNYUAN_SECRET_ID, HUNYUAN_SECRET_KEY, payload, timestamp, nonce);

    res.json({
      choices: [{
        message: {
          content: response.Response.Choices[0].Message.Content
        }
      }]
    });

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

async function callHunyuanApi(secretId, secretKey, payload, timestamp, nonce) {
  const service = 'hunyuan';
  const region = 'ap-guangzhou';
  const action = 'ChatCompletions';
  const version = '2023-09-01';
  const algorithm = 'TC3-HMAC-SHA256';
  const host = 'hunyuan.tencentcloudapi.com';

  const date = new Date(timestamp * 1000).toISOString().substring(0, 10);
  
  const hashedRequestPayload = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
  
  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
  
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': version,
      'X-TC-Region': region
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function hmac(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}
