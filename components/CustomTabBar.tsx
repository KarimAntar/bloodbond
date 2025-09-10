import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;

interface TabBarButtonProps {
  route: string;
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabBarButton: React.FC<TabBarButtonProps> = ({ route, icon, label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTabButton]}
    onPress={onPress}
  >
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <Ionicons
        name={icon as any}
        size={24}
        color={isActive ? '#E53E3E' : '#666'}
      />
    </View>
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const CustomTabBar: React.FC<any> = (props) => {
  const router = useRouter();

  const tabs = [
    { route: '/(app)/(tabs)', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { route: '/(app)/(tabs)/requests', icon: 'list-outline', activeIcon: 'list', label: 'Requests' },
    { route: '/(app)/(tabs)/create', icon: 'water', activeIcon: 'water', label: 'Donate' }, // Blood icon
    { route: '/(app)/(tabs)/activity', icon: 'pulse-outline', activeIcon: 'pulse', label: 'Activity' },
    { route: '/(app)/(tabs)/profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
  ];

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const currentTab = props.state.index;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {/* Left tabs */}
        <View style={styles.leftTabs}>
          {tabs.slice(0, 2).map((tab, index) => (
            <TabBarButton
              key={tab.route}
              route={tab.route}
              icon={currentTab === index ? tab.activeIcon : tab.icon}
              label={tab.label}
              isActive={currentTab === index}
              onPress={() => handleTabPress(tab.route)}
            />
          ))}
        </View>

        {/* Center blood donation button */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => handleTabPress(tabs[2].route)}
        >
          <LinearGradient
            colors={['#E53E3E', '#C53030']}
            style={styles.centerButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="water" size={32} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Right tabs */}
        <View style={styles.rightTabs}>
          {tabs.slice(3).map((tab, index) => (
            <TabBarButton
              key={tab.route}
              route={tab.route}
              icon={currentTab === index + 3 ? tab.activeIcon : tab.icon}
              label={tab.label}
              isActive={currentTab === index + 3}
              onPress={() => handleTabPress(tab.route)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabBar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  leftTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rightTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: '#E53E3E15',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: '#E53E3E15',
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#E53E3E',
    fontWeight: '600',
  },
  centerButton: {
    marginHorizontal: 20,
  },
  centerButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default CustomTabBar;
