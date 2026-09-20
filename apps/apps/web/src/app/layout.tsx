import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'FluxConvert',
  description: 'Fast, private, in-browser file conversion tools.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
