"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@flux/ui';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/image-to-pdf', label: 'Image to PDF' },
  { href: '/pdf-to-image', label: 'PDF to Image' },
  { href: '/compress', label: 'Compress' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">FluxConvert</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active ? 'text-white' : 'text-white/60 hover:text-white',
                )}
              >
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
