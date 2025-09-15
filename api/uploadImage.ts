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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const adminSdk = initAdmin();
    const bucket = adminSdk.storage().bucket();

    // Expect the image as base64 or multipart form data
    const { imageData, filename } = req.body;

    if (!imageData || !filename) {
      res.status(400).json({ error: 'Missing imageData or filename' });
      return;
    }

    // Generate unique filename
    const uniqueFilename = `${Date.now()}_${filename}`;
    const filePath = `notifications/${uniqueFilename}`;
    const file = bucket.file(filePath);

    // Convert base64 to buffer if needed
    let buffer: Buffer;
    if (imageData.startsWith('data:image/')) {
      // Handle base64 with data URL
      const base64Data = imageData.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // Assume it's already base64
      buffer = Buffer.from(imageData, 'base64');
    }

    // Upload to Firebase Storage
    await file.save(buffer, {
      metadata: {
        contentType: 'image/jpeg', // Adjust based on actual image type
      },
      public: true, // Make the file publicly accessible
    });

    // Get the public URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    res.status(200).json({ success: true, downloadUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}
