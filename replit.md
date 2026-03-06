# WA CRM - WhatsApp Business Automation Platform

## Overview
An all-in-one WhatsApp CRM automation platform with multi-container support, contact management, campaign tools, team collaboration, and e-commerce integration. Supports real WhatsApp Cloud API integration.

## Architecture
- **Frontend**: React SPA with Vite, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: Express.js REST API with PostgreSQL (Drizzle ORM)
- **Auth**: Email/password authentication with bcrypt + express-session (PostgreSQL-backed)
- **Real-time**: WebSocket (ws) for notifications
- **Routing**: wouter (client-side)
- **WhatsApp**: Meta Cloud API (v18.0) with webhook support

## Key Features
- Multi-workspace (container) support with switcher
- Contact management with tags, custom fields, CSV import/export
- WhatsApp message templates (Standard, Limited Offer, Carousel) with phone mockup preview
- Campaign broadcasting with audience targeting and scheduling
- Automation rules (welcome, keyword, away messages)
- Shared team inbox with 3-panel layout (conversation list, chat, contact details), real-time messaging, separate internal notes input, WhatsApp-style message bubbles with date grouping, message status ticks (single=sent, double blue=delivered), media content display, unread count badges, label management in contact panel
- Sales pipeline (drag-and-drop kanban board)
- Order tracking and e-commerce features
- Campaign analytics with charts (Recharts)
- Real-time notifications via WebSocket
- Role-based access control (admin, agent, viewer)
- WhatsApp Cloud API integration (outbound messaging + inbound webhooks)
- Webhook signature verification (x-hub-signature-256)
- Test connection feature for API credentials
- Clear Demo Data feature in Settings

## WhatsApp Business API Integration
- **Outbound**: Messages sent from inbox are forwarded to WhatsApp Cloud API when workspace is configured (phoneNumberId + apiKey)
- **Inbound**: Webhook endpoints at GET/POST `/api/webhook` receive incoming messages from Meta
- **Message Types**: Text, image, video, audio, document, sticker, location, contacts (all logged and stored)
- **Status Updates**: Delivered/read status updates logged from Meta
- **Security**: Webhook payloads verified using App Secret (HMAC-SHA256, constant-time comparison); falls back to server-level META_APP_SECRET
- **Container fields**: phoneNumberId, wabaId, apiKey, apiEndpoint, appSecret, webhookVerifyToken
- **Messages table**: whatsappMessageId tracks Meta's message IDs; mediaType stores media type (image/video/audio/document/sticker)
- **Conversations table**: unreadCount tracks unread incoming messages per conversation
- **Graceful fallback**: Unconfigured workspaces work in local/demo mode

## Known Issues
- **CRITICAL**: The `javascript_log_in_with_replit:2.0.0` integration in `.replit` causes Replit's replshield to 307-redirect ALL unauthenticated requests in deployment, blocking Meta webhook requests. This integration must be manually removed from the `.replit` file's `[agent] integrations` array. No tooling exists to remove it programmatically.

## Meta Embedded Signup (WhatsApp)
- **Flow**: User clicks "Connect with Facebook" → FB.login popup → captures code + WABA/phone IDs → backend exchanges code for access token → auto-registers phone → subscribes webhook → creates/updates container
- **Frontend**: `client/src/lib/facebook-sdk.ts` loads FB SDK dynamically, `launchWhatsAppSignup(configId)` triggers the signup popup and captures WA_EMBEDDED_SIGNUP session data
- **Backend**: `POST /api/whatsapp/embedded-signup` handles OAuth token exchange with ownership verification; `GET /api/whatsapp/app-config` returns public app ID + config ID
- **Settings UI**: Dual-mode — primary "Connect with Facebook" button (Embedded Signup), collapsible "Manual Setup (Advanced)" fallback with step-by-step guide
- **Security**: Container ownership verified before updates; META_APP_SECRET kept server-side only (not stored in containers); webhook URL derived from request host header (works correctly in both dev and production)
- **Webhook**: Global WEBHOOK_VERIFY_TOKEN env var used as fallback for Meta App Dashboard manual setup; per-container tokens also supported; webhook info displayed in Settings page
- **Environment secrets**: META_APP_ID, META_APP_SECRET, META_CONFIG_ID, WEBHOOK_VERIFY_TOKEN

