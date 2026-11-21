# Product Requirements Document (PRD) — CLIPAÍ Frontend (`clipai-web`)

## 1. Visão do Produto e Experiência do Usuário (UX)

O **CLIPAÍ** é uma plataforma brasileira de armazenamento, descoberta e compartilhamento de clipes curtos de jogadas (*gaming highlights*). Sob a ótica de experiência do usuário, o frontend (`clipai-web`) foi projetado para entregar a sensação de um **estúdio tático de transmissão e replay**: rápido, denso na medida certa, livre de poluição visual e com resposta imediata a cada interação.

Diferente de plataformas genéricas de vídeo, o CLIPAÍ organiza o fluxo do jogador em um **Dashboard Bento de Dark Mode Frio** (`#061C2C`), onde assistir a uma jogada no **Hero Player em formato "L"**, filtrar momentos por tags táticas (`clutch`, `awp`, `ace`), alternar entre a fila de reprodução e navegar por coleções em leque ocorre em uma única superfície coesa, sem recarregamentos de página desnecessários.

Toda a transferência de mídia pesada ocorre **diretamente do navegador para o Cloudflare R2** via *Presigned `PUT` URLs* emitidas pela API (`clipai-api`), com extração local de metadados técnicos e geração automática de thumbnail via `<canvas>` no cliente.

---

## 2. Princípios de Experiência do Usuário

1. **Zero Atrito no Upload (*Client-Side Intelligence*):** O jogador arrasta o arquivo `.mp4` ou `.webm` e o navegador valida instantaneamente tamanho e duração, extrai resolução/FPS e captura automaticamente um frame em WebP via `<canvas>` como thumbnail — sem exigir que o usuário edite imagens manualmente.
2. **Estética Tática e Funcional (Modo Híbrido):** Títulos de alto impacto e CTAs principais utilizam **Bebas Neue** (caixa alta, presença esportiva/editorial), enquanto dados técnicos (`1080p`, `60 FPS`, `34.5s`, bitrate), filtros e controles usam **JetBrains Mono** para leitura precisa.
3. **Feedback Instantâneo e Transparente:** Upload com barra de progresso real baseada em bytes transferidos ao R2, ações otimistas para curtir (`#D93848`) e favoritar (`#E8B04B`), e confirmação visual imediata ao copiar links compartilháveis (`#2EB886`).
4. **Interface 100% em Português do Brasil (PT-BR):** Todos os textos, rótulos, estados vazios, toasts e mensagens de erro exibidos na interface utilizam linguagem natural e direta para a comunidade gamer brasileira.

---

## 3. Jornadas Principais do Usuário no MVP (v1.0)

### 3.1. Jornada 1 — Assistir e Explorar no Dashboard Bento
1. **Acesso ao Workspace:** Ao abrir o Dashboard, o usuário visualiza o layout Bento integrado à **Sidebar Líquida Colapsável**.
2. **Reprodução no Hero Player em "L":** O clipe em destaque (ou selecionado na fila) carrega no Hero Player central, contornado por uma linha SVG contínua (`1.5px`, `#4F6478`) que abraça o card de **Filtros Rápidos (3x3)** no canto inferior direito e o botão de colapso da sidebar à esquerda.
3. **Filtragem Tática Rápida:** O usuário clica em um dos 9 atalhos do grid **Filtros Rápidos (3x3)** encaixado no recorte do player (ex.: *CS2*, *Valorant*, *Clutch*, *Ace*, *Recentes*, *Em Alta*) ou utiliza a barra de busca global (`q`) para atualizar a fila sem interromper a navegação.
4. **Fila Contínua (`NA FILA / RECENTES`):** Na coluna lateral direita, o usuário visualiza a lista limpa de clipes (`gap: 10px`) com barra lateral colorida por categoria/status. Clicar em qualquer item carrega o vídeo imediatamente no Hero Player e registra a visualização (`POST /api/v1/clips/{clip_id}/views`).
5. **Engajamento Rápido:** Diretamente na barra do player ou do card, o usuário autenticado (com e-mail verificado) pode **Curtir** (`#D93848`), **Favoritar** (`#E8B04B`), **Adicionar a uma Coleção** ou **Copiar Link** (`#2EB886`).

