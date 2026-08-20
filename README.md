# 🎨 Sketchboard

Sketchboard is a highly polished, collaborative, real-time drawing and whiteboard application. It features a fully custom, interactive DOM and SVG-based canvas synced in real time using Conflict-Free Replicated Data Types (CRDTs) over WebSockets. Designed to rival tools like Excalidraw and tldraw, Sketchboard features natural, earthy styling, dual user modes (Guest & Authenticated), rich style options, comprehensive board operations, and robust security protocols.

---

## ✨ Features

### 🖌️ Custom Canvas Engine

Sketchboard utilizes a custom interactive rendering engine built on standard HTML5 DOM and SVG primitives. This keeps rendering lightweight and responsive, avoiding the performance bottlenecks of heavy canvas libraries:

- **Freehand Drawing**: Smoothened, pressure-sensitive paths using the `perfect-freehand` library.
- **Rich Shapes Library**: Includes Rectangles (with adjustable corner radii), Ellipses, Lines, Arrows, Triangles, Diamonds, Parallelograms, Hexagons, Octagons, Cylinders, Rounded Rectangles, and Speech Bubbles.
- **Dynamic Text Elements**: Custom Text boxes and Sticky Notes featuring automatic vertical and horizontal auto-grow resizing, borderless typing, and clean overlays.
- **Frames**: Grouping containers that act as parent structures, automatically moving and clipping nested child elements.
- **Eraser & Laser Pointer**: An eraser tool (supporting click and drag-intersect deletion) and an ephemeral laser cursor with smooth fading trails.

### 👥 Real-Time Collaboration

- **Websocket CRDT Synchronization**: Powered by `Yjs` (via `yjs` and `@liveblocks/yjs`) for conflict-free concurrent editing.
- **Multi-user Presence**: Real-time cursor coordinates broadcasted through the Liveblocks Awareness protocol, complete with user-specific cursor tags, active peer avatars, and connection indicators.
- **Collaborative Indicators**: Hover and edit outlines around shapes highlight which collaborator is interacting with which object.
- **Follow Camera Mode**: Click any collaborator's avatar to lock your screen view to their viewport coordinates and zoom level.
- **Room Limit Handlers**: Automatically locks access and displays a clean "Room is Full" overlay when guest/auth room connection caps are reached.

### 👥 Dual User Access Modes

- **Guest Mode (Zero Signup)**:
  - Instant playground boards saved directly to browser `localStorage` (debounced writes).
  - Built-in guest identity generator (anonymous name modal with customizable natural colors).
  - Local import & export of board files (`.whiteboard` schema files), plus PNG and SVG exports.
  - Image handling: Images are converted and stored as inline Base64 data URLs.
- **Auth Mode (Cloud Persistence)**:
  - Clerk-based authentication and user profiles.
  - Multi-session, multi-device board loading and saving directly to a Neon database.
  - Media Vault integration: Uploaded assets are handled securely via Uploadthing CDN and stored with size tracking, previews, and deletion controls.

### 🎨 Context-Aware Style Panel

An interactive, collapsible right-side panel appearing automatically on selection:

- **Color Selection**: A curated 20-color natural palette (blacks/whites, reds/pinks, oranges/yellows, greens, blues/purples) + a custom HEX input picker.
- **Fill Styles**: Toggle between Solid, Semi-Transparent, or None (Transparent) backgrounds.
- **Strokes & Opacity**: Solid, Dashed, or Dotted border configurations with adjustable stroke widths and opacity sliders.
- **Typography Controls**: Font families (Inter, Georgia, JetBrains Mono, Caveat) coupled with size presets, styling (bold, italic, underline), and text alignment controls.
- **Shadows**: Blur and spread control sliders for adding drop shadows.

### 🛠️ Floating Command Bar (Top-Center)

A clean, center-aligned control hub organizing advanced board actions:

- **History**: Responsive Undo / Redo controls synced with the Yjs transaction manager.
- **Edit & Align**: Duplicate offsets, Z-Index arrangement (Bring to Front, Send to Back, etc.), and multi-shape align tools (Edges / Centers).
- **Embed Integrations**: An interactive dialog mapping standard URLs (YouTube, Figma, Loom, Google Maps) to customized iframe shapes on the board.
- **Preferences**: Toggles for canvas Grid lines, Snap-to-Grid, Focus Mode (hides all UI floating controls), and Light/Dark themes.

### 📱 Responsive Design & Mobile Lock

- **Orientation Lock**: Forces portrait mobile devices to rotate to landscape view with a custom instructional screen overlay.
- **Mobile Navigation Bar**: Collapses floating panels and sidebars into a bottom navigation panel on smaller screen sizes.

---

## 🛠️ Technology Stack

| Layer                  | Technology                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Framework**          | Next.js 16 (App Router, Turbopack, React 19)                                             |
| **Styling**            | Tailwind CSS v4, PostCSS, CSS Variables                                                  |
| **Sync & CRDT**        | Yjs, Liveblocks (`@liveblocks/client`, `@liveblocks/yjs`)                                |
| **Database**           | Neon serverless PostgreSQL, Drizzle ORM                                                  |
| **Authentication**     | Clerk Next.js SDK (`@clerk/nextjs`)                                                      |
| **Media Storage**      | Uploadthing CDN (`uploadthing`, `@uploadthing/react`)                                    |
| **Canvas Mathematics** | `fractional-indexing` (layering index generation), `perfect-freehand` (freehand vectors) |
| **State Management**   | Zustand (Z-Index, active tool, selections, viewport scale)                               |

---

## 📂 Project Structure

