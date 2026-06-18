# Plan : Intégration Google Drive pour la génération/fusion de PDF

## Contexte

Le projet est une app Next.js 16 (App Router, TypeScript, Tailwind CSS 4) sans aucune auth ni dépendance externe. Il expose `/api/gen` qui accepte HTML/URLs/fichiers uploadés et génère un PDF fusionné via Puppeteer + pdf-merger-js.

L'objectif est d'ajouter une page `/drive` permettant de :
1. Se connecter avec son compte Google via OAuth
2. Parcourir tout son Drive (My Drive + tous les Shared Drives)
3. Sélectionner des fichiers (PDF, images) et les ordonner
4. Déclencher une fusion en réutilisant la pipeline existante (`generatePDF`)

---

## Architecture retenue

### Auth : NextAuth.js v5

Justification : gérer OAuth Google manuellement (PKCE, refresh token, état de session) représente ~150 lignes pour zéro bénéfice. NextAuth v5 fait tout en ~20 lignes de config, gère le refresh automatiquement, stocke la session dans un cookie JWT chiffré (pas de base de données). Seul ajout de dépendance : `next-auth`.

### Pipeline Drive → PDF : proxy serveur-side

Les URLs Drive requièrent un header OAuth → on ne peut pas les passer directement à `/api/gen`. Le nouvel endpoint `/api/drive/merge` :
- Reçoit des `fileId[]`
- Télécharge chaque fichier via l'API Drive avec le token de session (serveur-side uniquement)
- Construit un `Item[]` (même type qu'utilisé par `generatePDF`)
- Appelle `generatePDF` directement (import, pas HTTP)
- Retourne le PDF

**L'endpoint `/api/gen` existant n'est pas modifié.**

---

## Nouveaux packages npm

```
next-auth       # OAuth + session JWT, Google provider intégré
googleapis      # Client typé Drive API v3
```

---

## Variables d'environnement

```
GOOGLE_CLIENT_ID=...       # Google Cloud Console → Identifiants OAuth 2.0
GOOGLE_CLIENT_SECRET=...   # Même identifiant
AUTH_SECRET=...            # 32 bytes aléatoires : openssl rand -base64 32
```

Côté Google Cloud Console : ajouter l'URL de callback autorisée :
`http://localhost:3000/api/auth/callback/google` (dev) + l'URL de prod.

---

## Fichiers à créer

### `src/auth.ts` — Config NextAuth v5

```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
          access_type: 'offline',
          prompt: 'consent',  // Force le refresh_token à chaque login
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // Premier login : stocker les tokens
        token.accessToken = account.access_token!
        token.refreshToken = account.refresh_token!
        token.accessTokenExpiresAt = account.expires_at!
      }
      // Refresh si expiré
      if (Date.now() / 1000 > (token.accessTokenExpiresAt as number)) {
        // fetch POST https://oauth2.googleapis.com/token avec refresh_token
        // mettre à jour token.accessToken et token.accessTokenExpiresAt
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
})

// Module augmentation TypeScript
declare module 'next-auth' {
  interface Session { accessToken: string }
}
declare module 'next-auth/jwt' {
  interface JWT { accessToken: string; refreshToken: string; accessTokenExpiresAt: number }
}
```

### `src/app/api/auth/[...nextauth]/route.ts` — Handler NextAuth (1 ligne)

```typescript
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

### `src/lib/drive.ts` — Utilitaire client Drive

- `getDriveClient(accessToken: string)` : crée un client `google.drive({ version: 'v3' })` avec `OAuth2Client` configuré avec le token
- Exporte les types TypeScript : `DriveFile { id, name, mimeType, size, modifiedTime }`, `SharedDrive { id, name }`

### `src/app/api/drive/files/route.ts` — Listage des fichiers Drive

- Valide la session via `auth()`, retourne 401 si absente
- Query params : `pageToken?`, `driveId?` (null = My Drive), `q?` (recherche nom)
- Filtre par type : `mimeType='application/pdf' or mimeType contains 'image/'`
- My Drive : `corpora: 'user'`
- Shared Drive : `corpora: 'drive'`, `driveId`, `includeItemsFromAllDrives: true`, `supportsAllDrives: true`
- Appel séparé `drive.drives.list` pour lister les Shared Drives (sidebar)
- Retourne `{ files: DriveFile[], nextPageToken: string | null, drives: SharedDrive[] }`

### `src/app/api/drive/merge/route.ts` — Téléchargement + fusion

- Valide session, retourne 401 si absente
- Accepte POST JSON : `{ fileIds: string[], filename?: string }`
- Pour chaque `fileId` :
  1. `drive.files.get({ fileId, fields: 'mimeType,name', supportsAllDrives: true })` → metadata
  2. `drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })` → bytes
  3. Conversion (même logique que `processFileItem` dans `parsers.ts`) :
     - PDF → `new Uint8Array(buffer)`
     - image → `data:${mimeType};base64,${base64}` as ImageUrl
- Appelle `generatePDF(items)` depuis `@/app/api/gen/generate`
- Retourne `new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` } })`

