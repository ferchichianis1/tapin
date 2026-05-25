# Skill: Tailwind Component

## When to Use
Use this skill when building any new React component that will be styled with Tailwind CSS.

## Component Checklist
- [ ] Default export is a named function component (not arrow function for RSC compatibility)
- [ ] Props typed with a `<ComponentName>Props` interface immediately above the component
- [ ] `"use client"` directive only if the component uses hooks, browser APIs, or event listeners
- [ ] No inline `style` props for values expressible in Tailwind
- [ ] Responsive: mobile-first, use `sm:` / `md:` / `lg:` breakpoints
- [ ] Dark mode: use `dark:` variant on every color utility

## Template (Server Component)
```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className }: CardProps) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className ?? ""}`}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </div>
  );
}
```

## Template (Client Component)
```tsx
"use client";

import { useState } from "react";

interface ToggleProps {
  label: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export default function Toggle({ label, defaultChecked = false, onChange }: ToggleProps) {
  const [checked, setChecked] = useState(defaultChecked);

  function handleClick() {
    const next = !checked;
    setChecked(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
```

## TapIn Design Tokens (Tailwind Classes)
| Token | Class |
|---|---|
| Primary brand | `bg-indigo-600`, `text-indigo-600` |
| Surface | `bg-white dark:bg-zinc-900` |
| Border | `border-zinc-200 dark:border-zinc-800` |
| Heading | `text-zinc-900 dark:text-zinc-100` |
| Body text | `text-zinc-600 dark:text-zinc-400` |
| Success | `text-emerald-600` |
| Error | `text-red-600` |
