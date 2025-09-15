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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const adminSdk = initAdmin();
    const bucket = adminSdk.storage().bucket('bloodbond-892f7.firebasestorage.app');

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: 'Unknown error' };
    console.error('Error details:', errorDetails);
    res.status(500).json({ error: 'Failed to upload image', details: errorMessage });
  }
}
