export interface DesignColorToken {
  cssVar: string;
  name: string;
  hex: string;
  tailwindClass: string;
  role: string;
  category: 'base' | 'danger' | 'warning' | 'success';
}

export const BASE_COLOR_TOKENS: readonly DesignColorToken[] = [
  {
    cssVar: '--bg-deep',
    name: 'Oxford by Night',
    hex: '#061C2C',
    tailwindClass: 'bg-bg-deep',
    role: 'Fundo principal do workspace Bento e fusão ativa da Sidebar Líquida',
    category: 'base',
  },
  {
    cssVar: '--bg-surface',
    name: 'Nato Blue',
    hex: '#193347',
    tailwindClass: 'bg-bg-surface',
    role: 'Corpo da Sidebar Líquida e superfícies primárias dos cards Bento',
    category: 'base',
  },
  {
    cssVar: '--bg-elevated',
    name: 'Blue Fedora',
    hex: '#334B60',
    tailwindClass: 'bg-bg-elevated',
    role: 'Cards elevados, controles secundários e células do grid 3x3',
    category: 'base',
  },
  {
    cssVar: '--border-muted',
    name: 'Prairie Denim',
    hex: '#4F6478',
    tailwindClass: 'border-border-muted',
    role: 'Bordas sutis de 1px a 1.5px e contorno SVG contínuo do Hero Player em "L"',
    category: 'base',
  },
  {
    cssVar: '--text-muted',
    name: 'Blue Prince',
    hex: '#6C7F91',
    tailwindClass: 'text-text-muted',
    role: 'Metadados técnicos secundários, timestamps e placeholders',
    category: 'base',
  },
  {
    cssVar: '--text-secondary',
    name: 'Foghorn',
    hex: '#91A1B2',
    tailwindClass: 'text-text-secondary',
    role: 'Subtítulos, descrições e itens inativos de navegação',
    category: 'base',
  },
  {
    cssVar: '--text-primary',
    name: 'Powder Soft Blue',
    hex: '#B7C7D6',
    tailwindClass: 'text-text-primary',
    role: 'Textos principais, títulos ativos e destaque primário',
    category: 'base',
  },
] as const;

export const SEMANTIC_COLOR_TOKENS: readonly DesignColorToken[] = [
  {
    cssVar: '--color-danger-text',
    name: 'Danger Text',
    hex: '#F06A76',
    tailwindClass: 'text-danger-text',
    role: 'Texto e ícones de erro de validação',
    category: 'danger',
  },
  {
    cssVar: '--color-danger-primary',
    name: 'Danger Primary / REC',
    hex: '#D93848',
    tailwindClass: 'bg-danger',
    role: 'Indicador REC, botão Curtir ativo e ações destrutivas',
    category: 'danger',
  },
  {
    cssVar: '--color-danger-surface',
    name: 'Danger Surface',
    hex: '#8C2332',
    tailwindClass: 'bg-danger-surface',
    role: 'Hover destrutivo e superfície de fundo de alertas de erro',
    category: 'danger',
  },
  {
    cssVar: '--color-warning-primary',
    name: 'Warning / Star / Beta',
    hex: '#E8B04B',
    tailwindClass: 'bg-warning',
    role: 'Favoritos (estrela), badge BETA, Jogada da Semana e avisos',
    category: 'warning',
  },
  {
    cssVar: '--color-success-primary',
    name: 'Success / Online / CTA',
    hex: '#2EB886',
    tailwindClass: 'bg-success',
    role: 'Upload concluído, indicador ativo da sidebar, CTAs e toast de link copiado',
    category: 'success',
  },
  {
    cssVar: '--color-success-surface',
    name: 'Success Surface',
    hex: '#1D6F56',
    tailwindClass: 'bg-success-surface',
    role: 'Hover de CTAs de confirmação e superfície de toasts de sucesso',
    category: 'success',
  },
] as const;

export function isOfficialHexColor(hex: string): boolean {
  const normalized = hex.trim().toUpperCase();
  const allTokens = [...BASE_COLOR_TOKENS, ...SEMANTIC_COLOR_TOKENS];
  return allTokens.some((token) => token.hex.toUpperCase() === normalized);
}
