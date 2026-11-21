# REST API Contract Reference & TypeScript Types — CLIPAÍ (`clipai-web`)

> [!IMPORTANT]
> **Regra de Sincronização Estrita:** Este arquivo espelha exatamente o contrato oficial definido em `docs/API_CONTRACT.md` do repositório backend **`clipai-api`** (`/api/v1`).
> - O frontend **NUNCA** deve inventar rotas, alterar nomes de propriedades JSON (`snake_case`) ou assumir formatos de resposta que não existam no `docs/API_CONTRACT.md` do `clipai-api`.
> - Qualquer alteração de contrato exige atualização coordenada em ambos os repositórios.

---

## 1. Convenções da API Consumida (`/api/v1`)

- **Base URL:** Configurada via `NEXT_PUBLIC_API_BASE_URL` (ex.: `https://api.clipai.com.br/api/v1`).
- **Formato JSON:** Todas as chaves de request e response trafegam em `snake_case`.
- **Timestamps:** Strings ISO 8601 em UTC (ex.: `"2026-11-21T22:15:00Z"`).
- **Autenticação:**
  - `Authorization: Bearer <access_token>` (token JWT mantido em memória no cliente; TTL de 15 minutos).
  - Cookie `clipai_refresh_token` (`HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`; TTL de 7 dias), trafegado automaticamente via `credentials: 'include'` nas chamadas de `/auth/login`, `/auth/refresh` e `/auth/logout`.
- **Idioma das Mensagens de Erro:** `error.code` é sempre uma constante em inglês (`UPPER_SNAKE_CASE`), enquanto `error.message` e `error.details[].message` já vêm do backend em **português do Brasil (PT-BR)** prontos para exibição na UI.

---

## 2. Mapa de Endpoints do MVP (`/api/v1`)

### 2.1. Healthcheck e Autenticação (`/auth`)
| Método | Rota | Auth | Credenciais Cookie | Descrição |
| :---: | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/health` | Público | Não | Status da API e banco de dados. |
| `POST` | `/api/v1/auth/register` | Público | Não | Cria conta (`is_email_verified = false`) e dispara e-mail via Resend. |
| `POST` | `/api/v1/auth/verify-email` | Público | Não | Confirma o e-mail do usuário usando o `token` recebido. |
| `POST` | `/api/v1/auth/resend-verification` | Público | Não | Reenvia o link de verificação de e-mail. |
| `POST` | `/api/v1/auth/login` | Público | `include` | Autentica, retorna `access_token` e define cookie `clipai_refresh_token`. |
| `POST` | `/api/v1/auth/refresh` | Cookie | `include` | Rotaciona o cookie `clipai_refresh_token` e retorna novo `access_token`. |
| `POST` | `/api/v1/auth/logout` | Cookie / JWT | `include` | Revoga o refresh token no banco e limpa o cookie (`204 No Content`). |
| `POST` | `/api/v1/auth/forgot-password` | Público | Não | Solicita link de recuperação de senha por e-mail. |
| `POST` | `/api/v1/auth/reset-password` | Público | Não | Redefine a senha com o `token` e revoga sessões ativas. |

### 2.2. Usuários, Jogos e Tags (`/users`, `/games`, `/tags`)
| Método | Rota | Auth | Descrição |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/users/me` | Bearer JWT | Retorna o perfil completo do usuário autenticado. |
| `PATCH` | `/api/v1/users/me` | Bearer JWT | Atualiza `display_name`, `bio` ou `avatar_url`. |
| `GET` | `/api/v1/users/me/favorites` | Bearer JWT | Lista paginada de clipes favoritados pelo usuário autenticado. |
| `GET` | `/api/v1/users/{username}` | Público | Retorna o perfil público de um usuário. |
| `GET` | `/api/v1/users/{username}/clips` | Opcional | Lista clipes `ready` do usuário (inclui `unlisted`/`friends` se for o próprio autor). |
| `GET` | `/api/v1/games` | Público | Lista paginada de jogos (`q`, `page`, `page_size`). |
| `GET` | `/api/v1/tags` | Público | Lista de tags sugeridas ou filtradas por prefixo (`q`, `limit`). |

