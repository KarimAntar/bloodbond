// utils/performance.ts
import { Platform } from 'react-native';

/**
 * Performance optimization utilities for web and mobile
 */

// Preload critical resources on web
export const preloadCriticalResources = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // Preload Firebase SDK
    const firebaseScript = document.createElement('link');
    firebaseScript.rel = 'preload';
    firebaseScript.as = 'script';
    firebaseScript.href = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
    document.head.appendChild(firebaseScript);

    // Preload fonts
    const fontPreload = document.createElement('link');
    fontPreload.rel = 'preload';
    fontPreload.as = 'font';
    fontPreload.type = 'font/ttf';
    fontPreload.crossOrigin = 'anonymous';
    fontPreload.href = './assets/fonts/SpaceMono-Regular.ttf';
    document.head.appendChild(fontPreload);
  }
};

// Debounce function for optimizing frequent operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Optimize images for web
export const optimizeImageLoading = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // Add loading="lazy" to images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });
  }
};

// Cache management for better performance
export class AppCache {
  private static instance: AppCache;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  static getInstance(): AppCache {
    if (!AppCache.instance) {
      AppCache.instance = new AppCache();
    }
    return AppCache.instance;
  }

  set(key: string, data: any, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize performance optimizations
export const initializePerformanceOptimizations = () => {
  if (Platform.OS === 'web') {
    // Preload critical resources
    preloadCriticalResources();
    
    // Set up periodic cache cleanup
    setInterval(() => {
      AppCache.getInstance().clearExpired();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Optimize images after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', optimizeImageLoading);
    } else {
      optimizeImageLoading();
    }
  }
};

// Network status detection for better UX
export const getNetworkStatus = () => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return {
      online: navigator.onLine,
      connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    };
  }
  return { online: true, connection: null };
};

// Batch Firebase operations for better performance
export const batchOperations = <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const batches: (() => Promise<T>)[][] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }

  return batches.reduce(async (acc, batch) => {
    const results = await acc;
    const batchResults = await Promise.all(batch.map(op => op()));
    return [...results, ...batchResults];
  }, Promise.resolve([] as T[]));
};
