# WA CRM - WhatsApp Business Automation Platform

## Overview
An all-in-one WhatsApp CRM automation platform with multi-container support, contact management, campaign tools, team collaboration, and e-commerce integration. Supports real WhatsApp Cloud API integration.

## Architecture
- **Frontend**: React SPA with Vite, Tailwind CSS, Shadcn UI, Recharts
- **Backend**: Express.js REST API with PostgreSQL (Drizzle ORM)
- **Auth**: Replit Auth (OpenID Connect)
- **Real-time**: WebSocket (ws) for notifications
- **Routing**: wouter (client-side)
- **WhatsApp**: Meta Cloud API (v18.0) with webhook support

## Key Features
- Multi-workspace (container) support with switcher
- Contact management with tags, custom fields, CSV import/export
- WhatsApp message templates with variable support + premade library
- Campaign broadcasting with audience targeting and scheduling
- Automation rules (welcome, keyword, away messages)
- Shared team inbox with real-time messaging and internal notes
- Sales pipeline (drag-and-drop kanban board)
- Order tracking and e-commerce features
- Campaign analytics with charts (Recharts)
- Real-time notifications via WebSocket
- Role-based access control (admin, agent, viewer)
- WhatsApp Cloud API integration (outbound messaging + inbound webhooks)
- Webhook signature verification (x-hub-signature-256)
- Test connection feature for API credentials

## WhatsApp Business API Integration
- **Outbound**: Messages sent from inbox are forwarded to WhatsApp Cloud API when workspace is configured (phoneNumberId + apiKey)
- **Inbound**: Webhook endpoints at GET/POST `/api/webhook` receive incoming messages from Meta
- **Security**: Webhook payloads verified using App Secret (HMAC-SHA256)
- **Container fields**: phoneNumberId, wabaId, apiKey, apiEndpoint, appSecret, webhookVerifyToken
- **Messages table**: whatsappMessageId tracks Meta's message IDs
- **Graceful fallback**: Unconfigured workspaces work in local/demo mode

## Project Structure
```
client/src/
  App.tsx              - Main app with routing and auth gating
  components/
    app-sidebar.tsx    - Sidebar navigation with container switcher
    ui/                - Shadcn UI components
  pages/
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
  hooks/
    use-auth.ts          - Auth hook

server/
  index.ts             - Express server entry (with uncaught error handlers)
  routes.ts            - All API routes + WebSocket + WhatsApp webhook endpoints
  storage.ts           - DatabaseStorage with all CRUD operations
  db.ts                - Drizzle + pg pool
  seed.ts              - Seed data for new users
  replit_integrations/auth/ - Replit Auth module

shared/
  schema.ts            - All Drizzle schemas, relations, types
  models/auth.ts       - Auth-related tables
```

## Database Tables
users, sessions, containers (with phoneNumberId, wabaId, appSecret, webhookVerifyToken), container_members, contacts, templates, campaigns, automation_rules, conversations, messages (with whatsappMessageId), deals, orders, notifications

## API Endpoints (WhatsApp-specific)
- GET /api/webhook - Meta webhook verification handshake
- POST /api/webhook - Receive incoming WhatsApp messages
- POST /api/containers/:id/test-connection - Test WhatsApp API credentials

## Environment Variables
- DATABASE_URL (auto-provisioned)
- SESSION_SECRET
- REPL_ID, ISSUER_URL (Replit Auth)