### 2.3. Clipes e Upload Direto R2 (`/clips`)
| Método | Rota | Auth | Descrição |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/clips/upload-url` | Bearer JWT (Verificado) | Valida metadados, cria clipe `pending_upload` e retorna Presigned `PUT` URLs do R2. |
| `POST` | `/api/v1/clips/{clip_id}/confirm-upload` | Bearer JWT (Autor) | Executa `HeadObject` no R2 e promove o clipe para `status = 'ready'`. |
| `GET` | `/api/v1/clips` | Opcional | Lista paginada de clipes públicos (`q`, `game_slug`, `game_id`, `tag`, `sort`, `page`, `page_size`). |
| `GET` | `/api/v1/clips/{clip_id}` | Opcional | Detalhes completos do clipe (`public`, `unlisted`, ou `friends` para o autor). |
| `PATCH` | `/api/v1/clips/{clip_id}` | Bearer JWT (Autor) | Atualiza `title`, `description`, `game_id`, `privacy` ou `tags`. |
| `DELETE` | `/api/v1/clips/{clip_id}` | Bearer JWT (Autor) | Remove o clipe do PostgreSQL e deleta vídeo/thumbnail no Cloudflare R2 (`204`). |
| `POST` | `/api/v1/clips/{clip_id}/views` | Opcional | Incrementa `views_count` (rate-limited a 1 view / 10 min por usuário/IP + clipe). |
| `POST` / `DELETE` | `/api/v1/clips/{clip_id}/like` | Bearer JWT (Verificado) | Curte ou remove curtida do clipe (idempotente). |
| `POST` / `DELETE` | `/api/v1/clips/{clip_id}/favorite` | Bearer JWT (Verificado) | Favorita ou remove favorito do clipe (idempotente). |

### 2.4. Coleções (`/collections`)
| Método | Rota | Auth | Descrição |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/collections` | Bearer JWT (Verificado) | Cria uma nova coleção (`title`, `description`, `privacy`). |
| `GET` | `/api/v1/users/{username}/collections` | Opcional | Lista paginada das coleções de um usuário. |
| `GET` | `/api/v1/collections/{collection_id}` | Opcional | Detalhes da coleção e lista ordenada de clipes (`position`). |
| `PATCH` | `/api/v1/collections/{collection_id}` | Bearer JWT (Dono) | Atualiza título, descrição ou privacidade da coleção. |
| `DELETE` | `/api/v1/collections/{collection_id}` | Bearer JWT (Dono) | Exclui a coleção (`204 No Content`). |
| `POST` | `/api/v1/collections/{collection_id}/clips` | Bearer JWT (Dono) | Adiciona um clipe à coleção na posição informada. |
| `DELETE` | `/api/v1/collections/{collection_id}/clips/{clip_id}` | Bearer JWT (Dono) | Remove um clipe da coleção (`204 No Content`). |

---

## 3. Contratos TypeScript Base (`src/types/api.ts`)

As interfaces abaixo são a referência obrigatória de tipagem para todos os serviços, hooks e componentes do `clipai-web`:

