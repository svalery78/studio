"use client";

import { useState, useEffect } from 'react';

function getValueFromLocalStorage<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => getValueFromLocalStorage(key, initialValue));

  useEffect(() => {
    // This effect ensures that the state is synchronized with localStorage
    // if it's updated by another tab or window.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(event.newValue ? JSON.parse(event.newValue) : initialValue);
      }
    };
    
    // Also, re-read from local storage on mount in case it changed since initial render pass.
    // This is particularly for cases where the initialValue might be stale if SSR is involved.
    setStoredValue(getValueFromLocalStorage(key, initialValue));

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);


  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