```
whiteboard/
├── drizzle/                    # Drizzle migrations schema outputs
├── public/                     # Static media and icons
└── src/
    ├── actions/                # Next.js Server Actions (board, assets, teams)
    ├── app/                    # Next.js App Router Pages
    │   ├── (auth)/             # Auth routes (Clerk layouts)
    │   ├── (home)/             # Main user dashboard and lists
    │   ├── api/                # API routes (liveblocks-auth, uploadthing, Clerk webhooks)
    │   └── board/              # Board rendering entrypoints
    ├── components/             # Reusable UI React Components
    │   ├── home/               # Dashboard cards and buttons
    │   ├── ui/                 # Basic design-system components (dialog, input, drop-down)
    │   └── whiteboard/         # Core Canvas, Headers, Sidebars, and Controls
    │       └── shapes/         # Individual SVG/DOM shape components
    ├── hooks/                  # Canvas cursor, awareness, keyboard, and Yjs hooks
    ├── lib/                    # Shared helper utilities (DB, local storage, fractional indexes)
    │   └── db/                 # Drizzle schema definition and setup
    ├── store/                  # Zustand global UI slices (zoom, tools, preferences)
    └── types/                  # TypeScript interface declarations
```

---

## 🗄️ Database Schema

The database is built on PostgreSQL with Drizzle ORM managing schema validation. The tables are configured as follows:

```mermaid
erDiagram
    users ||--o{ team_members : "belongs to"
    users ||--o{ teams : "owns"
    users ||--o{ boards : "creates"
    users ||--o{ favorites : "marks"
    teams ||--o{ team_members : "has"
    teams ||--o{ boards : "contains"
    boards ||--o{ board_snapshots : "saves"
    boards ||--o{ board_assets : "owns"
    boards ||--o{ favorites : "receives"
    users ||--o{ board_assets : "uploads"
```

### Table Definitions

1. **`users`**: Contains identity mappings from Clerk (UUID, email, name, avatar URL).
2. **`teams`**: (Planned) Under development to support future multi-user workspace organization.
3. **`team_members`**: (Planned) Under development to manage future workspace access roles and permissions.
4. **`boards`**: Main board entity holding metadata, owner ID, team workspace ID, and thumbnail URLs.
5. **`board_snapshots`**: Stores periodic base64 encoded strings of the Yjs document state for database restoration.
6. **`board_assets`**: Tracks media items uploaded to the CDN, documenting filename, file size, mime-type, and uploader user.
7. **`favorites`**: Resolves dashboard starred boards for individual profiles.

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** instance (hosted via Neon, or run locally)
- Accounts for **Clerk**, **Liveblocks**, and **Uploadthing**.

### 2. Environment Setup

Create a `.env.local` file in the root directory and copy the contents from `.env.example`. Add your API keys:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
CLERK_WEBHOOK_SECRET=whsec_...

# Neon PostgreSQL Database
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/sketchboard?sslmode=require

# Liveblocks Real-Time Collaboration
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_dev_...
LIVEBLOCKS_SECRET_KEY=sk_dev_...

# Uploadthing CDN
UPLOADTHING_TOKEN=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Installation & Run

Install project dependencies, synchronize database schemas, and boot the developer instance:

```bash
# Install dependencies
npm install

# Push Drizzle schema migrations directly to Neon database
npm run db:push

# Spin up Next.js dev server with Turbopack support
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your local deployment.

---

## ⌨️ Keyboard Shortcuts Reference

Navigate the canvas like a pro using these quick commands:

| Action                         | Keybinding                              |
| ------------------------------ | --------------------------------------- |
| **Select Tool**                | `S`                                     |
| **Draw (Freehand) Tool**       | `D`                                     |
| **Rectangle Tool**             | `R`                                     |
| **Ellipse Tool**               | `O`                                     |
| **Text Tool**                  | `T`                                     |
| **Sticky Note Tool**           | `N`                                     |
| **Hand Tool (Pan canvas)**     | `H`                                     |
| **Eraser Tool**                | `E`                                     |
| **Arrow Tool**                 | `A`                                     |
| **Frame Tool**                 | `F`                                     |
| **Undo / Redo**                | `Ctrl + Z` / `Ctrl + Shift + Z`         |
| **Duplicate Selected**         | `Ctrl + D`                              |
| **Delete Selected**            | `Backspace` or `Delete`                 |
| **Select All Shapes**          | `Ctrl + A`                              |
| **Copy / Paste (System Sync)** | `Ctrl + C` / `Ctrl + V`                 |
| **Quick Commands Palette**     | `/`                                     |
| **Fit to Screen**              | `Ctrl + Shift + H`                      |
| **Zoom In / Zoom Out**         | `Ctrl + Shift + =` / `Ctrl + Shift + -` |
| **Deselect / Exit Tool**       | `Escape`                                |

---

## 🔒 Security & Code Integrity

Sketchboard enforces high standards of security and frontend stability:

- **XSS & Import Sanitization**: Text and sticky notes render directly inside React text nodes to escape HTML inputs automatically. JSON whiteboard imports are strictly parsed, filtering schema attributes to block remote script inclusion in shape assets.
- **Content Security Policy (CSP)**: Outlines trusted CDNs and socket gateways, blocking arbitrary inline script injections.
- **High Entropy Identifiers**: All boards, guests, and Liveblocks rooms utilize cryptographically random, collision-resistant IDs (`nanoid` and UUIDs).
- **Yjs Transactions**: All state modifications are wrapped in Yjs document transaction closures (`doc.transact(() => { ... })`) to ensure thread-safety and prevent synchronization collisions across simultaneous network clients.
- **Hydration Guards**: Read operations from localStorage are strictly delayed until after mounting via `useEffect` loops, eliminating hydration mismatches between Server-Side Rendering (SSR) states and client state stores.
