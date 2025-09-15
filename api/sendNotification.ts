import admin from 'firebase-admin';

const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT || '';

if (!serviceAccountJson) {
  console.error('FCM service account env var (FCM_SERVICE_ACCOUNT) is missing');
}

// Lazily initialize admin SDK
function initAdmin() {
  if (admin.apps.length) return admin;

  if (!serviceAccountJson) {
    throw new Error('Missing FCM_SERVICE_ACCOUNT environment variable. Cannot initialize firebase-admin.');
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error('Failed to parse FCM_SERVICE_ACCOUNT JSON', e);
    throw e;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return admin;
}

// Utility: batch an array into chunks
const chunk = <T,>(arr: T[], size: number) =>
  arr.reduce<T[][]>((acc, _, i) => (i % size === 0 ? [...acc, arr.slice(i, i + size)] : acc), []);

/**
 * POST /api/sendNotification
 * Body:
 *  { type: 'user', userId, title, body, data? }
 *  { type: 'broadcast', title, body, data? }
 *  { type: 'topic', topic, title, body, data? }  // optional
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const adminSdk = initAdmin();
    const firestore = adminSdk.firestore();
    const messaging = adminSdk.messaging();

    const { type, userId, title, body, data, topic } = req.body || {};

    if (!type || !title || !body) {
      res.status(400).json({ error: 'Missing required fields (type, title, body)' });
      return;
    }

    // Helper to send tokens in batches (tries sendAll -> sendMulticast -> per-token fallback)
    const sendToTokens = async (tokens: string[]) => {
      if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0, failures: [] as any[] };

      const batches = chunk(tokens, 450); // keep under FCM limit
      let successCount = 0;
      let failureCount = 0;
      const failures: any[] = [];

      for (const batchTokens of batches) {
        // Build messages for sendAll/sendMulticast
        const messages: admin.messaging.Message[] = batchTokens.map((t) => ({
          token: t,
          notification: {
            title,
            body,
          },
          data: (data && typeof data === 'object') ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
          android: {
            priority: 'high',
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
          },
          webpush: {
            headers: {
              Urgency: 'high',
            },
          },
        }));

        // Prefer sendAll if available (recent admin SDKs)
        const mg = messaging as any;
        if (typeof mg.sendAll === 'function') {
          try {
            const resp = await mg.sendAll(messages);
            successCount += resp.successCount || 0;
            failureCount += resp.failureCount || 0;
            if (resp.failureCount > 0 && Array.isArray(resp.responses)) {
              resp.responses.forEach((r: any, i: number) => {
                if (!r.success) failures.push({ token: batchTokens[i], error: r.error?.toString() || r.error });
              });
            }
            continue;
          } catch (e) {
            // fall through to try other methods
            console.warn('sendToTokens: sendAll failed, falling back', e);
          }
        }

        // Skip sendMulticast to avoid runtime mismatch in some firebase-admin versions.
        // We already attempted sendAll above; fall back to individual sends below.

        // Final fallback: send messages individually (serially to avoid TCP bursts)
        for (let i = 0; i < batchTokens.length; i++) {
          const msg = messages[i];
          try {
            const resp = await mg.send(msg);
            // resp may be a messageId string on success
            if (resp) successCount += 1;
          } catch (e: any) {
            failureCount += 1;
            failures.push({ token: batchTokens[i], error: e?.toString() || e });
          }
        }
      }

      return { successCount, failureCount, failures };
    };

    if (type === 'topic') {
      if (!topic) {
        res.status(400).json({ error: 'Missing topic for topic send' });
        return;
      }

      const message: admin.messaging.Message = {
        topic: topic,
        notification: {
          title,
          body,
        },
        data: (data && typeof data === 'object') ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
        webpush: { headers: { Urgency: 'high' } },
      };

      const response = await messaging.send(message);
      res.status(200).json({ success: true, messageId: response });
      return;
    }

    if (type === 'user') {
      if (!userId) {
        res.status(400).json({ error: 'Missing userId for user send' });
        return;
      }

      // Get tokens for the user
      const tokensSnap = await firestore
        .collection('userTokens')
        .where('userId', '==', userId)
        .where('active', '==', true)
        .get();

      const tokens: string[] = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

      if (tokens.length === 0) {
        res.status(200).json({ success: true, note: 'no-tokens-for-user', sent: 0 });
        return;
      }

      const result = await sendToTokens(tokens);
      res.status(200).json({ success: true, sent: result.successCount, failures: result.failures, failureCount: result.failureCount });
      return;
    }

    if (type === 'broadcast') {
      // Optionally send to topic if provided
      if (topic) {
        const message: admin.messaging.Message = {
          topic,
          notification: { title, body },
          data: (data && typeof data === 'object') ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
        };
        const response = await messaging.send(message);
        res.status(200).json({ success: true, messageId: response, method: 'topic' });
        return;
      }

      // Otherwise gather all active tokens
      const tokensSnap = await firestore
        .collection('userTokens')
        .where('active', '==', true)
        .get();

      const tokens: string[] = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

      if (tokens.length === 0) {
        res.status(200).json({ success: true, note: 'no-tokens-found', sent: 0 });
        return;
      }

      const result = await sendToTokens(tokens);
      res.status(200).json({ success: true, sent: result.successCount, failures: result.failures, failureCount: result.failureCount });
      return;
    }

    res.status(400).json({ error: 'Unknown type' });
  } catch (error) {
    console.error('sendNotification API error:', error);
    res.status(500).json({ error: String(error) });
  }
}
