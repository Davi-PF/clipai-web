import type { Metadata } from 'next';
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google';
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
    'Armazene, organize em coleções e compartilhe seus melhores momentos e highlights de jogos com upload direto e alta performance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg-deep font-mono text-mono-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