### 3.2. Jornada 2 — Enviar Clipe (Fluxo Client-Side -> Cloudflare R2)
1. **Abertura do Modal de Upload:** O usuário autenticado (`is_email_verified = true`) aciona o botão CTA principal **`ENVIAR CLIPE`** (em Bebas Neue, `#2EB886`). Caso o e-mail ainda não esteja verificado, a interface exibe um aviso orientando o reenvio do link de confirmação.
2. **Seleção e Inspeção Local do Arquivo:**
   - O usuário arrasta ou seleciona um vídeo (`.mp4` ou `.webm`).
   - Antes de qualquer chamada de rede, o cliente valida tamanho (`<= 100 MB`) e duração (`1s` a `120s`).
   - Um elemento `<video>` oculto em memória extrai `duration_seconds`, `width`, `height`, `resolution_label` (ex.: `1080p`), `aspect_ratio` e estima o `bitrate_kbps`.
   - Simultaneamente, o cliente posiciona o vídeo em um instante representativo (ex.: `25%` da duração ou `1.5s`, com opção do usuário escolher outro frame na timeline) e desenha o quadro em um `<canvas>`, exportando um blob `image/webp` otimizado (`<= 5 MB`).
3. **Preenchimento de Metadados:** O usuário informa Título, Descrição (opcional), Jogo (`game_id`), Privacidade (`public`, `unlisted` ou `friends`) e até 10 tags.
4. **Reserva e Upload Direto (Presigned `PUT`):**
   - O frontend envia `POST /api/v1/clips/upload-url` com os metadados e tamanhos exatos em bytes.
   - Recebidas as URLs pré-assinadas, o navegador executa o `PUT` binário do vídeo e da thumbnail diretamente para o **Cloudflare R2**, exibindo uma barra de progresso real (`0%` a `100%`) com velocidade e megabytes enviados.
5. **Confirmação e Publicação:**
   - Concluídos os dois `PUT` com `200 OK`, o frontend chama `POST /api/v1/clips/{clip_id}/confirm-upload`.
   - O clipe transiciona para `status = 'ready'` e o usuário recebe o link direto de compartilhamento com opção de copiá-lo em um clique.

### 3.3. Jornada 3 — Organizar e Navegar por Coleções (Playlists)
1. **Interação com o Widget de Coleções em Leque:** No Dashboard Bento, o card **COLEÇÕES** exibe as playlists do usuário empilhadas em formato de leque interativo.
2. **Animação *Bring-to-Front*:** Ao clicar em um card posicionado atrás no leque, ele desliza e rotaciona suavemente para a frente (`z-index` principal), revelando os metadados da coleção (título, contagem de clipes, privacidade) e permitindo abrir seus clipes na fila do player.
3. **Gestão Completa de Coleções:** O usuário pode criar novas coleções (`POST /api/v1/collections`), editar título/descrição/privacidade (`PATCH`), excluir coleções (`DELETE`) e adicionar ou remover clipes (`POST / DELETE /api/v1/collections/{id}/clips`).

### 3.4. Jornada 4 — Compartilhar Link e Visualização Dedicada (`/c/[slug]`)
1. **Cópia Rápida:** Em qualquer clipe (`public` ou `unlisted`), clicar em **`COPIAR LINK`** copia a URL canônica (`https://clipai.com.br/c/{clip_id}`) para a área de transferência e dispara um toast verde (`#2EB886`): *"Link copiado para a área de transferência!"*.
2. **Página Dedicada (`/c/[slug]`):**
   - Projetada para carregamento rápido e *Open Graph / Social Preview* (Discord, WhatsApp, X/Twitter).
   - Exibe o player em destaque, título em Bebas Neue, ficha técnica em JetBrains Mono (`1080p • 60 FPS • H.264 • 34.5s`), autor, jogo, tags, botões de curtir/favoritar/compartilhar e lista de clipes relacionados.
   - Respeita rigorosamente a privacidade: clipes `public` e `unlisted` são acessíveis a visitantes com o link; clipes `friends` no MVP (v1) só podem ser visualizados pelo próprio autor autenticado.

### 3.5. Jornada 5 — Autenticação, Verificação de E-mail e Recuperação de Senha
1. **Cadastro (`/register`):** Formulário com validação em tempo real de `username`, `email`, `display_name` e força de senha. Após sucesso, orienta a verificação de e-mail.
2. **Verificação de E-mail (`/verify-email?token=...`):** Consome automaticamente `POST /api/v1/auth/verify-email`, exibe estado visual de confirmação e libera uploads e interações sociais. Inclui botão para reenvio (`POST /api/v1/auth/resend-verification`).
3. **Login (`/login`):** Autentica via `POST /api/v1/auth/login`, armazena o `access_token` em memória (com renovação silenciosa via cookie `HttpOnly` em `/api/v1/auth/refresh`) e redireciona ao Dashboard Bento. Já prevê no contrato o desvio condicional caso `requires_2fa === true` (reservado para a v1.1).
4. **Esqueci e Redefinir Senha (`/forgot-password` e `/reset-password?token=...`):** Fluxo completo de solicitação de link e redefinição segura de senha.

---

## 4. Regras de Validação no Cliente (Pré-Submissão)

O frontend deve validar todos os dados **antes** de acionar a API, exibindo mensagens claras em PT-BR (`#F06A76`) e espelhando as regras de negócio do `clipai-api`:

