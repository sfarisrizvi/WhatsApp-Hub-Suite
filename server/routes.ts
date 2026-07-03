import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { WebSocketServer, WebSocket } from "ws";
import { seedDatabase } from "./seed";
import { containers, users, contacts, campaigns, messages, conversations, deals, orders, workflows, workflowRuns, workflowNodeLogs, knowledgeBases, knowledgeDocuments } from "@shared/schema";
import { db, dbEvents } from "./db";
import { eq, and, sql, gt, inArray } from "drizzle-orm";
import { executeWorkflow } from "./automation-engine";
import multer from "multer";
import { processDocument } from "./knowledge-engine";

const upload = multer({ storage: multer.memoryStorage() });
// Mock requireAuth if not provided
const requireAuth = (req: any, res: any, next: any) => next();

const wsClients = new Map<string, Set<WebSocket>>();

function broadcastToUser(userId: string, data: any) {
  const clients = wsClients.get(userId);
  if (clients) {
    const msg = JSON.stringify(data);
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  }
}

dbEvents.on("broadcast", ({ userId, data }) => {
  broadcastToUser(userId, data);
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // WebSocket
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (ws, req) => {
    let userId: string | null = null;
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth' && msg.userId) {
          userId = msg.userId;
          if (!wsClients.has(userId!)) wsClients.set(userId!, new Set());
          wsClients.get(userId!)!.add(ws);
        }
      } catch {}
    });
    ws.on('close', () => {
      if (userId) {
        wsClients.get(userId)?.delete(ws);
        if (wsClients.get(userId)?.size === 0) wsClients.delete(userId);
      }
    });
  });

  // Public Health Check Endpoint
  app.get("/api/health", async (req, res) => {
    const status: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      env: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        SESSION_SECRET_set: !!process.env.SESSION_SECRET,
        OPENAI_API_KEY_set: !!process.env.OPENAI_API_KEY,
        NODE_ENV: process.env.NODE_ENV || "not set",
        PORT: process.env.PORT || "not set",
      }
    };

    try {
      const startTime = Date.now();
      const dbResult = await db.execute(sql`SELECT 1`);
      status.database = {
        status: "connected",
        responseTimeMs: Date.now() - startTime,
        connected: Array.isArray(dbResult.rows) && dbResult.rows.length > 0
      };
    } catch (e: any) {
      status.status = "error";
      status.database = {
        status: "error",
        message: e.message
      };
    }

    res.json(status);
  });

  // Containers
  app.get("/api/containers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      await seedDatabase(userId);
      const result = await storage.getContainersByUser(userId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const container = await storage.createContainer({ ...req.body, ownerId: userId });
      res.json(container);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/containers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const container = await storage.updateContainer(req.params.id, req.body);
      res.json(container);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/containers/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContainer(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/containers/:id/demo-data", isAuthenticated, async (req: any, res) => {
    try {
      const containerId = req.params.id;
      const container = await storage.getContainer(containerId);
      if (!container || container.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const demoPhones = ["+1 555-0201", "+1 555-0202", "+1 555-0203", "+1 555-0204", "+1 555-0205"];
      const demoContacts = await db.select().from(contacts)
        .where(and(eq(contacts.containerId, containerId)));
      const demoContactIds = demoContacts
        .filter(c => demoPhones.includes(c.phone) || c.email?.endsWith("@example.com"))
        .map(c => c.id);

      if (demoContactIds.length > 0) {
        for (const contactId of demoContactIds) {
          const convs = await db.select().from(conversations)
            .where(and(eq(conversations.containerId, containerId), eq(conversations.contactId, contactId)));
          for (const conv of convs) {
            await db.delete(messages).where(eq(messages.conversationId, conv.id));
          }
          await db.delete(conversations)
            .where(and(eq(conversations.containerId, containerId), eq(conversations.contactId, contactId)));
          await db.delete(deals).where(eq(deals.contactId, contactId));
          await db.delete(orders).where(eq(orders.contactId, contactId));
          await db.delete(contacts).where(eq(contacts.id, contactId));
        }
      }

      const { campaigns: campaignsTable, templates: templatesTable, automationRules: automationRulesTable } = await import("@shared/schema");
      await db.delete(campaignsTable).where(eq(campaignsTable.containerId, containerId));
      await db.delete(templatesTable).where(eq(templatesTable.containerId, containerId));
      await db.delete(automationRulesTable).where(eq(automationRulesTable.containerId, containerId));

      console.log("Demo data cleared for container:", containerId);
      res.json({ success: true, cleared: demoContactIds.length });
    } catch (e: any) {
      console.error("Clear demo data error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // Container Members
  app.get("/api/containers/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const members = await storage.getContainerMembers(req.params.id);
      res.json(members);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const member = await storage.addContainerMember({ ...req.body, containerId: req.params.id });
      res.json(member);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/members/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeContainerMember(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/members/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const member = await storage.updateMemberRole(req.params.id, req.body.role);
      res.json(member);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Contacts
  app.get("/api/containers/:containerId/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getContacts(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) return res.status(404).json({ message: "Not found" });
      res.json(contact);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.createContact({ ...req.body, containerId: req.params.containerId });
      res.json(contact);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/contacts/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const results = [];
      for (const c of req.body.contacts) {
        const contact = await storage.createContact({ ...c, containerId: req.params.containerId });
        results.push(contact);
      }
      res.json(results);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      res.json(contact);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContact(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Templates
  app.get("/api/containers/:containerId/templates", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getTemplates(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/templates", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.createTemplate({ ...req.body, containerId: req.params.containerId });
      res.json(template);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/templates/:id/submit-to-meta", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });

      const container = await storage.getContainer(template.containerId);
      if (!container || !container.wabaId || !container.apiKey) {
        return res.status(400).json({ message: "WhatsApp Business Account not configured. Connect your account in Settings first." });
      }

      const components: any[] = [];

      if (template.headerType && template.headerType !== "none") {
        if (template.headerType === "text") {
          components.push({ type: "HEADER", format: "TEXT", text: template.headerContent || "" });
        } else if (["image", "video", "document"].includes(template.headerType)) {
          components.push({ type: "HEADER", format: template.headerType.toUpperCase() });
        }
      }

      components.push({ type: "BODY", text: template.body });

      if (template.footerText) {
        components.push({ type: "FOOTER", text: template.footerText });
      }

      const buttons = (template.buttons as any[]) || [];
      if (buttons.length > 0) {
        const metaButtons = buttons.map((btn: any) => {
          if (btn.type === "URL") return { type: "URL", text: btn.text, url: btn.url };
          if (btn.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: btn.text, phone_number: btn.phoneNumber };
          if (btn.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: btn.text };
          if (btn.type === "COPY_CODE") return { type: "COPY_CODE", example: btn.example || "" };
          return { type: "QUICK_REPLY", text: btn.text };
        });
        components.push({ type: "BUTTONS", buttons: metaButtons });
      }

      if (template.templateType === "limited_offer") {
        const limitedAction: any = { type: "LIMITED_TIME_OFFER", text: template.offerText || "" };
        if (template.offerExpiry) limitedAction.has_expiration = true;
        components.push(limitedAction);
      }

      if (template.templateType === "carousel") {
        const cards = (template.carouselCards as any[]) || [];
        const carouselComponents = cards.map((card: any) => ({
          type: "CAROUSEL_CARD",
          components: [
            ...(card.imageUrl ? [{ type: "HEADER", format: "IMAGE" }] : []),
            { type: "BODY", text: card.body || "" },
            ...(card.buttons?.length ? [{
              type: "BUTTONS",
              buttons: card.buttons.map((b: any) => {
                if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
                return { type: "QUICK_REPLY", text: b.text };
              })
            }] : []),
          ],
        }));
        components.push({ type: "CAROUSEL", cards: carouselComponents });
      }

      const payload: any = {
        name: template.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        category: template.category.toUpperCase(),
        language: template.language || "en",
        components,
      };

      const endpoint = container.apiEndpoint?.replace(/\/$/, "") || "https://graph.facebook.com/v21.0";
      const metaRes = await fetch(`${endpoint}/${container.wabaId}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${container.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const metaData = await metaRes.json();

      if (metaRes.ok && metaData.id) {
        await storage.updateTemplate(template.id, {
          status: "pending",
          metaTemplateId: metaData.id,
        });
        res.json({ success: true, metaTemplateId: metaData.id, status: metaData.status });
      } else {
        res.status(400).json({
          success: false,
          message: metaData.error?.message || "Failed to submit template to Meta",
          error: metaData.error,
        });
      }
    } catch (e: any) {
      console.error("Meta template submission error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/templates/:id/sync-status", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });

      const container = await storage.getContainer(template.containerId);
      if (!container || !container.wabaId || !container.apiKey) {
        return res.status(400).json({ message: "WhatsApp Business Account not configured" });
      }

      const endpoint = container.apiEndpoint?.replace(/\/$/, "") || "https://graph.facebook.com/v21.0";
      const templateName = template.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const metaRes = await fetch(
        `${endpoint}/${container.wabaId}/message_templates?name=${templateName}`,
        { headers: { Authorization: `Bearer ${container.apiKey}` } }
      );
      const metaData = await metaRes.json();

      if (metaData.data && metaData.data.length > 0) {
        const metaTemplate = metaData.data[0];
        const newStatus = metaTemplate.status?.toLowerCase() || template.status;
        if (newStatus !== template.status) {
          await storage.updateTemplate(template.id, { status: newStatus });
        }
        res.json({ status: newStatus, metaStatus: metaTemplate.status });
      } else {
        res.json({ status: template.status, message: "Template not found on Meta" });
      }
    } catch (e: any) {
      console.error("Template sync error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/containers/:containerId/templates/sync-all", isAuthenticated, async (req: any, res) => {
    try {
      const container = await storage.getContainer(req.params.containerId);
      if (!container || !container.wabaId || !container.apiKey) {
        return res.status(400).json({ message: "WhatsApp Business Account not configured" });
      }

      const endpoint = container.apiEndpoint?.replace(/\/$/, "") || "https://graph.facebook.com/v21.0";
      const metaRes = await fetch(
        `${endpoint}/${container.wabaId}/message_templates?limit=100`,
        { headers: { Authorization: `Bearer ${container.apiKey}` } }
      );
      const metaData = await metaRes.json();

      if (!metaData.data) {
        return res.json({ synced: 0 });
      }

      const templates = await storage.getTemplates(req.params.containerId);
      let synced = 0;
      for (const t of templates) {
        if (t.status === "draft") continue;
        const tName = t.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const match = metaData.data.find((m: any) => m.name === tName);
        if (match) {
          const newStatus = match.status?.toLowerCase() || t.status;
          if (newStatus !== t.status) {
            await storage.updateTemplate(t.id, { status: newStatus });
            synced++;
          }
        }
      }
      res.json({ synced });
    } catch (e: any) {
      console.error("Template sync-all error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // Campaigns
  app.get("/api/containers/:containerId/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getCampaigns(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const campaign = await storage.createCampaign({ ...req.body, containerId: req.params.containerId });
      res.json(campaign);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/campaigns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      res.json(campaign);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/campaigns/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Automation Rules
  app.get("/api/containers/:containerId/automations", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getAutomationRules(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/automations", isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.createAutomationRule({ ...req.body, containerId: req.params.containerId });
      res.json(rule);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/automations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const rule = await storage.updateAutomationRule(req.params.id, req.body);
      res.json(rule);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/automations/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAutomationRule(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Conversations
  app.get("/api/containers/:containerId/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getConversations(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const containerId = req.params.containerId;
      const contactId = req.body.contactId;
      if (contactId) {
        const existing = await db.select().from(conversations)
          .where(and(eq(conversations.containerId, containerId), eq(conversations.contactId, contactId)));
        if (existing.length > 0) {
          return res.json(existing[0]);
        }
      }
      const conv = await storage.createConversation({ ...req.body, containerId });
      res.json(conv);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conv = await storage.updateConversation(req.params.id, req.body);
      res.json(conv);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/conversations/:id/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      await db.update(conversations)
        .set({ unreadCount: 0 })
        .where(eq(conversations.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Messages
  app.get("/api/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getMessages(req.params.conversationId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const conv = await storage.getConversation(req.params.conversationId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      const messageData: any = {
        ...req.body,
        conversationId: req.params.conversationId,
        senderId: req.body.isInternalNote ? userId : req.body.senderId || userId,
      };

      let whatsappError: string | null = null;

      if (!req.body.isInternalNote && !req.body.isFromContact) {
        const container = await storage.getContainer(conv.containerId);
        if (container?.isConfigured && container.phoneNumberId && container.apiKey) {
          const contact = await storage.getContact(conv.contactId);
          if (contact) {
            try {
              const endpoint = container.apiEndpoint || "https://graph.facebook.com/v18.0/";
              const url = `${endpoint.replace(/\/$/, "")}/${container.phoneNumberId}/messages`;
              const recipientPhone = contact.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
              console.log("WhatsApp send:", { url, to: recipientPhone, contentLength: req.body.content?.length });
              const waRes = await fetch(url, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${container.apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: recipientPhone,
                  type: "text",
                  text: { preview_url: false, body: req.body.content },
                }),
              });
              const waData = await waRes.json();
              console.log("WhatsApp response:", { status: waRes.status, data: JSON.stringify(waData).slice(0, 500) });
              if (waData.messages?.[0]?.id) {
                messageData.whatsappMessageId = waData.messages[0].id;
              } else if (waData.error) {
                whatsappError = `WhatsApp API error: ${waData.error.message || waData.error.type || "Unknown error"} (code: ${waData.error.code || "N/A"})`;
                console.error("WhatsApp send failed:", whatsappError);
              }
            } catch (waErr: any) {
              whatsappError = `WhatsApp connection error: ${waErr.message}`;
              console.error("WhatsApp send exception:", waErr.message);
            }
          }
        }
      }

      const message = await storage.createMessage(messageData);

      await storage.updateConversation(conv.id, { lastMessageAt: new Date() });

      if (conv.assignedTo && conv.assignedTo !== userId) {
        broadcastToUser(conv.assignedTo, { type: 'new_message', message, conversationId: conv.id });
      }

      broadcastToUser(conv.containerId, { type: 'new_message', message, conversationId: conv.id, containerId: conv.containerId });

      res.json({ ...message, whatsappError });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Deals
  app.get("/api/containers/:containerId/deals", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getDeals(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/deals", isAuthenticated, async (req: any, res) => {
    try {
      const deal = await storage.createDeal({ ...req.body, containerId: req.params.containerId });
      res.json(deal);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const deal = await storage.updateDeal(req.params.id, req.body);
      res.json(deal);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteDeal(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Orders
  app.get("/api/containers/:containerId/orders", isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.getOrders(req.params.containerId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers/:containerId/orders", isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.createOrder({ ...req.body, containerId: req.params.containerId });
      res.json(order);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      res.json(order);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      await db.delete(orders).where(eq(orders.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/orders/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty ids array" });
      }
      await db.delete(orders).where(inArray(orders.id, ids));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/orders/bulk-update-status", isAuthenticated, async (req: any, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty ids array" });
      }
      await db.update(orders).set({ status }).where(inArray(orders.id, ids));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const result = await storage.getNotifications(userId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // WhatsApp Webhook Verification (GET)
  app.get("/api/webhook", async (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("Webhook verification attempt:", { mode, token: token ? `${String(token).slice(0, 8)}...` : "none", challenge: challenge ? "present" : "missing" });

    if (mode === "subscribe" && token) {
      const globalToken = process.env.WEBHOOK_VERIFY_TOKEN;
      if (globalToken && token === globalToken) {
        console.log("Webhook verified with global verify token");
        return res.status(200).send(challenge);
      }

      const allContainers = await db.select().from(containers);
      const match = allContainers.find(c => c.webhookVerifyToken === token);
      if (match) {
        console.log("Webhook verified for container:", match.id);
        return res.status(200).send(challenge);
      }
    }
    console.log("Webhook verification failed — token mismatch");
    res.status(403).send("Forbidden");
  });

  // WhatsApp Webhook Incoming Messages (POST)
  app.post("/api/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"] as string | undefined;
      const body = req.body;

      console.log("Webhook POST received:", { object: body.object, entries: body.entry?.length || 0 });

      if (body.object !== "whatsapp_business_account") {
        console.log("Webhook rejected: invalid object type:", body.object);
        return res.status(400).json({ message: "Invalid object type" });
      }

      for (const entry of body.entry || []) {
        const wabaId = entry.id;
        const [container] = await db.select().from(containers)
          .where(eq(containers.wabaId, wabaId));

        if (!container) {
          console.warn("Webhook: no container found for wabaId:", wabaId);
          continue;
        }
        console.log("Webhook: matched container", container.id, "for wabaId:", wabaId);

        const signingSecret = container.appSecret || process.env.META_APP_SECRET;
        if (signingSecret) {
          if (!signature) {
            console.warn("Webhook: missing x-hub-signature-256 header for container:", container.id, "— skipping");
            continue;
          }
          const rawBody = (req as any).rawBody
            ? Buffer.from((req as any).rawBody)
            : Buffer.from(JSON.stringify(body));
          const expected = "sha256=" + crypto
            .createHmac("sha256", signingSecret)
            .update(rawBody)
            .digest("hex");
          try {
            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
              console.warn("Webhook: signature mismatch for container:", container.id, "expected:", expected.slice(0, 20) + "...", "got:", (signature || "").slice(0, 20) + "...", "— skipping");
              continue;
            }
          } catch (sigErr: any) {
            console.warn("Webhook: signature validation error for container:", container.id, sigErr.message, "— skipping");
            continue;
          }
          console.log("Webhook: signature verified for container:", container.id);
        }

        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const value = change.value;

            if (value?.statuses) {
              for (const status of value.statuses) {
                console.log("Webhook: message status update:", { messageId: status.id, status: status.status, recipient: status.recipient_id });
              }
            }

            if (!value?.messages) continue;

            for (const msg of value.messages) {
              const senderPhone = msg.from;
              if (!senderPhone) continue;

              let messageContent = "";
              if (msg.type === "text") {
                messageContent = msg.text?.body || "";
              } else if (msg.type === "image") {
                messageContent = `[Image]${msg.image?.caption ? ` ${msg.image.caption}` : ""}`;
              } else if (msg.type === "video") {
                messageContent = `[Video]${msg.video?.caption ? ` ${msg.video.caption}` : ""}`;
              } else if (msg.type === "audio") {
                messageContent = "[Audio message]";
              } else if (msg.type === "document") {
                messageContent = `[Document] ${msg.document?.filename || "file"}`;
              } else if (msg.type === "sticker") {
                messageContent = "[Sticker]";
              } else if (msg.type === "location") {
                messageContent = `[Location] ${msg.location?.latitude}, ${msg.location?.longitude}`;
              } else if (msg.type === "contacts") {
                messageContent = "[Contact shared]";
              } else if (msg.type === "reaction") {
                console.log("Webhook: reaction received:", msg.reaction);
                continue;
              } else if (msg.type === "interactive") {
                const interactive = msg.interactive;
                const msgAny = msg as any;
                if (interactive?.type === "nlu_response" && interactive.nlu_response) {
                  const nlu = interactive.nlu_response;
                  msgAny.flow_token = nlu.flow_token;
                  msgAny.flow_payload = nlu.response_json;
                  try {
                    const parsed = JSON.parse(nlu.response_json || "{}");
                    Object.assign(msgAny, parsed);
                    const firstVal = Object.values(parsed)[0];
                    messageContent = `[Flow Submitted] ${typeof firstVal === "string" ? firstVal : JSON.stringify(parsed)}`;
                  } catch (e) {
                    messageContent = `[Flow Submitted] Token: ${nlu.flow_token}`;
                  }
                } else if (interactive?.type === "button_reply" && interactive.button_reply) {
                  messageContent = interactive.button_reply.title || "";
                  msgAny.button_id = interactive.button_reply.id;
                } else if (interactive?.type === "list_reply" && interactive.list_reply) {
                  messageContent = interactive.list_reply.title || "";
                  msgAny.list_id = interactive.list_reply.id;
                } else {
                  messageContent = "[Interactive message]";
                }
              } else {
                messageContent = `[${msg.type}] message`;
              }

              if (!messageContent) continue;

              const normalizedSenderPhone = senderPhone.replace(/[^0-9]/g, "");
              console.log("Webhook: incoming message from", senderPhone, "(normalized:", normalizedSenderPhone, ") type:", msg.type, "preview:", messageContent.slice(0, 50));

              const containerContacts = await db.select().from(contacts)
                .where(eq(contacts.containerId, container.id));
              let contact = containerContacts.find(c => {
                const normalizedStored = c.phone.replace(/[^0-9]/g, "");
                return normalizedStored === normalizedSenderPhone || normalizedSenderPhone.endsWith(normalizedStored) || normalizedStored.endsWith(normalizedSenderPhone);
              });

              if (!contact) {
                const senderName = value.contacts?.[0]?.profile?.name || senderPhone;
                const formattedPhone = senderPhone.startsWith("+") ? senderPhone : `+${senderPhone}`;
                [contact] = await db.insert(contacts).values({
                  containerId: container.id,
                  name: senderName,
                  phone: formattedPhone,
                }).returning();
                console.log("Webhook: created new contact:", contact.id, contact.name, contact.phone);
              } else {
                console.log("Webhook: matched existing contact:", contact.id, contact.name, contact.phone);
              }

              let [conv] = await db.select().from(conversations)
                .where(and(
                  eq(conversations.containerId, container.id),
                  eq(conversations.contactId, contact.id)
                ));

              if (!conv) {
                [conv] = await db.insert(conversations).values({
                  containerId: container.id,
                  contactId: contact.id,
                  status: "open",
                }).returning();
                console.log("Webhook: created new conversation:", conv.id);
              }

              const mediaType = ["image", "video", "audio", "document", "sticker"].includes(msg.type) ? msg.type : undefined;
              const mediaId = msg[msg.type]?.id;
              let mediaUrl: string | undefined;
              if (mediaId && container.apiKey) {
                try {
                  const endpoint = container.apiEndpoint?.replace(/\/$/, "") || "https://graph.facebook.com/v21.0";
                  const mediaRes = await fetch(`${endpoint}/${mediaId}`, { headers: { Authorization: `Bearer ${container.apiKey}` } });
                  const mediaData = await mediaRes.json();
                  if (mediaData.url) mediaUrl = mediaData.url;
                } catch (e: any) {
                  console.log("Webhook: failed to fetch media URL:", e.message);
                }
              }

              const newMessage = await storage.createMessage({
                conversationId: conv.id,
                content: messageContent,
                isFromContact: true,
                whatsappMessageId: msg.id,
                mediaType: mediaType,
                mediaUrl: mediaUrl,
              });
              console.log("Webhook: stored message:", newMessage.id);

              await db.update(conversations)
                .set({ unreadCount: sql`COALESCE(${conversations.unreadCount}, 0) + 1` })
                .where(eq(conversations.id, conv.id));

              if (conv.assignedTo) {
                broadcastToUser(conv.assignedTo, {
                  type: "new_message",
                  message: newMessage,
                  conversationId: conv.id,
                  containerId: container.id,
                });
              }

              broadcastToUser(container.ownerId, {
                type: "new_message",
                message: newMessage,
                conversationId: conv.id,
                containerId: container.id,
              });

              // Trigger active workflows for the container
              try {
                const activeWorkflow = await db.query.workflows.findFirst({
                  where: and(
                    eq(workflows.containerId, container.id),
                    eq(workflows.isActive, true)
                  )
                });
                if (activeWorkflow) {
                  console.log(`[Webhook] Triggering active workflow ${activeWorkflow.id} for message from ${senderPhone}`);
                  const payload = {
                    message: {
                      body: messageContent,
                      from: senderPhone,
                      from_name: value.contacts?.[0]?.profile?.name || senderPhone,
                      ...(msg as any)
                    },
                    session: {
                      thread_id: conv.id,
                    }
                  };
                  executeWorkflow(activeWorkflow.id, payload, false).catch(err => {
                    console.error("[Webhook workflow execution error]", err);
                  });
                }
              } catch (wfErr: any) {
                console.error("Error finding/triggering workflows for webhook:", wfErr.message);
              }
            }
          } else if (change.field === "message_template_status_update") {
            const value = change.value;
            console.log("Webhook: template status update received:", JSON.stringify(value));
            
            if (value?.message_template_name && value?.event) {
              const templateName = value.message_template_name;
              const metaStatus = value.event;
              const metaTemplateId = value.message_template_id?.toString();
              
              let mappedStatus: string;
              if (metaStatus === "APPROVED") {
                mappedStatus = "approved";
              } else if (metaStatus === "REJECTED" || metaStatus === "DISABLED" || metaStatus === "FLAGGED") {
                mappedStatus = "rejected";
              } else if (metaStatus === "PENDING" || metaStatus === "IN_APPEAL" || metaStatus === "PENDING_DELETION") {
                mappedStatus = "pending";
              } else {
                mappedStatus = metaStatus.toLowerCase();
              }

              const containerTemplates = await storage.getTemplates(container.id);
              const normalizedWebhookName = templateName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
              
              const matchedTemplate = containerTemplates.find(t => {
                const normalizedLocalName = t.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                return normalizedLocalName === normalizedWebhookName || 
                       (metaTemplateId && t.metaTemplateId === metaTemplateId);
              });

              if (matchedTemplate) {
                await storage.updateTemplate(matchedTemplate.id, { 
                  status: mappedStatus as any,
                  metaTemplateId: metaTemplateId || matchedTemplate.metaTemplateId,
                });
                console.log(`Webhook: updated template "${matchedTemplate.name}" status to "${mappedStatus}"`);
              } else {
                console.log(`Webhook: no matching local template found for "${templateName}" in container ${container.id}`);
              }
            }
          } else {
            console.log("Webhook: unhandled change field:", change.field);
          }
        }
      }

      res.status(200).json({ status: "ok" });
    } catch (e: any) {
      console.error("Webhook processing error:", e.message, e.stack);
      res.status(200).json({ status: "ok" });
    }
  });

  // Test WhatsApp API connection
  app.post("/api/containers/:id/test-connection", isAuthenticated, async (req: any, res) => {
    try {
      const container = await storage.getContainer(req.params.id);
      if (!container) return res.status(404).json({ message: "Container not found" });
      if (!container.phoneNumberId || !container.apiKey) {
        return res.status(400).json({ message: "Phone Number ID and Access Token are required" });
      }

      const endpoint = container.apiEndpoint || "https://graph.facebook.com/v18.0/";
      const url = `${endpoint.replace(/\/$/, "")}/${container.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`;
      const waRes = await fetch(url, {
        headers: { "Authorization": `Bearer ${container.apiKey}` },
      });
      const data = await waRes.json();

      if (waRes.ok && !data.error) {
        res.json({ success: true, phoneNumber: data.display_phone_number, qualityRating: data.quality_rating, verifiedName: data.verified_name });
      } else {
        res.json({ success: false, error: data.error?.message || "Connection failed. Check your Phone Number ID and Access Token." });
      }
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
  });

  app.get("/api/whatsapp/webhook-info", isAuthenticated, (req, res) => {
    const hostHeader = req.headers.host || req.headers["x-forwarded-host"];
    const baseUrl = hostHeader
      ? `https://${hostHeader}`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const callbackUrl = `${baseUrl}/api/webhook`;
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "";
    res.json({ callbackUrl, verifyToken });
  });

  // WhatsApp Embedded Signup - public config endpoint
  app.get("/api/whatsapp/app-config", (_req, res) => {
    const appId = process.env.META_APP_ID;
    const configId = process.env.META_CONFIG_ID;
    if (!appId || !configId) {
      return res.status(503).json({ message: "Meta App not configured" });
    }
    res.json({ appId, configId });
  });

  // WhatsApp Flow Decryption Endpoint (Data Exchange URL for Meta)
  app.post("/api/whatsapp/flow", async (req, res) => {
    try {
      const { encrypted_aes_key, encrypted_flow_data, initial_vector } = req.body;
      if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
        return res.status(400).send("Bad Request: Missing flow variables");
      }

      let privateKeyPEM = "";
      const localKeyPath = path.join(process.cwd(), "private.pem");
      if (fs.existsSync(localKeyPath)) {
        privateKeyPEM = fs.readFileSync(localKeyPath, "utf8");
      } else {
        privateKeyPEM = process.env.FLOW_PRIVATE_KEY || "";
      }

      if (!privateKeyPEM) {
        console.error("[Flow Endpoint] FLOW_PRIVATE_KEY is missing from environment/file.");
        return res.status(500).send("Server Configuration Error");
      }

      // Strip potential single or double quotes wrapped by Hostinger's environment loader
      privateKeyPEM = privateKeyPEM.trim();
      if (privateKeyPEM.startsWith("'") && privateKeyPEM.endsWith("'")) {
        privateKeyPEM = privateKeyPEM.slice(1, -1);
      } else if (privateKeyPEM.startsWith('"') && privateKeyPEM.endsWith('"')) {
        privateKeyPEM = privateKeyPEM.slice(1, -1);
      }
      
      // Replace literal escaped \n with actual newlines
      privateKeyPEM = privateKeyPEM.replace(/\\n/g, "\n");

      // 1. Decrypt the AES key
      const decryptedAesKey = crypto.privateDecrypt(
        {
          key: crypto.createPrivateKey(privateKeyPEM),
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(encrypted_aes_key, "base64")
      );

      // 2. Decrypt the Flow data
      const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
      const initialVectorBuffer = Buffer.from(initial_vector, "base64");
      const TAG_LENGTH = 16;
      const encryptedBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
      const authTag = flowDataBuffer.subarray(-TAG_LENGTH);

      const decipher = crypto.createDecipheriv(
        "aes-128-gcm",
        decryptedAesKey,
        initialVectorBuffer
      );
      decipher.setAuthTag(authTag);

      const decryptedJSON = Buffer.concat([
        decipher.update(encryptedBody),
        decipher.final()
      ]).toString("utf-8");

      const decryptedBody = JSON.parse(decryptedJSON);
      console.log("[Flow Endpoint] Decrypted Body:", decryptedBody);

      const { action, screen, data = {}, flow_token } = decryptedBody;
      let responsePayload: any = {};

      if (action === "INIT") {
        responsePayload = {
          screen: "ADDRESS_SCREEN",
          data: {}
        };
      } else if (action === "data_exchange") {
        console.log("[Flow Endpoint] Received form data:", data);
        
        // Extract fields
        const address = data.address || data.shipping_address || data.shipping_address_field;
        const orderNumber = data.order_number || data.order_number_field || flow_token; 
        
        if (address && orderNumber) {
          console.log(`[Flow Endpoint] Updating order ${orderNumber} with address: "${address}"`);
          const [updatedOrder] = await db.update(orders)
            .set({ shippingAddress: address })
            .where(eq(orders.orderNumber, orderNumber))
            .returning();
          
          if (updatedOrder) {
            console.log(`[Flow Endpoint] Successfully updated order in DB:`, updatedOrder.id);
          } else {
            console.warn(`[Flow Endpoint] No order found with orderNumber: ${orderNumber}`);
          }
        }

        // Return SUCCESS to close the flow and pass parameters
        responsePayload = {
          screen: "SUCCESS",
          data: {
            extension_message_response: {
              params: {
                flow_token,
                status: "success",
                address: address || ""
              }
            }
          }
        };
      } else if (action === "BACK") {
        responsePayload = {
          screen: "ADDRESS_SCREEN",
          data: {}
        };
      } else if (action === "ping") {
        responsePayload = {
          data: {
            status: "active"
          }
        };
      } else {
        responsePayload = {
          screen: "ADDRESS_SCREEN",
          data: {}
        };
      }

      // 3. Encrypt the response using AES-GCM (flip initialization vector bytes)
      const flippedIV = Buffer.alloc(initialVectorBuffer.length);
      for (let i = 0; i < initialVectorBuffer.length; i++) {
        flippedIV[i] = ~initialVectorBuffer[i];
      }

      const cipher = crypto.createCipheriv(
        "aes-128-gcm",
        decryptedAesKey,
        flippedIV
      );

      const encryptedResponse = Buffer.concat([
        cipher.update(JSON.stringify(responsePayload), "utf-8"),
        cipher.final(),
        cipher.getAuthTag()
      ]).toString("base64");

      res.setHeader("Content-Type", "text/plain");
      res.send(encryptedResponse);

    } catch (error: any) {
      console.error("[Flow Endpoint Decryption Error]", error);
      res.status(421).send("Decryption failed");
    }
  });

  // WhatsApp Embedded Signup - OAuth token exchange and auto-configuration
  app.post("/api/whatsapp/embedded-signup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { code, phoneNumberId, wabaId, containerId } = req.body;

      if (!code) {
        return res.status(400).json({ message: "Authorization code is required" });
      }

      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      if (!appId || !appSecret) {
        return res.status(503).json({ message: "Meta App credentials not configured on server" });
      }

      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || tokenData.error) {
        return res.status(400).json({
          message: tokenData.error?.message || "Failed to exchange authorization code for access token",
        });
      }

      const accessToken = tokenData.access_token;

      let resolvedPhoneNumberId = phoneNumberId;
      let resolvedWabaId = wabaId;
      let phoneDisplay = "";
      let verifiedName = "";

      if (resolvedWabaId && !resolvedPhoneNumberId) {
        try {
          const phonesRes = await fetch(
            `https://graph.facebook.com/v21.0/${resolvedWabaId}/phone_numbers`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const phonesData = await phonesRes.json();
          if (phonesData.data?.[0]) {
            resolvedPhoneNumberId = phonesData.data[0].id;
            phoneDisplay = phonesData.data[0].display_phone_number || "";
            verifiedName = phonesData.data[0].verified_name || "";
          }
        } catch (e: any) {
          console.error("Failed to fetch phone numbers:", e.message);
        }
      }

      if (resolvedPhoneNumberId) {
        try {
          const phoneInfoRes = await fetch(
            `https://graph.facebook.com/v21.0/${resolvedPhoneNumberId}?fields=verified_name,display_phone_number`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const phoneInfo = await phoneInfoRes.json();
          if (phoneInfo.display_phone_number) phoneDisplay = phoneInfo.display_phone_number;
          if (phoneInfo.verified_name) verifiedName = phoneInfo.verified_name;
        } catch {}
      }

      if (resolvedPhoneNumberId) {
        try {
          await fetch(`https://graph.facebook.com/v21.0/${resolvedPhoneNumberId}/register`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              pin: String(Math.floor(100000 + Math.random() * 900000)),
            }),
          });
        } catch (e: any) {
          console.error("Phone registration (may already be registered):", e.message);
        }
      }

      const webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN || crypto.randomBytes(16).toString("hex");
      const hostHeader = req.headers.host || req.headers["x-forwarded-host"];
      const baseUrl = hostHeader
        ? `https://${hostHeader}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const webhookUrl = `${baseUrl}/api/webhook`;
      console.log("Registering webhook URL:", webhookUrl);

      if (resolvedWabaId) {
        try {
          await fetch(`https://graph.facebook.com/v21.0/${resolvedWabaId}/subscribed_apps`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              override_callback_uri: webhookUrl,
              verify_token: webhookVerifyToken,
            }),
          });
        } catch (e: any) {
          console.error("Webhook subscription error:", e.message);
        }
      }

      const containerData: any = {
        apiKey: accessToken,
        apiEndpoint: "https://graph.facebook.com/v21.0/",
        webhookVerifyToken,
        isConfigured: true,
      };
      if (resolvedPhoneNumberId) containerData.phoneNumberId = resolvedPhoneNumberId;
      if (resolvedWabaId) containerData.wabaId = resolvedWabaId;
      if (phoneDisplay) containerData.phoneNumber = phoneDisplay;
      if (verifiedName) containerData.businessName = verifiedName;

      let container;
      if (containerId) {
        const existing = await storage.getContainer(containerId);
        if (!existing || existing.ownerId !== userId) {
          return res.status(403).json({ message: "Not authorized to update this container" });
        }
        container = await storage.updateContainer(containerId, containerData);
      } else {
        container = await storage.createContainer({
          ...containerData,
          name: verifiedName || "WhatsApp Business",
          ownerId: userId,
        });
      }

      res.json({
        success: true,
        container,
        phoneNumber: phoneDisplay,
        verifiedName,
      });
    } catch (e: any) {
      console.error("Embedded signup error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  
  // ==============================================================================
  // V2 Automation Engine: Workflow Routes
  // ==============================================================================
  
  app.post("/api/containers/:id/workflows", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, triggerType, nodes, edges } = req.body;
      const [workflow] = await db.insert(workflows).values({
        containerId: id,
        name: name || "New V2 Workflow",
        description,
        isActive: isActive !== undefined ? isActive : true,
        triggerType: triggerType || "whatsapp_message",
        nodes: nodes || [],
        edges: edges || [],
      }).returning();
      res.status(201).json(workflow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/containers/:id/workflows", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const allWorkflows = await db.query.workflows.findMany({
        where: eq(workflows.containerId, id),
        orderBy: (workflows, { desc }) => [desc(workflows.createdAt)],
      });
      res.json(allWorkflows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/workflows/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, nodes, edges } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (nodes !== undefined) updateData.nodes = nodes;
      if (edges !== undefined) updateData.edges = edges;
      updateData.updatedAt = new Date();

      const [workflow] = await db.update(workflows).set(updateData).where(eq(workflows.id, id)).returning();
      res.json(workflow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/workflows/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(workflows).where(eq(workflows.id, id));
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/workflows/:id/test-history", async (req, res) => {
    try {
      const { id } = req.params;
      const wf = await db.query.workflows.findFirst({
        where: eq(workflows.id, id),
      });
      if (!wf) return res.status(404).json({ error: "Workflow not found" });

      const testContact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.containerId, wf.containerId),
          eq(contacts.phone, "sandbox_test_phone")
        )
      });
      if (!testContact) return res.json({ history: [] });

      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.containerId, wf.containerId),
          eq(conversations.contactId, testContact.id)
        )
      });
      if (!conv) return res.json({ history: [] });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const dbMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.conversationId, conv.id),
          gt(messages.createdAt, oneHourAgo)
        ),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)]
      });

      const history = dbMessages.map(msg => ({
        role: msg.isFromContact ? "user" : "bot",
        content: msg.content
      }));

      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/workflows/:id/reset-test", async (req, res) => {
    try {
      const { id } = req.params;
      const wf = await db.query.workflows.findFirst({
        where: eq(workflows.id, id),
      });
      if (!wf) return res.status(404).json({ error: "Workflow not found" });

      const testContact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.containerId, wf.containerId),
          eq(contacts.phone, "sandbox_test_phone")
        )
      });
      if (testContact) {
        const conv = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.containerId, wf.containerId),
            eq(conversations.contactId, testContact.id)
          )
        });
        if (conv) {
          await db.delete(messages).where(eq(messages.conversationId, conv.id));
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==============================================================================
  // KNOWLEDGE BASE (RAG)
  // ==============================================================================

  app.get("/api/containers/:containerId/knowledge-bases", isAuthenticated, async (req: any, res) => {
    try {
      const bases = await db.query.knowledgeBases.findMany({
        where: eq(knowledgeBases.containerId, req.params.containerId),
        orderBy: (kb, { desc }) => [desc(kb.createdAt)]
      });
      res.json(bases);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/containers/:containerId/knowledge-bases", isAuthenticated, async (req: any, res) => {
    try {
      const [kb] = await db.insert(knowledgeBases).values({
        containerId: req.params.containerId,
        name: req.body.name,
        description: req.body.description,
      }).returning();
      res.json(kb);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/knowledge-bases/:id", isAuthenticated, async (req: any, res) => {
    try {
      await db.delete(knowledgeBases).where(eq(knowledgeBases.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/knowledge-bases/:baseId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const docs = await db.query.knowledgeDocuments.findMany({
        where: eq(knowledgeDocuments.baseId, req.params.baseId),
        orderBy: (doc, { desc }) => [desc(doc.createdAt)]
      });
      res.json(docs);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/knowledge-bases/:baseId/documents/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const [doc] = await db.insert(knowledgeDocuments).values({
        baseId: req.params.baseId,
        filename: file.originalname,
        status: "processing",
      }).returning();

      res.json(doc);

      // Process in background
      processDocument(doc.id, file.buffer, file.mimetype).catch(err => console.error("Process Document Error:", err));
      
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/knowledge-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/workflows/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      console.log(`[TEST] Triggering workflow ${id} with payload`, payload);
      
      const result = await executeWorkflow(id, payload, true);
      res.json({ response: result.testOutput, botReply: result.botReply });
    } catch (error: any) {
      console.error("[TEST ERROR]", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/containers/:containerId/sandbox/message", isAuthenticated, async (req: any, res) => {
    try {
      const { containerId } = req.params;
      const { content, history: clientHistory = [] } = req.body;

      const container = await db.query.containers.findFirst({
        where: eq(containers.id, containerId)
      });
      if (!container) return res.status(404).json({ error: "No active container found" });

      const activeWorkflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.containerId, container.id),
          eq(workflows.isActive, true)
        )
      });

      if (!activeWorkflow) {
        return res.json({ reply: null, info: "No active workflow found. Activate a workflow in the Automations page first." });
      }

      let simulatedMessage: any = {
        body: content,
        from: "sandbox_test_phone",
        from_name: "Sandbox Customer"
      };

      if (typeof content === "string" && content.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(content);
          simulatedMessage = {
            ...simulatedMessage,
            ...parsed,
            body: parsed.body || parsed.message || `[Flow Submitted] ${JSON.stringify(parsed)}`
          };
        } catch (e) {
          // Fall back to simple text if JSON parsing fails
        }
      }

      const payload = {
        message: simulatedMessage,
        session: { thread_id: "sandbox_session" }
      };

      console.log(`[Sandbox] Running workflow ${activeWorkflow.id} with message: "${content}"`);
      const result = await executeWorkflow(activeWorkflow.id, payload, true);
      console.log(`[Sandbox] Full result → botReply="${result.botReply}" testOutput="${String(result.testOutput).substring(0, 200)}"`);
      const reply = result.botReply || result.testOutput || null;
      console.log(`[Sandbox] Sending reply to client: "${String(reply).substring(0, 200)}"`);

      res.json({ reply });
    } catch (error: any) {
      console.error("[Sandbox message error]", error.message);
      // Return a 200 with the error so the frontend can display it gracefully in the chat
      res.json({ error: error.message });
    }
  });

  app.get("/api/containers/:containerId/sandbox/history", isAuthenticated, async (req: any, res) => {
    try {
      const { containerId } = req.params;
      const container = await db.query.containers.findFirst({
        where: eq(containers.id, containerId)
      });
      if (!container) return res.json({ history: [] });

      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.containerId, container.id),
          eq(contacts.phone, "sandbox_test_phone")
        )
      });
      if (!contact) return res.json({ history: [] });

      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.containerId, container.id),
          eq(conversations.contactId, contact.id)
        )
      });
      if (!conv) return res.json({ history: [] });

      const dbMessages = await db.query.messages.findMany({
        where: eq(messages.conversationId, conv.id),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 100
      });

      const history = dbMessages.map(msg => ({
        role: msg.isFromContact ? "user" : "bot",
        content: msg.content,
        createdAt: msg.createdAt
      }));

      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/containers/:containerId/sandbox/reset", isAuthenticated, async (req: any, res) => {
    try {
      const { containerId } = req.params;
      const container = await db.query.containers.findFirst({
        where: eq(containers.id, containerId)
      });
      if (!container) return res.json({ success: true });

      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.containerId, container.id),
          eq(contacts.phone, "sandbox_test_phone")
        )
      });
      if (contact) {
        const conv = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.containerId, container.id),
            eq(conversations.contactId, contact.id)
          )
        });
        if (conv) {
          await db.delete(messages).where(eq(messages.conversationId, conv.id));
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==============================================================================

return httpServer;
}
