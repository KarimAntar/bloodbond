import React, { useRef, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  threshold?: number;
};

/**
 * PullToRefresh
 *
 * - On native (iOS/Android) this is a no-op wrapper (the existing RefreshControl on ScrollView/FlatList continues to work).
 * - On web it provides a lightweight touch-based pull-to-refresh wrapper that:
 *   - Listens to touch events when the scroll container is at the top.
 *   - Detects a downward pull above `threshold` and calls `onRefresh`.
 *   - Shows a small spinner while pulling or when `refreshing` is true.
 *
 * Usage:
 * Wrap scrollable content (e.g. a FlatList) on web:
 * <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
 *   <FlatList ... />
 * </PullToRefresh>
 */
export default function PullToRefresh({ refreshing, onRefresh, children, threshold = 60 }: Props) {
  if (Platform.OS !== 'web') return <>{children}</>;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const pulledRef = useRef<number>(0);
  const [pulling, setPulling] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    pulledRef.current = 0;
    setPulling(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;

    // only allow pull-to-refresh when at the top of the scroll container
    if (el.scrollTop > 0) return;

    const startY = startYRef.current;
    if (startY == null) return;

    const delta = e.touches[0].clientY - startY;
    if (delta > 0) {
      // prevent the browser from performing its own overscroll action
      e.preventDefault();
      pulledRef.current = delta;
      if (delta > 10) setPulling(true);
    }
  };

  const onTouchEnd = () => {
    const pulled = pulledRef.current;
    startYRef.current = null;
    pulledRef.current = 0;

    if (!refreshing && pulling && pulled >= threshold) {
      onRefresh();
    }

    setPulling(false);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        height: '100%',
      }}
    >
      <div style={{
        height: (pulling || refreshing) ? 48 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'height 120ms ease-out',
      }}>
        {(pulling || refreshing) && (
          <div style={{
            width: 20,
            height: 20,
            border: '3px solid rgba(0,0,0,0.15)',
            borderTopColor: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            animation: 'ptr-spin 1s linear infinite'
          }} />
        )}
      </div>

      {children}

      <style>{`
        @keyframes ptr-spin { to { transform: rotate(360deg); } }
        /* ensure inner scrollable children don't disable touch scrolling on web */
        div[style*="overflow-y: auto"] > * {
          -webkit-user-select: none;
        }
      `}</style>
    </div>
  );
}
