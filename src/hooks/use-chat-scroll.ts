"use client";

import React, { useEffect, useRef } from 'react';

export function useChatScroll<T>(dep: T): React.MutableRefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dep]);
  return ref;
}
