import type { Metadata } from 'next';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CLIPAÍ — Plataforma Brasileira de Clipes de Jogadas',
  description:
    'Armazene, organize em coleções, analise a retenção e compartilhe seus melhores momentos e highlights de jogos com upload direto e alta performance.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: 'CLIPAÍ — Plataforma Brasileira de Clipes de Jogadas',
    description:
      'Armazene, organize em coleções, analise a retenção e compartilhe seus melhores momentos e highlights de jogos.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'CLIPAÍ',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg-deep font-mono text-mono-body text-text-primary antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