### `src/app/drive/layout.tsx` — Layout section Drive

- Header avec lien retour "← PDF Gen" + avatar/nom de l'utilisateur + bouton Sign Out
- Server Component qui appelle `auth()` pour afficher les infos utilisateur

### `src/app/drive/page.tsx` — Page principale `/drive`

Server Component (async) :
- Appelle `auth()`
- **Si pas de session** : affiche une carte centrée "Connecter Google Drive" avec bouton (form + Server Action `signIn('google')`)
- **Si session** : render `<DriveBrowser>` (client component)

`<DriveBrowser>` — `'use client'`, même pattern que le `Playground` existant :

**State (useState uniquement) :**
```typescript
selectedDriveId: string | null  // null = My Drive
drives: SharedDrive[]
files: DriveFile[]
nextPageToken: string | null
selected: DriveFile[]           // fichiers sélectionnés, dans l'ordre de merge
loading: boolean
merging: boolean
error: string | null
```

**Layout :**
- Sidebar gauche : "My Drive" + liste des Shared Drives (fetché au mount)
- Zone principale : grille de fichiers avec checkbox + nom + icône type + taille
- Barre sticky en bas (visible si `selected.length > 0`) :
  - Liste ordonnée des fichiers sélectionnés avec boutons ↑ ↓ pour réordonner
  - Input filename (défaut : "merge.pdf")
  - Bouton "Merger & Télécharger"
  - Affichage de l'erreur éventuelle

**Pagination :** bouton "Charger plus" qui appende à `files` avec le `nextPageToken`.

**Action merge :**
```typescript
const res = await fetch('/api/drive/merge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileIds: selected.map(f => f.id), filename }),
})
const blob = await res.blob()
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url; a.download = filename; a.click()
URL.revokeObjectURL(url)
```

---

## Fichiers modifiés

Aucun fichier existant n'est modifié. L'endpoint `/api/gen`, `generate.ts`, `parsers.ts`, et `types.ts` restent intacts.

---

## Structure finale

```
src/
  auth.ts                                    # NOUVEAU
  lib/
    drive.ts                                 # NOUVEAU
  app/
    api/
      auth/[...nextauth]/route.ts            # NOUVEAU (1 ligne)
      drive/
        files/route.ts                       # NOUVEAU
        merge/route.ts                       # NOUVEAU
    drive/
      layout.tsx                             # NOUVEAU
      page.tsx                               # NOUVEAU
```

---

## Ordre d'implémentation

1. `yarn add next-auth googleapis` + `.env.local`
2. `src/auth.ts` (prérequis de tout le reste)
3. `src/app/api/auth/[...nextauth]/route.ts`
4. `src/lib/drive.ts`
5. `src/app/api/drive/files/route.ts`
6. `src/app/api/drive/merge/route.ts`
7. `src/app/drive/layout.tsx`
8. `src/app/drive/page.tsx`

---

## Vérification end-to-end

1. `yarn dev`, aller sur `http://localhost:3000/drive`
2. Vérifier l'affichage de la carte "Connecter Google Drive"
3. Cliquer "Connecter", compléter le flow OAuth Google
4. Vérifier l'affichage de la liste de fichiers (My Drive)
5. Sélectionner un Shared Drive dans la sidebar → vérifier que les fichiers changent
6. Cocher 2-3 fichiers PDF, les réordonner avec ↑ ↓
7. Cliquer "Merger & Télécharger" → vérifier le téléchargement du PDF fusionné
8. Vérifier que `/api/gen` fonctionne toujours normalement (aucune régression)
