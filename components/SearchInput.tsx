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
      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
    />
  );
}
