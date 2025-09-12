import { Platform } from 'react-native';

export interface CaptchaResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AntiSpamConfig {
  enableCaptcha: boolean;
  maxRequestsPerDay: number;
  minTimeBetweenRequests: number; // in minutes
  requirePhoneVerification: boolean;
  requireEmailVerification: boolean;
}

// Default anti-spam configuration
export const DEFAULT_ANTI_SPAM_CONFIG: AntiSpamConfig = {
  enableCaptcha: true,
  maxRequestsPerDay: 5, // Max 5 requests per day per user
  minTimeBetweenRequests: 30, // 30 minutes between requests
  requirePhoneVerification: true,
  requireEmailVerification: true,
};

// reCAPTCHA configuration - Platform specific keys
export const RECAPTCHA_SITE_KEY = Platform.select({
  web: '6LfOlsYrAAAAAMMsl2oVqle8LVvftDIOPd6DKU7P',
  android: '6LdEvcYrAAAAAA2JvCzTrWKPq6G8fKpoHv8rYof5',
  ios: '6LfRlsYrAAAAAM8sghmUHBnbGb0Cl3ND3nSh48Kd',
  default: '6LfOlsYrAAAAAMMsl2oVqle8LVvftDIOPd6DKU7P' // Fallback to web key
});

// Note: Secret keys should be stored securely on your backend server
// These are the corresponding secret keys for server-side verification:
// Web: (should be stored on server only)
// Android: (should be stored on server only) 
// iOS: (should be stored on server only)
export const RECAPTCHA_SECRET_KEY = 'SERVER_SIDE_SECRET_KEY'; // This should be handled on your backend

/**
 * Initialize reCAPTCHA for web platform
 */
export const initializeRecaptcha = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      resolve();
      return;
    }

    // Check if reCAPTCHA is already loaded
    if ((window as any).grecaptcha) {
      resolve();
      return;
    }

    // Load reCAPTCHA script
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=' + RECAPTCHA_SITE_KEY;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Wait for grecaptcha to be ready
      const checkReady = () => {
        if ((window as any).grecaptcha && (window as any).grecaptcha.ready) {
          (window as any).grecaptcha.ready(() => {
            resolve();
          });
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };

    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Execute reCAPTCHA challenge
 */
export const executeRecaptcha = async (action: string = 'submit'): Promise<CaptchaResult> => {
  try {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      // On mobile, return success as we'll use other verification methods
      return { success: true };
    }

    if (!(window as any).grecaptcha) {
      await initializeRecaptcha();
    }

    const token = await (window as any).grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
    
    return {
      success: true,
      token
    };
  } catch (error) {
    console.error('reCAPTCHA execution failed:', error);
    return {
      success: false,
      error: 'Failed to verify captcha. Please try again.'
    };
  }
};

/**
 * Verify reCAPTCHA token on server side (this would typically be done in a cloud function)
 */
