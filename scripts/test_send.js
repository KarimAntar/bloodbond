const https = require('https');

const data = JSON.stringify({
  type: 'broadcast',
  title: 'Bloodbond',
  body: 'Hello, Test LOL XD'
});

const options = {
  hostname: 'www.bloodbond.app',
  path: '/api/sendNotification',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  console.log('STATUS', res.statusCode);
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('RESPONSE:', body);
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR:', e);
});

req.write(data);
req.end();
