// Node 18 compatible Netlify Function (updated with improved logging & error details)
// Ensure these environment variables are set in Netlify:
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, OWNER_PHONE_NUMBER

exports.handler = async function(event, context) {
  console.log('send-sms invoked', { method: event.httpMethod });
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name = '', phone = '', service = '', message = '' } = body;

    console.log('payload:', { name, phone, service, message });

    if (!name || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'নাম এবং মোবাইল প্রয়োজন' }) };
    }

    const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM = process.env.TWILIO_PHONE_NUMBER; // Twilio থেকে পাওয়া নম্বর (e.g. +1xxx)
    const OWNER = process.env.OWNER_PHONE_NUMBER; // আপনার মোবাইল (যেখানে SMS যাবে)

    if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM || !OWNER) {
      console.error('Missing Twilio env vars', { ACCOUNT_SID: !!ACCOUNT_SID, AUTH_TOKEN: !!AUTH_TOKEN, FROM: !!FROM, OWNER: !!OWNER });
      return { statusCode: 500, body: JSON.stringify({ error: 'Twilio configuration missing on server' }) };
    }

    const smsBody = `নতুন বুকিং/মেসেজ:\nনাম: ${name}\nমোবাইল: ${phone}\nসার্ভিস: ${service || '-'}\nবার্তা: ${message || '-'}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', OWNER);
    params.append('From', FROM);
    params.append('Body', smsBody);

    const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');

    console.log('calling Twilio API', { url, to: OWNER, from: FROM });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const respText = await resp.text();
    console.log('Twilio response status:', resp.status, 'body:', respText);

    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: 'Twilio error', detail: respText }) };
    }

    const respJson = JSON.parse(respText);
    return { statusCode: 200, body: JSON.stringify({ success: true, sid: respJson.sid }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};