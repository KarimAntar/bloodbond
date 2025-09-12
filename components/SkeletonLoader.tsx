import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  marginBottom = 8,
  style 
}) => {
  const { colors } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          marginBottom,
          backgroundColor: colors.border,
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  colors: any;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ colors }) => (
  <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
    <View style={styles.cardHeader}>
      <SkeletonLoader width={40} height={40} borderRadius={20} marginBottom={0} />
      <View style={styles.cardHeaderText}>
        <SkeletonLoader width="60%" height={16} marginBottom={4} />
        <SkeletonLoader width="40%" height={12} marginBottom={0} />
      </View>
      <SkeletonLoader width={60} height={24} borderRadius={12} marginBottom={0} />
    </View>
    <SkeletonLoader width="100%" height={14} marginBottom={4} />
    <SkeletonLoader width="80%" height={14} marginBottom={8} />
    <View style={styles.cardFooter}>
      <SkeletonLoader width={80} height={12} marginBottom={0} />
      <SkeletonLoader width={60} height={12} marginBottom={0} />
    </View>
  </View>
);

interface SkeletonListProps {
  itemCount?: number;
  colors: any;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ itemCount = 3, colors }) => (
  <View>
    {Array.from({ length: itemCount }).map((_, index) => (
      <SkeletonCard key={index} colors={colors} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