export const verifyRecaptchaToken = async (token: string): Promise<boolean> => {
  try {
    // In a real implementation, this would be done on your backend server
    // This is just a placeholder for the verification logic
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const result = await response.json();
    return result.success && result.score > 0.5; // Adjust threshold as needed
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

/**
 * Alternative verification for mobile platforms
 */
export const executeMobileVerification = async (): Promise<CaptchaResult> => {
  // For mobile platforms, we can implement alternative verification methods
  // Such as SMS verification, email confirmation, or simple math problems
  
  return new Promise((resolve) => {
    // Simple math captcha for mobile
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const correctAnswer = num1 + num2;

    // In a real app, you would show this as a modal or alert
    // For now, we'll simulate user input
    const userAnswer = prompt(`Please solve: ${num1} + ${num2} = ?`);
    
    if (userAnswer && parseInt(userAnswer) === correctAnswer) {
      resolve({ success: true });
    } else {
      resolve({ success: false, error: 'Incorrect answer. Please try again.' });
    }
  });
};

/**
 * Check if user has exceeded spam limits
 */
export const checkSpamLimits = async (
  userId: string,
  type: 'request' | 'response',
  config: AntiSpamConfig = DEFAULT_ANTI_SPAM_CONFIG
): Promise<{ allowed: boolean; reason?: string; waitTime?: number }> => {
  try {
    // This would typically check against your database
    // For now, we'll use localStorage for demo purposes
    const key = `spam_check_${userId}_${type}`;
    const data = localStorage.getItem(key);
    const now = Date.now();

    if (!data) {
      // First time, allow and store
      localStorage.setItem(key, JSON.stringify({
        count: 1,
        lastRequest: now,
        dailyCount: 1,
        dailyReset: now + (24 * 60 * 60 * 1000) // 24 hours from now
      }));
      return { allowed: true };
    }

    const spamData = JSON.parse(data);

    // Reset daily count if 24 hours have passed
    if (now > spamData.dailyReset) {
      spamData.dailyCount = 0;
      spamData.dailyReset = now + (24 * 60 * 60 * 1000);
    }

    // Check daily limit
    if (spamData.dailyCount >= config.maxRequestsPerDay) {
      const resetTime = new Date(spamData.dailyReset);
      return {
        allowed: false,
        reason: `Daily limit of ${config.maxRequestsPerDay} ${type}s exceeded. Try again after ${resetTime.toLocaleTimeString()}.`
      };
    }

    // Check time between requests
    const timeSinceLastRequest = (now - spamData.lastRequest) / (1000 * 60); // in minutes
    if (timeSinceLastRequest < config.minTimeBetweenRequests) {
      const waitTime = Math.ceil(config.minTimeBetweenRequests - timeSinceLastRequest);
      return {
        allowed: false,
        reason: `Please wait ${waitTime} minutes before creating another ${type}.`,
        waitTime
      };
    }

    // Update counters
    spamData.count++;
    spamData.dailyCount++;
    spamData.lastRequest = now;
    localStorage.setItem(key, JSON.stringify(spamData));

    return { allowed: true };
  } catch (error) {
    console.error('Error checking spam limits:', error);
    // If check fails, err on the side of caution but allow
    return { allowed: true };
  }
};

/**
 * Comprehensive anti-spam verification
 */
export const performAntiSpamVerification = async (
  userId: string,
  type: 'request' | 'response',
  action: string = 'submit',
  config: AntiSpamConfig = DEFAULT_ANTI_SPAM_CONFIG
): Promise<{
  success: boolean;
  captchaToken?: string;
  error?: string;
  waitTime?: number;
}> => {
  try {
    // First, check spam limits
    const spamCheck = await checkSpamLimits(userId, type, config);
    if (!spamCheck.allowed) {
      return {
        success: false,
        error: spamCheck.reason,
        waitTime: spamCheck.waitTime
      };
    }

    // If captcha is enabled, perform captcha verification
    if (config.enableCaptcha) {
      let captchaResult: CaptchaResult;
      
      if (Platform.OS === 'web') {
        captchaResult = await executeRecaptcha(action);
      } else {
        captchaResult = await executeMobileVerification();
      }

      if (!captchaResult.success) {
        return {
          success: false,
          error: captchaResult.error || 'Captcha verification failed'
        };
      }

      return {
        success: true,
        captchaToken: captchaResult.token
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Anti-spam verification failed:', error);
    return {
      success: false,
      error: 'Verification failed. Please try again.'
    };
  }
};

/**
 * Report spam/abuse
 */
export const reportSpam = async (
  reporterId: string,
  targetUserId: string,
  targetType: 'request' | 'response' | 'user',
  targetId: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // In a real app, this would save to your database
    const report = {
      id: Date.now().toString(),
      reporterId,
      targetUserId,
      targetType,
      targetId,
      reason,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    console.log('Spam report:', report);

    // Save to local storage for demo (in real app, save to Firestore)
    const reports = JSON.parse(localStorage.getItem('spam_reports') || '[]');
    reports.push(report);
    localStorage.setItem('spam_reports', JSON.stringify(reports));

    return {
      success: true,
      message: 'Report submitted successfully. Our team will review it.'
    };
  } catch (error) {
    console.error('Error reporting spam:', error);
    return {
      success: false,
      message: 'Failed to submit report. Please try again.'
    };
  }
};
