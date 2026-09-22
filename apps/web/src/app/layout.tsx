import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { SplashScreen } from '@/components/SplashScreen';
import { Footer } from '@/components/Footer';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'Precursor · Autonomous On-Chain Defense Infrastructure',
  description:
    'Behavior-first pre-transaction DeFi defense system that detects multi-step attack sequences, simulates solvency invariants, and enforces on-chain blocks before funds move.',
  icons: {
    icon: `${basePath}/favicon.png`,
    shortcut: `${basePath}/favicon.png`,
    apple: `${basePath}/logo.png`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="icon" href={`${basePath}/favicon.png`} sizes="any" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('precursor-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');}else{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[#F7F7F2] dark:bg-[#090c12] text-[#111215] dark:text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-[#D4F63D] dark:selection:bg-[#00F5A0] selection:text-[#111215] transition-colors duration-200">
        <SplashScreen />
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
