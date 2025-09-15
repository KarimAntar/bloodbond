/**
 * scripts/test_send.js
 *
 * Simple CLI helper to call the /api/sendNotification endpoint.
 *
 * Usage:
 *   node scripts/test_send.js --type=user --userId=USER_ID --deviceId=DEVICE_ID --title="Test" --body="hello" --origin="https://localhost:3000"
 *   node scripts/test_send.js --type=broadcast --title="Broadcast" --body="hello" --origin="https://bloodbond.app"
 *
 * Supported flags:
 *   --type      one of "user" | "broadcast" | "topic"   (default: broadcast)
 *   --userId    target user id (required for type=user)
 *   --deviceId  optional deviceId to target a single device for type=user
 *   --topic     topic name (required for type=topic)
 *   --title     notification title
 *   --body      notification body
 *   --origin    full origin of your app (default: https://bloodbond.app)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      args[arg.slice(2)] = true;
    } else {
      const key = arg.slice(2, eq);
      const val = arg.slice(eq + 1);
      args[key] = val;
    }
  }
  return args;
}

(async () => {
  try {
    const args = parseArgs(process.argv);
    const type = args.type || 'broadcast';
    const title = args.title || 'Test Notification';
    const body = args.body || 'Hello from test_send.js';
    const origin = args.origin || process.env.SEND_ORIGIN || 'https://bloodbond.app';
    const userId = args.userId || process.env.TEST_USER_ID;
    const deviceId = args.deviceId;
    const topic = args.topic;

    const payload = { type, title, body };
    if (type === 'user') {
      if (!userId) {
        console.error('type=user requires --userId=USER_ID or set TEST_USER_ID env var');
        process.exit(2);
      }
      payload.userId = userId;
      if (deviceId) payload.deviceId = deviceId;
    } else if (type === 'topic') {
      if (!topic) {
        console.error('type=topic requires --topic=TOPIC_NAME');
        process.exit(2);
      }
      payload.topic = topic;
    }

    const requestUrl = new URL('/api/sendNotification', origin);
    const isHttps = requestUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const data = JSON.stringify(payload);

    const options = {
      hostname: requestUrl.hostname,
      port: requestUrl.port || (isHttps ? 443 : 80),
      path: requestUrl.pathname + requestUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    console.log('Sending to', requestUrl.href);
    console.log('Payload:', payload);

    const req = client.request(options, (res) => {
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
  } catch (err) {
    console.error('Fatal error', err);
    process.exit(1);
  }
})();