```ts
// ============================================================================
// 1. Enums & Literal Types
// ============================================================================

export type PrivacyLevel = 'public' | 'unlisted' | 'friends';

export type ClipStatus = 'pending_upload' | 'ready' | 'failed';

export type VideoMimeType = 'video/mp4' | 'video/webm';

export type ThumbnailMimeType = 'image/webp' | 'image/jpeg' | 'image/png';

export type ClipSortOption = 'recent' | 'popular';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UPLOAD_VERIFICATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'EMAIL_NOT_VERIFIED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

// ============================================================================
// 2. Envelope de Paginação e Erros Padronizados
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiErrorDetail {
  field: string;
  message: string; // Em PT-BR
}

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string; // Em PT-BR
    details?: ApiErrorDetail[];
    request_id: string;
  };
}

// ============================================================================
// 3. Usuário e Autenticação (User & Auth)
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string | null;
  is_email_verified: boolean;
  is_2fa_enabled: boolean; // Reservado no contrato desde o MVP para a v1.1
  created_at?: string;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface ClipAuthorSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface AuthLoginResponse {
  access_token: string | null;
  token_type: 'bearer';
  expires_in: number;
  requires_2fa: boolean; // Sempre false na v1.0; true na v1.1 quando 2FA ativo
  temp_2fa_token: string | null; // Reservado para o desafio TOTP na v1.1
  user: User;
}

export interface AuthRefreshResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

// ============================================================================
// 4. Catálogo: Jogos e Tags
// ============================================================================

export interface Game {
  id: string;
  name: string;
  slug: string;
  cover_url?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// ============================================================================
// 5. Clipes e Fluxo de Upload via Presigned URL
// ============================================================================

export interface ClipTechnicalMetadata {
  codec?: string;
  container: 'mp4' | 'webm';
  width: number;
  height: number;
  resolution_label: string; // ex.: "1080p", "720p"
  fps?: number;
  bitrate_kbps?: number;
  audio_codec?: string;
  audio_channels?: number;
  aspect_ratio: string; // ex.: "16:9"
}

export interface PresignedUploadRequest {
  title: string;
  description?: string | null;
  game_id: string;
  privacy: PrivacyLevel;
  tags: string[];
  video_mime_type: VideoMimeType;
  video_size_bytes: number;
  duration_seconds: number;
  thumbnail_mime_type: ThumbnailMimeType;
  thumbnail_size_bytes: number;
  technical_metadata: ClipTechnicalMetadata;
}

export interface PresignedPutTarget {
  url: string;
  method: 'PUT';
  headers: {
    'Content-Type': string;
    'Content-Length': string;
  };
}

export interface PresignedUploadResponse {
  clip_id: string;
  status: 'pending_upload';
  expires_in: number; // 900 segundos (15 min)
  video_upload: PresignedPutTarget;
  thumbnail_upload: PresignedPutTarget;
}

export interface ClipSummary {
  id: string;
  title: string;
  privacy: PrivacyLevel;
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  favorites_count: number;
  is_liked_by_me: boolean;
  is_favorited_by_me: boolean;
  author: ClipAuthorSummary;
  game: Game;
  tags: string[];
  created_at: string;
}

export interface Clip extends ClipSummary {
  description: string | null;
  status: ClipStatus;
  file_size_bytes: number;
  mime_type: VideoMimeType;
  technical_metadata: ClipTechnicalMetadata;
  updated_at: string;
}

export interface ClipLikeResponse {
  clip_id: string;
  likes_count: number;
  is_liked_by_me: boolean;
}

export interface ClipFavoriteResponse {
  clip_id: string;
  favorites_count: number;
  is_favorited_by_me: boolean;
}

export interface ClipViewResponse {
  clip_id: string;
  views_count: number;
}

// ============================================================================
// 6. Coleções (Playlists)
// ============================================================================

export interface CollectionOwnerSummary {
  id: string;
  username: string;
  display_name: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  privacy: PrivacyLevel;
  clips_count?: number;
  owner: CollectionOwnerSummary;
  created_at: string;
  updated_at: string;
}

export interface CollectionClipItem {
  position: number;
  added_at: string;
  clip: {
    id: string;
    title: string;
    thumbnail_url: string;
    duration_seconds: number;
    views_count: number;
    likes_count: number;
  };
}

export interface CollectionDetail extends Omit<Collection, 'clips_count'> {
  clips: CollectionClipItem[];
}
```
