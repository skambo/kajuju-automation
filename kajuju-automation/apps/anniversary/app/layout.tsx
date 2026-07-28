import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Your Anniversary Invitation — Idan Barn Suites & Café',
  description:
    'A personal invitation back to Idan Barn Suites & Café, Naromoru — Mt Kenya, for guests who stayed with us during our first year.',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
