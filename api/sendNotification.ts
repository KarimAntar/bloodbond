import admin from 'firebase-admin';

const serviceAccountJson = process.env.EXPO_PUBLIC_FCM_SERVICE_ACCOUNT_KEY || '';

if (!serviceAccountJson) {
  console.error('FCM service account env var (EXPO_PUBLIC_FCM_SERVICE_ACCOUNT_KEY) is missing');
}

// Lazily initialize admin SDK
function initAdmin() {
  if (admin.apps.length) return admin;

  if (!serviceAccountJson) {
    throw new Error('Missing EXPO_PUBLIC_FCM_SERVICE_ACCOUNT_KEY environment variable. Cannot initialize firebase-admin.');
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error('Failed to parse EXPO_PUBLIC_FCM_SERVICE_ACCOUNT_KEY JSON', e);
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

    const { type, userId, title, body, data, topic, deviceId } = req.body || {};

    if (!type || !title || !body) {
      res.status(400).json({ error: 'Missing required fields (type, title, body)' });
      return;
    }

    // Helper to send tokens in batches (tries sendAll -> sendMulticast -> per-token fallback)
    // Accepts token objects so we can vary payload per platform and log diagnostics.
    const sendToTokens = async (tokenObjs: { token: string; platform?: string; docId?: string; deviceId?: string }[]) => {
      if (!tokenObjs || tokenObjs.length === 0) return { successCount: 0, failureCount: 0, failures: [] as any[] };

      // Diagnostic: log resolved tokens + platform summary
      try {
        const platformCounts: Record<string, number> = {};
        tokenObjs.forEach(t => {
          const p = t.platform || 'unknown';
          platformCounts[p] = (platformCounts[p] || 0) + 1;
        });
        console.log('sendToTokens: preparing to send to', tokenObjs.length, 'tokens, platforms:', platformCounts);
      } catch (diagErr) {
        console.warn('sendToTokens: diagnostic logging failed', diagErr);
      }

      // De-duplicate tokens by deviceId when available, otherwise by token.
      // This prevents sending multiple notifications to the same physical device
      // (e.g., Expo + native FCM tokens or multiple token docs).
      let dedupedTokenObjs = tokenObjs;
      try {
        const map = new Map<string, { token: string; platform?: string; docId?: string; deviceId?: string }>();
        for (const t of tokenObjs) {
          const key = t.deviceId || t.token;
          if (!map.has(key)) {
            map.set(key, t);
          } else {
            // Keep the first seen token for this deviceId/key and log the duplication for diagnostics
            const existing = map.get(key);
            console.log('sendToTokens: dedupe skipped duplicate token for key=', key, 'existing=', existing?.token?.slice(0,8), 'skipped=', t.token?.slice(0,8));
          }
        }
        dedupedTokenObjs = Array.from(map.values());
      } catch (dedupeErr) {
        console.warn('sendToTokens: dedupe step failed, continuing with original token list', dedupeErr);
      }

      const batches = chunk(dedupedTokenObjs, 450); // keep under FCM limit
      let successCount = 0;
      let failureCount = 0;
      const failures: any[] = [];

      for (const batch of batches) {
        // Build messages for sendAll/sendMulticast
        const messages: admin.messaging.Message[] = batch.map((tObj) => {
          const token = tObj.token;
          const platformRaw = tObj.platform || '';
          const platform = (typeof platformRaw === 'string') ? platformRaw.toLowerCase() : '';

          // Consider unknown/empty platforms as web to avoid sending notification payloads
          // to browser tokens that may display duplicates. Explicitly treat common native
          // platform identifiers as native.
          const nativePlatforms = ['android', 'ios', 'expo', 'apns', 'fcm'];
          const webIndicators = ['web', 'browser', 'chrome', 'edge', 'firefox', 'safari'];

          const isWeb = !platform || webIndicators.includes(platform);
          const isNativePlatform = nativePlatforms.includes(platform);

          const baseData = (data && typeof data === 'object') ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {};
          const imageUrl = data?.image || '';

          // If we confidently detect a web/platform, send data-only so the service worker controls display.
          // If we detect a native platform, include notification so OS displays it.
          // For unknown platforms (should be rare) treat as web to avoid duplicate browser notifications.
          if (isWeb && !isNativePlatform) {
            const webpushConfig: any = {
              headers: { Urgency: 'high' },
            };

            // Add image to webpush notification if available
            if (imageUrl) {
              webpushConfig.notification = {
                title,
                body,
                icon: imageUrl, // Use image as icon for web notifications
                image: imageUrl,
              };
            }

            return {
              token,
              data: { ...baseData, _title: title, _body: body }, // include title/body in data so web client can display if desired
              webpush: webpushConfig,
              // Keep android/apns hints to help delivery but do NOT include notification payload
              android: { priority: 'high' },
              apns: { headers: { 'apns-priority': '10' } },
            } as admin.messaging.Message;
          }

          // Native: include notification so OS displays the notification
          const notificationConfig: any = {
            title,
            body,
          };

          // Add image to notification if available
          if (imageUrl) {
            notificationConfig.image = imageUrl;
          }

          return {
            token,
            notification: notificationConfig,
            data: baseData,
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
          } as admin.messaging.Message;
        });

        // Prefer sendAll if available (recent admin SDKs)
        const mg = messaging as any;
        if (typeof mg.sendAll === 'function') {
          try {
            const resp = await mg.sendAll(messages);
            successCount += resp.successCount || 0;
            failureCount += resp.failureCount || 0;
            if (resp.failureCount > 0 && Array.isArray(resp.responses)) {
              resp.responses.forEach((r: any, i: number) => {
                if (!r.success) failures.push({ token: batch[i].token, error: r.error?.toString() || r.error });
              });
            }
            continue;
          } catch (e) {
            // fall through to try other methods
            console.warn('sendToTokens: sendAll failed, falling back', e);
          }
        }

        // Final fallback: send messages individually (serially to avoid TCP bursts)
        for (let i = 0; i < batch.length; i++) {
          const msg = messages[i];
          try {
            const resp = await mg.send(msg);
            if (resp) successCount += 1;
          } catch (e: any) {
            failureCount += 1;
            failures.push({ token: batch[i].token, error: e?.toString() || e });
          }
        }
      }

      // If we found failures, try to mark matching tokens in Firestore as inactive
      if (failures.length > 0) {
        try {
          const failedTokens = Array.from(new Set(failures.map((f: any) => f.token).filter(Boolean)));
          console.log('sendToTokens: marking', failedTokens.length, 'failed tokens inactive in Firestore');

          // For each failed token, find docs and mark inactive + record last error
          for (const t of failedTokens) {
            try {
              const snap = await firestore.collection('userTokens').where('token', '==', t).get();
              if (!snap.empty) {
                for (const d of snap.docs) {
                  try {
                    await d.ref.update({
                      active: false,
                      lastError: failures.find(f => f.token === t)?.error || 'send-failed',
                      invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    console.log('sendToTokens: marked token inactive for doc', d.id);
                  } catch (updateErr) {
                    console.warn('sendToTokens: failed to update token doc', d.id, updateErr);
                  }
                }
              } else {
                console.log('sendToTokens: no firestore doc found for failed token', t);
              }
            } catch (queryErr) {
              console.warn('sendToTokens: error querying token', t, queryErr);
            }
          }
        } catch (cleanupErr) {
          console.warn('sendToTokens: cleanup of failed tokens failed', cleanupErr);
        }
      }

      return { successCount, failureCount, failures };
    };

    if (type === 'topic') {
      if (!topic) {
        res.status(400).json({ error: 'Missing topic for topic send' });
        return;
      }

      const baseData = (data && typeof data === 'object') ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {};
      const imageUrl = data?.image || '';

      const notificationConfig: any = {
        title,
        body,
      };

      // Add image to notification if available
      if (imageUrl) {
        notificationConfig.image = imageUrl;
      }

      const message: admin.messaging.Message = {
        topic: topic,
        notification: notificationConfig,
        data: baseData,
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

      // Get tokens for the user (include platform & doc id for platform-specific handling)
      // Build query for user tokens. If deviceId is provided, target only that device.
      let tokensQuery: any = firestore
        .collection('userTokens')
        .where('userId', '==', userId)
        .where('active', '==', true);

      if (deviceId) {
        tokensQuery = tokensQuery.where('deviceId', '==', deviceId);
      }

      const tokensSnap = await tokensQuery.get();

      const tokenObjs = tokensSnap.docs
        .map((d: any) => {
          const data = d.data() || {};
          return {
            token: data.token,
            platform: data.platform,
            deviceId: data.deviceId || null,
            docId: d.id,
          };
        })
        .filter((t: any) => t.token);

      if (tokenObjs.length === 0) {
        res.status(200).json({ success: true, note: 'no-tokens-for-user', sent: 0 });
        return;
      }

      // Diagnostic logging
      console.log('sendNotification:user -> userId=', userId, 'resolvedTokens=', tokenObjs.map((t: { token?: string; platform?: string; docId: string }) => ({ token: t.token?.slice(0,8), platform: t.platform, docId: t.docId })));

      const result = await sendToTokens(tokenObjs);
      res.status(200).json({ success: true, sent: result.successCount, failures: result.failures, failureCount: result.failureCount });
      return;
    }

    if (type === 'broadcast') {
      // Optionally send to topic if provided
      if (topic) {
        const baseData = (data && typeof data === 'object') ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {};
        const imageUrl = data?.image || '';

        const notificationConfig: any = {
          title,
          body,
        };

        // Add image to notification if available
        if (imageUrl) {
          notificationConfig.image = imageUrl;
        }

        const message: admin.messaging.Message = {
          topic,
          notification: notificationConfig,
          data: baseData,
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

      const tokenObjs = tokensSnap.docs
        .map((d: any) => {
          const data = d.data() || {};
          return {
            token: data.token,
            platform: data.platform,
            deviceId: data.deviceId || null,
            docId: d.id,
          };
        })
        .filter((t: any) => t.token);

      if (tokenObjs.length === 0) {
        res.status(200).json({ success: true, note: 'no-tokens-found', sent: 0 });
        return;
      }

      console.log('sendNotification:broadcast -> totalTokens=', tokenObjs.length);
      const result = await sendToTokens(tokenObjs);
      res.status(200).json({ success: true, sent: result.successCount, failures: result.failures, failureCount: result.failureCount });
      return;
    }

    res.status(400).json({ error: 'Unknown type' });
  } catch (error) {
    console.error('sendNotification API error:', error);
    res.status(500).json({ error: String(error) });
  }
}
