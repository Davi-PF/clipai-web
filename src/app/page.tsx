import type { Metadata } from 'next';
import { LandingPageContent } from '@/components/landing/LandingPageContent';

export const metadata: Metadata = {
  title: 'CLIPAÍ — Suas Melhores Jogadas. Salvas em Segundos.',
  description:
    'Plataforma brasileira de armazenamento, compartilhamento e análise de retenção para clipes de jogos. Envie até 100 MB direto para a nuvem, compartilhe links curtos no Discord e acompanhe o Estúdio do Criador.',
  openGraph: {
    title: 'CLIPAÍ — Suas Melhores Jogadas. Salvas em Segundos.',
    description:
      'Upload direto até 100 MB, links limpos para o Discord, coleções organizadas e Estúdio com curva de retenção real.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'CLIPAÍ',
  },
};

export default function HomePage() {
  return <LandingPageContent />;
}
