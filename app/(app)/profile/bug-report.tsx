import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { submitBugReport, getBugReportTemplate, BugReport } from '../../../utils/bugReporting';

const CategoryButton: React.FC<{
  category: string;
  isSelected: boolean;
  onPress: () => void;
  icon: string;
  color: string;
}> = ({ category, isSelected, onPress, icon, color }) => (
  <TouchableOpacity
    style={[
      styles.categoryButton,
      isSelected && { backgroundColor: color + '20', borderColor: color }
    ]}
    onPress={onPress}
  >
    <Ionicons name={icon as any} size={20} color={isSelected ? color : '#666'} />
    <Text style={[styles.categoryText, isSelected && { color }]}>
      {category}
    </Text>
  </TouchableOpacity>
);

const PriorityButton: React.FC<{
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  isSelected: boolean;
  onPress: () => void;
}> = ({ priority, isSelected, onPress }) => {
  const colors = {
    Low: '#10B981',
    Medium: '#F59E0B',
    High: '#EF4444',
    Critical: '#DC2626'
  };

  return (
    <TouchableOpacity
      style={[
        styles.priorityButton,
        isSelected && { backgroundColor: colors[priority] + '20', borderColor: colors[priority] }
      ]}
      onPress={onPress}
    >
      <Text style={[styles.priorityText, isSelected && { color: colors[priority] }]}>
        {priority}
      </Text>
    </TouchableOpacity>
  );
};

export default function BugReportScreen() {
  const [category, setCategory] = useState<BugReport['category'] | ''>('');
  const [priority, setPriority] = useState<BugReport['priority']>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const categories = [
    { name: 'App Crash', value: 'crash' as const, icon: 'warning', color: '#DC2626' },
    { name: 'UI Issue', value: 'ui' as const, icon: 'color-palette', color: '#7C3AED' },
    { name: 'Feature Request', value: 'feature' as const, icon: 'bulb', color: '#F59E0B' },
    { name: 'Performance', value: 'performance' as const, icon: 'speedometer', color: '#EF4444' },
    { name: 'Other', value: 'other' as const, icon: 'help-circle', color: '#6B7280' },
  ];

  const priorities: Array<{ name: string; value: BugReport['priority'] }> = [
    { name: 'Low', value: 'low' },
    { name: 'Medium', value: 'medium' },
    { name: 'High', value: 'high' },
    { name: 'Critical', value: 'critical' }
  ];

  const handleCategorySelect = (selectedCategory: BugReport['category']) => {
    setCategory(selectedCategory);
    const template = getBugReportTemplate(selectedCategory);
    setTitle(template.title);
    setSteps(template.steps);
    setExpectedBehavior(template.expectedBehavior);
  };

  const validateForm = () => {
    if (!category.trim()) {
      Alert.alert('Missing Information', 'Please select a category for your bug report.');
      return false;
    }
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please provide a title for your bug report.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please provide a description of the issue.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await submitBugReport(
        'current-user-id', // TODO: Get from auth context
        'user@example.com', // TODO: Get from auth context
        {
          category: category as BugReport['category'],
          priority,
          title: title.trim(),
          description: description.trim(),
          steps: steps.filter(step => step.trim()),
          expectedBehavior: expectedBehavior.trim(),
          actualBehavior: actualBehavior.trim(),
        }
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      Alert.alert(
        'Bug Report Submitted',
        'Thank you for helping us improve BloodBond! Your bug report has been submitted successfully and our team will review it.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert(
        'Submission Failed',
        'Unable to submit your bug report. Please try again later or contact support directly.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Report a Bug</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={[styles.submitButton, loading && styles.disabledButton]}>
            Submit
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Ionicons name="information-circle" size={20} color="#3182CE" />
          <Text style={styles.helpText}>
            Help us fix issues faster by providing detailed information about the problem you encountered.
          </Text>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <CategoryButton
                key={cat.value}
                category={cat.name}
                isSelected={category === cat.value}
                onPress={() => handleCategorySelect(cat.value)}
                icon={cat.icon}
                color={cat.color}
              />
            ))}
          </View>
        </View>

        {/* Priority Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.prioritiesRow}>
            {priorities.map((p) => (
              <PriorityButton
                key={p.value}
                priority={p.name as 'Low' | 'Medium' | 'High' | 'Critical'}
                isSelected={priority === p.value}
                onPress={() => setPriority(p.value)}
              />
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief summary of the issue"
            placeholderTextColor="#999"
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Steps to Reproduce */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps to Reproduce</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={steps.join('\n')}
            onChangeText={(text) => setSteps(text.split('\n').filter(step => step.trim()))}
            placeholder="1. Go to...&#10;2. Tap on...&#10;3. Notice..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            maxLength={300}
          />
          <Text style={styles.charCount}>{steps.join('\n').length}/300</Text>
        </View>

        {/* Expected Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Behavior</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={expectedBehavior}
            onChangeText={setExpectedBehavior}
            placeholder="What should have happened?"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            maxLength={200}
          />
          <Text style={styles.charCount}>{expectedBehavior.length}/200</Text>
        </View>

        {/* Actual Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actual Behavior</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={actualBehavior}
            onChangeText={setActualBehavior}
            placeholder="What actually happened?"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            maxLength={200}
          />
          <Text style={styles.charCount}>{actualBehavior.length}/200</Text>
        </View>

        {/* Device Info Note */}
        <View style={styles.deviceInfoNote}>
          <Ionicons name="phone-portrait" size={16} color="#666" />
          <Text style={styles.deviceInfoText}>
            Device and app information will be automatically included with your report.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButtonLarge, loading && styles.disabledButtonLarge]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="white" />
              <Text style={styles.submitButtonText}>Submit Bug Report</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  submitButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
  },
  disabledButton: {
    color: '#999',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  prioritiesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  textInput: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#1a1a1a',
  },
  multilineInput: {
    minHeight: 80,
    maxHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  deviceInfoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  deviceInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  submitButtonLarge: {
    backgroundColor: '#E53E3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  disabledButtonLarge: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100,
  },
});