| Domínio / Campo | Regra de Validação no Cliente | Mensagem de Erro Padrão (PT-BR) |
| :--- | :--- | :--- |
| **Vídeo — Formato** | MIME type estritamente `video/mp4` ou `video/webm` (extensões `.mp4`, `.webm`). | `"Formato não suportado. Envie apenas arquivos MP4 ou WebM."` |
| **Vídeo — Tamanho** | Máximo de **100 MB** (`104.857.600 bytes`), mínimo `> 0 bytes`. | `"O arquivo excede o limite máximo de 100 MB."` |
| **Vídeo — Duração** | Entre **1,0 segundo** e **120,0 segundos** (lido via `HTMLVideoElement.duration`). | `"O clipe deve ter entre 1 e 120 segundos de duração."` |
| **Thumbnail (`<canvas>`)** | Gerada automaticamente em `image/webp` (ou upload customizado `image/webp`, `image/jpeg`, `image/png`) até **5 MB** (`5.242.880 bytes`). | `"A imagem de capa não pode ultrapassar 5 MB."` |
| **Título do Clipe** | Obrigatório, entre `3` e `120` caracteres (após `trim()`). | `"Informe um título entre 3 e 120 caracteres."` |
| **Descrição** | Opcional, máximo de `1.000` caracteres. | `"A descrição não pode ultrapassar 1.000 caracteres."` |
| **Tags** | Máximo de **10 tags** por clipe; cada tag normalizada em slug (`^[a-z0-9-]{2,30}$`). | `"Você pode adicionar no máximo 10 tags (2 a 30 caracteres cada)."` |
| **Privacidade** | Enum estrito: `'public' \| 'unlisted' \| 'friends'`. | `"Selecione uma opção de privacidade válida."` |
| **Username** | Obrigatório, `^[a-zA-Z0-9_]{3,30}$`. | `"Use de 3 a 30 caracteres (apenas letras, números e sublinhado)."` |
| **Senha** | `8` a `128` caracteres, ao menos 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial. | `"A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo."` |

---

## 5. Divisão de Escopo: MVP (v1.0) vs. Pós-MVP (v1.1 / v2.0)

> [!IMPORTANT]
> O escopo do **MVP (v1.0)** é estritamente travado. Funcionalidades listadas no Pós-MVP **não devem ser implementadas agora**, mas os contratos de tipos (`is_2fa_enabled`, `requires_2fa`, `temp_2fa_token`, `privacy: 'friends'`) já devem existir na camada de tipos para evitar refatorações destrutivas.

| Módulo | Escopo Travado — MVP (v1.0) | Escopo Pós-MVP (v1.1 / v2.0) |
| :--- | :--- | :--- |
| **Autenticação e Segurança** | Telas de Login, Cadastro, Verificação de E-mail (`/verify-email`) e Recuperação/Reset de Senha (`/forgot-password`, `/reset-password`). Renovação silenciosa via cookie `HttpOnly`. | **v1.1:** Tela de configuração de **2FA TOTP** (renderização de QR Code para Google Authenticator/Authy e modal de desafio de 6 dígitos no login).<br>**v1.1/v2.0:** Login social com **Discord OAuth2**. |
| **Dashboard Bento** | **Sidebar Líquida Colapsável**, **Hero Player em formato "L"** (com contorno SVG dinâmico via `ResizeObserver`), **Filtros Rápidos (3x3)**, lista **NA FILA / RECENTES** e widget **COLEÇÕES** em leque interativo (*bring-to-front*). | Customização de widgets do Bento pelo usuário (drag-and-drop) e feed algorítmico personalizado. |
| **Upload e Processamento** | Modal de Upload direto para Cloudflare R2 via Presigned `PUT` URL com barra de progresso real (`XMLHttpRequest`), extração de metadados técnicos no browser e captura automática de thumbnail em WebP via `<canvas>`. | **Compressão e recorte (*trim*) de vídeo client-side** (WebCodecs / FFmpeg.wasm) antes do envio; streaming adaptativo **HLS**. |
| **Visualização e Compartilhamento** | Página dedicada compartilhável (`/c/[slug]`), player customizado com metadados técnicos, botão de copiar link com toast `#2EB886`, controle de privacidade (`public`, `unlisted`, `friends`). | **Comentários ancorados no timestamp** do vídeo (marcadores na barra de progresso do player) e embed externo (`<iframe>`). |
| **Social, Perfil e Coleções** | CRUD completo de Coleções, curtir clipe (`#D93848`), favoritar clipe (`#E8B04B`), listagem de favoritos e visualização básica de perfil/meus clipes. | **Perfil público avançado** (banner customizado, estatísticas agregadas, insígnias) e grafo completo de **Amizades** (liberando o acesso social aos clipes `friends`). |
