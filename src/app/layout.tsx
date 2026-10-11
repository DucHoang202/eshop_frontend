import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Freshmart — Good Food, Happy Home',
  description: 'Fresh groceries and thoughtfully selected home essentials, every day.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
