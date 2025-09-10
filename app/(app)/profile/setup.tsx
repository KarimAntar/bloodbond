import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function ProfileSetupScreen() {
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [city, setCity] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [loading, setLoading] = useState(true); // NEW: loading while checking profile
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data?.profileComplete) {
            // Redirect if profile is already complete
            router.replace('/');
            return;
          }

          // Pre-fill if partial data exists
          setFullName(data.fullName || '');
          setBloodType(data.bloodType || '');
          setCity(data.city || '');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        Alert.alert('Error', 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!fullName || !bloodType || !city) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user!.uid);

      await setDoc(userDocRef, {
        fullName,
        bloodType,
        city,
        profileComplete: true,
      }, { merge: true });

      Alert.alert('Success', 'Profile saved successfully!');
      setProfileSaved(true);
      router.replace('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save your profile.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d90429" />
        <Text style={{ marginTop: 10 }}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🩸 Setup Your Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />

      <Picker
        selectedValue={bloodType}
        style={styles.input}
        onValueChange={(itemValue: string) => setBloodType(itemValue)}
      >
        <Picker.Item label="Select Blood Type" value="" />
        <Picker.Item label="A+" value="A+" />
        <Picker.Item label="A-" value="A-" />
        <Picker.Item label="B+" value="B+" />
        <Picker.Item label="B-" value="B-" />
        <Picker.Item label="AB+" value="AB+" />
        <Picker.Item label="AB-" value="AB-" />
        <Picker.Item label="O+" value="O+" />
        <Picker.Item label="O-" value="O-" />
      </Picker>

      <TextInput
        style={styles.input}
        placeholder="City"
        value={city}
        onChangeText={setCity}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: profileSaved ? '#ccc' : '#d90429' }]}
        onPress={handleSaveProfile}
        disabled={profileSaved}
      >
        <Text style={styles.buttonText}>
          {profileSaved ? 'Profile Saved' : 'Save Profile'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#d90429',
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});
