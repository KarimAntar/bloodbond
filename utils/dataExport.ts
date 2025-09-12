import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface ExportData {
  profile: any;
  requests: any[];
  responses: any[];
  donations: any[];
  settings: any;
  exportDate: string;
}

export const exportUserData = async (userId: string, userEmail: string): Promise<ExportData> => {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    const profile = userDoc.exists() ? userDoc.data() : null;

    // Get user's blood requests
    const requestsQuery = query(
      collection(db, 'bloodRequests'),
      where('userId', '==', userId)
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    const requests = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get user's responses
    const responsesQuery = query(
      collection(db, 'responses'),
      where('userId', '==', userId)
    );
    const responsesSnapshot = await getDocs(responsesQuery);
    const responses = responsesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get user's donation history (responses that were accepted)
    const donationsQuery = query(
      collection(db, 'responses'),
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );
    const donationsSnapshot = await getDocs(donationsQuery);
    const donations = donationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Compile settings
    const settings = {
      theme: profile?.theme || 'system',
      notificationsEnabled: profile?.notificationsEnabled ?? true,
      locationEnabled: profile?.locationEnabled ?? true,
      biometricEnabled: profile?.biometricEnabled ?? false,
      proximityNotifications: profile?.proximityNotifications ?? true,
    };

    return {
      profile,
      requests,
      responses,
      donations,
      settings,
      exportDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw new Error('Failed to export user data');
  }
};

export const generateDataExportEmail = (data: ExportData, userEmail: string): string => {
  const emailBody = `
Dear BloodBond User,

Your data export has been completed successfully. Below is a summary of your account data:

PROFILE INFORMATION:
- Full Name: ${data.profile?.fullName || 'Not provided'}
- Email: ${userEmail}
- Blood Type: ${data.profile?.bloodType || 'Not provided'}
- Phone: ${data.profile?.phone || 'Not provided'}
- City: ${data.profile?.city || 'Not provided'}
- Account Created: ${data.profile?.createdAt || 'Unknown'}

DONATION STATISTICS:
- Blood Requests Created: ${data.requests.length}
- Responses Sent: ${data.responses.length}
- Successful Donations: ${data.donations.length}

SETTINGS:
- Theme: ${data.settings.theme}
- Notifications Enabled: ${data.settings.notificationsEnabled ? 'Yes' : 'No'}
- Location Services: ${data.settings.locationEnabled ? 'Yes' : 'No'}
- Biometric Auth: ${data.settings.biometricEnabled ? 'Yes' : 'No'}
- Proximity Notifications: ${data.settings.proximityNotifications ? 'Yes' : 'No'}

RECENT REQUESTS:
${data.requests.slice(0, 5).map((req, index) => `
${index + 1}. Blood Type: ${req.bloodType}, Hospital: ${req.hospital}, Date: ${req.createdAt}
`).join('')}

RECENT RESPONSES:
${data.responses.slice(0, 5).map((res, index) => `
${index + 1}. Status: ${res.status}, Date: ${res.createdAt}
`).join('')}

For your complete data in JSON format, please find the attachment.

Export Date: ${new Date(data.exportDate).toLocaleString()}

Thank you for using BloodBond!

Best regards,
BloodBond Support Team
`;

  return emailBody;
};

export const saveDataExportRequest = async (userId: string, userEmail: string) => {
  try {
    const exportData = await exportUserData(userId, userEmail);
    const emailContent = generateDataExportEmail(exportData, userEmail);

    // In a real app, you would:
    // 1. Save the export request to a processing queue
    // 2. Send the email via your email service (SendGrid, AWS SES, etc.)
    // 3. Generate a secure download link for the complete JSON data
    
    // For now, we'll simulate saving the request
    const exportRequest = {
      userId,
      userEmail,
      requestedAt: new Date().toISOString(),
      status: 'processing',
      emailContent,
      dataSize: JSON.stringify(exportData).length,
    };

    // Save to a mock export requests collection
    // await addDoc(collection(db, 'exportRequests'), exportRequest);

    return {
      success: true,
      message: `Data export initiated for ${userEmail}. You will receive an email within 24 hours.`,
      estimatedSize: `${(exportRequest.dataSize / 1024).toFixed(2)} KB`,
    };
  } catch (error) {
    console.error('Error saving data export request:', error);
    throw error;
  }
};
