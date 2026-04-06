'use client';

import { useRef, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchInput({ value, onChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === '' && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = '';
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="search"
      aria-label="Search recipes"
      placeholder="Search recipes\u2026"
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    />
  );
}
