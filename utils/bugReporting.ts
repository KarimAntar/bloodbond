import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Platform } from 'react-native';

export interface BugReport {
  id?: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  category: 'crash' | 'ui' | 'performance' | 'feature' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  deviceInfo: {
    platform: string;
    osVersion: string;
    deviceModel: string;
    appVersion: string;
  };
  steps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  screenshot?: string;
  logs?: string;
  status: 'submitted' | 'in-review' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export const getDeviceInfo = async () => {
  const deviceInfo = {
    platform: Platform.OS,
    osVersion: Platform.Version.toString(),
    deviceModel: Platform.OS === 'web' ? 'Web Browser' : 'Mobile Device',
    appVersion: '1.0.0', // This should come from app.json or package.json
  };

  return deviceInfo;
};

export const submitBugReport = async (
  userId: string,
  userEmail: string,
  bugData: {
    title: string;
    description: string;
    category: BugReport['category'];
    priority: BugReport['priority'];
    steps: string[];
    expectedBehavior: string;
    actualBehavior: string;
    screenshot?: string;
  }
): Promise<{ success: boolean; reportId?: string; message: string }> => {
  try {
    const deviceInfo = await getDeviceInfo();
    
    const bugReport: Omit<BugReport, 'id'> = {
      userId,
      userEmail,
      ...bugData,
      deviceInfo,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'bugReports'), bugReport);

    // In a real app, you might also:
    // 1. Send email notification to support team
    // 2. Create ticket in support system (Zendesk, Jira, etc.)
    // 3. Send Slack notification to dev team
    // 4. Log to error tracking service (Sentry, Bugsnag, etc.)

    return {
      success: true,
      reportId: docRef.id,
      message: `Bug report submitted successfully! Reference ID: ${docRef.id.slice(-8).toUpperCase()}`,
    };
  } catch (error) {
    console.error('Error submitting bug report:', error);
    return {
      success: false,
      message: 'Failed to submit bug report. Please try again or contact support directly.',
    };
  }
};

export const updateBugReportStatus = async (
  reportId: string,
  status: BugReport['status'],
  notes?: string
): Promise<void> => {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (notes) {
      updateData.adminNotes = notes;
    }

    await updateDoc(doc(db, 'bugReports', reportId), updateData);
  } catch (error) {
    console.error('Error updating bug report status:', error);
    throw error;
  }
};

export const getBugReportTemplate = (category: BugReport['category']): {
  title: string;
  expectedBehavior: string;
  steps: string[];
} => {
  const templates = {
    crash: {
      title: 'App Crashes When...',
      expectedBehavior: 'The app should continue working normally',
      steps: [
        'Open the app',
        'Navigate to [specific screen]',
        'Tap on [specific button/element]',
        'App crashes'
      ]
    },
    ui: {
      title: 'UI Issue with...',
      expectedBehavior: 'The interface should display correctly',
      steps: [
        'Navigate to [specific screen]',
        'Notice the UI issue',
        'Describe what looks wrong'
      ]
    },
    performance: {
      title: 'Performance Issue...',
      expectedBehavior: 'The app should respond quickly and smoothly',
      steps: [
        'Perform [specific action]',
        'Notice slow response or lag',
        'Describe the performance issue'
      ]
    },
    feature: {
      title: 'Feature Request...',
      expectedBehavior: 'New functionality should be available',
      steps: [
        'Describe the desired feature',
        'Explain how it would benefit users',
        'Provide use case examples'
      ]
    },
    other: {
      title: 'Other Issue...',
      expectedBehavior: 'Describe what should happen',
      steps: [
        'Step 1',
        'Step 2',
        'Step 3'
      ]
    }
  };

  return templates[category] || templates.other;
};

export const formatBugReportForEmail = (bugReport: BugReport): string => {
  return `
Bug Report: ${bugReport.title}
Report ID: ${bugReport.id}
User: ${bugReport.userEmail} (${bugReport.userId})
Category: ${bugReport.category.toUpperCase()}
Priority: ${bugReport.priority.toUpperCase()}

DESCRIPTION:
${bugReport.description}

EXPECTED BEHAVIOR:
${bugReport.expectedBehavior}

ACTUAL BEHAVIOR:
${bugReport.actualBehavior}

STEPS TO REPRODUCE:
${bugReport.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

DEVICE INFORMATION:
- Platform: ${bugReport.deviceInfo.platform}
- OS Version: ${bugReport.deviceInfo.osVersion}
- Device Model: ${bugReport.deviceInfo.deviceModel}
- App Version: ${bugReport.deviceInfo.appVersion}

TIMESTAMP: ${new Date(bugReport.createdAt).toLocaleString()}
STATUS: ${bugReport.status}

---
This bug report was automatically generated by BloodBond App.
`;
};
