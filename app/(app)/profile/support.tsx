import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SupportOption: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}> = ({ icon, title, subtitle, onPress, color = '#666' }) => (
  <TouchableOpacity style={styles.supportOption} onPress={onPress}>
    <View style={[styles.optionIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.optionContent}>
      <Text style={styles.optionTitle}>{title}</Text>
      {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

const FAQItem: React.FC<{
  question: string;
  answer: string;
  isExpanded: boolean;
  onPress: () => void;
}> = ({ question, answer, isExpanded, onPress }) => (
  <TouchableOpacity style={styles.faqItem} onPress={onPress}>
    <View style={styles.faqHeader}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Ionicons
        name={isExpanded ? "chevron-up" : "chevron-down"}
        size={20}
        color="#666"
      />
    </View>
    {isExpanded && (
      <Text style={styles.faqAnswer}>{answer}</Text>
    )}
  </TouchableOpacity>
);

export default function SupportScreen() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const faqs = [
    {
      question: "How do I create a blood donation request?",
      answer: "Tap the '+' button on the Requests tab, fill in your details including blood type, location, hospital, and any additional notes. Your request will be visible to potential donors in your area."
    },
    {
      question: "How do I respond to a blood donation request?",
      answer: "Browse available requests on the Requests tab. When you find a compatible request, tap 'Respond' and provide your contact information and availability. The requester will be notified of your response."
    },
    {
      question: "What blood types are compatible?",
      answer: "The app shows you requests that match your blood type compatibility. For example, if you have O+ blood, you can donate to O+, A+, B+, and AB+ recipients."
    },
    {
      question: "How do I edit my profile information?",
      answer: "Go to your Profile tab and tap 'Edit Profile'. You can update your name, blood type, location, and contact information."
    },
    {
      question: "Can I see my donation history?",
      answer: "Yes! Go to your Profile tab and tap 'Donation History' to view all your past donations and responses."
    },
    {
      question: "How do I contact emergency services?",
      answer: "The app includes an Emergency Contacts feature where you can store and quickly access important emergency numbers."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we take privacy seriously. Your personal information is encrypted and only shared with verified donors/requesters when necessary for blood donation coordination."
    },
    {
      question: "How do I report inappropriate content?",
      answer: "If you encounter inappropriate content or behavior, please contact our support team immediately. Admin users can also moderate content directly."
    }
  ];

  const handleEmailSupport = async () => {
    setLoading(true);
    try {
      const email = 'support@bloodbond.com';
      const subject = 'BloodBond Support Request';
      const body = 'Hello BloodBond Support Team,\n\nI need help with...\n\n';

      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email app. Please email support@bloodbond.com directly.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open email app. Please email support@bloodbond.com directly.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallSupport = () => {
    Alert.alert(
      'Call Support',
      'Our support hotline: +1 (555) 123-4567\n\nAvailable 24/7 for urgent assistance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL('tel:+201066241997')
        }
      ]
    );
  };

  const handleWhatsAppSupport = async () => {
    setLoading(true);
    try {
      const phoneNumber = '+201066241997';
      const message = 'Hello! I need help with BloodBond app.';

      const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp not installed', 'Please install WhatsApp to contact support via WhatsApp.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open WhatsApp. Please try another contact method.');
    } finally {
      setLoading(false);
    }
  };

  const handleAboutApp = () => {
    Alert.alert(
      'About BloodBond',
      'BloodBond v1.0.0\n\nConnecting blood donors with those in need.\n\nOur mission is to save lives by making blood donation requests and responses seamless and efficient.\n\n© 2025 BloodBond. All rights reserved.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Privacy Policy content would be displayed here in a web view or separate screen.');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'Terms of Service content would be displayed here in a web view or separate screen.');
  };

  const handleReportBug = () => {
    Alert.alert(
      'Report a Bug',
      'Help us improve BloodBond by reporting issues you encounter. Your feedback is valuable and helps us create a better experience for all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Bug',
          onPress: () => router.push('/(app)/profile/bug-report')
        }
      ]
    );
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Support & Help</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.optionsContainer}>
            <SupportOption
              icon="mail"
              title="Email Support"
              subtitle="Get help from our team"
              onPress={handleEmailSupport}
              color="#E53E3E"
            />
            <SupportOption
              icon="call"
              title="Call Support"
              subtitle="24/7 hotline for urgent help"
              onPress={handleCallSupport}
              color="#10B981"
            />
            <SupportOption
              icon="logo-whatsapp"
              title="WhatsApp Support"
              subtitle="Chat with our support team"
              onPress={handleWhatsAppSupport}
              color="#25D366"
            />
            <SupportOption
              icon="bug"
              title="Report a Bug"
              subtitle="Help us improve the app"
              onPress={handleReportBug}
              color="#F56500"
            />
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isExpanded={expandedFAQ === index}
                onPress={() => toggleFAQ(index)}
              />
            ))}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.optionsContainer}>
            <SupportOption
              icon="information-circle"
              title="About BloodBond"
              subtitle="Learn about our mission"
              onPress={handleAboutApp}
              color="#3182CE"
            />
            <SupportOption
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={handlePrivacyPolicy}
              color="#8B5CF6"
            />
            <SupportOption
              icon="document-text"
              title="Terms of Service"
              subtitle="Our terms and conditions"
              onPress={handleTermsOfService}
              color="#38A169"
            />
          </View>
        </View>

        {/* Quick Help */}
        <View style={styles.quickHelpContainer}>
          <Text style={styles.quickHelpTitle}>Need Immediate Help?</Text>
          <Text style={styles.quickHelpText}>
            For urgent blood donation needs, please contact your local hospital or blood bank directly.
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleCallSupport}>
            <Ionicons name="call" size={20} color="white" />
            <Text style={styles.emergencyButtonText}>Emergency Hotline</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>BloodBond v1.0.0</Text>
          <Text style={styles.versionSubtext}>Thank you for using BloodBond!</Text>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E53E3E" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  optionsContainer: {
    backgroundColor: 'white',
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  faqContainer: {
    backgroundColor: 'white',
  },
  faqItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
    paddingLeft: 0,
  },
  quickHelpContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

  },
  quickHelpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  quickHelpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 100,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