## Seed Data
- New users get a blank workspace (no demo contacts/messages/etc.)
- `DELETE /api/containers/:id/demo-data` endpoint clears demo data from existing workspaces
- "Clear Demo Data" button in Settings > Workspaces tab

## Project Structure
```
client/src/
  App.tsx              - Main app with routing and auth gating
  components/
    app-sidebar.tsx    - Sidebar navigation with container switcher
    ui/                - Shadcn UI components
  pages/
    auth.tsx           - Login/Register page (email + password)
    landing.tsx        - Public landing page
    dashboard.tsx      - Dashboard overview
    inbox.tsx          - Team inbox with messaging
    contacts.tsx       - Contact management
    templates.tsx      - Template builder + premade library
    campaigns.tsx      - Campaign creator
    automations.tsx    - Automation rules
    pipeline.tsx       - Sales pipeline kanban
    orders.tsx         - Order management
    analytics.tsx      - Campaign analytics charts
    settings.tsx       - Profile, workspace, team, API settings (incl. WhatsApp API setup guide)
  lib/
    container-context.tsx - Active workspace context
    ws-context.tsx        - WebSocket context
    queryClient.ts        - TanStack Query setup
    auth-utils.ts         - Auth utilities
    facebook-sdk.ts       - FB SDK loader + WhatsApp Embedded Signup launcher
  hooks/
    use-auth.ts          - Auth hook

server/
  index.ts             - Express server entry (with uncaught error handlers)
  routes.ts            - All API routes + WebSocket + WhatsApp webhook endpoints
  storage.ts           - DatabaseStorage with all CRUD operations
  db.ts                - Drizzle + pg pool
  seed.ts              - Minimal seed (blank workspace only)
  replit_integrations/auth/ - Email/password auth module (session, routes, storage)

shared/
  schema.ts            - All Drizzle schemas, relations, types
  models/auth.ts       - Auth-related tables
```

## Database Tables
users (with email, username, password), sessions, containers (with phoneNumberId, wabaId, appSecret, webhookVerifyToken), container_members, contacts, templates, campaigns, automation_rules, conversations, messages (with whatsappMessageId), deals, orders, notifications

## API Endpoints (WhatsApp-specific)
- GET /api/webhook - Meta webhook verification handshake
- POST /api/webhook - Receive incoming WhatsApp messages (with detailed logging)
- POST /api/containers/:id/test-connection - Test WhatsApp API credentials
- GET /api/whatsapp/app-config - Public Meta App ID + Config ID for FB SDK
- GET /api/whatsapp/webhook-info - Returns webhook callback URL + verify token (authenticated)
- POST /api/whatsapp/embedded-signup - OAuth token exchange + auto-configure container
- DELETE /api/containers/:id/demo-data - Clear demo/sample data from workspace
- POST /api/templates/:id/sync-status - Sync single template status from Meta
- POST /api/containers/:id/templates/sync-all - Sync all template statuses from Meta
- POST /api/conversations/:id/mark-read - Reset unread count to 0

## API Endpoints (Auth)
- POST /api/auth/register - Create account (email, username, password)
- POST /api/auth/login - Sign in (email, password)
- POST /api/logout - Sign out (destroy session)
- GET /api/auth/user - Get current user (requires session)

## Environment Variables
- DATABASE_URL (auto-provisioned)
- SESSION_SECRET
- META_APP_ID, META_APP_SECRET, META_CONFIG_ID (Meta Embedded Signup)
- WEBHOOK_VERIFY_TOKEN (global webhook verification token for Meta App Dashboard)
