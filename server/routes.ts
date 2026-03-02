import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { WebSocketServer, WebSocket } from "ws";
import { seedDatabase } from "./seed";
import { containers, contacts, conversations } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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

  // Containers
  app.get("/api/containers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await seedDatabase(userId);
      const result = await storage.getContainersByUser(userId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/containers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const conv = await storage.createConversation({ ...req.body, containerId: req.params.containerId });
      res.json(conv);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conv = await storage.updateConversation(req.params.id, req.body);
      res.json(conv);
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
      const userId = req.user.claims.sub;
      const conv = await storage.getConversation(req.params.conversationId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      const messageData: any = {
        ...req.body,
        conversationId: req.params.conversationId,
        senderId: req.body.isInternalNote ? userId : req.body.senderId || userId,
      };

      if (!req.body.isInternalNote && !req.body.isFromContact) {
        const container = await storage.getContainer(conv.containerId);
        if (container?.isConfigured && container.phoneNumberId && container.apiKey) {
          const contact = await storage.getContact(conv.contactId);
          if (contact) {
            try {
              const endpoint = container.apiEndpoint || "https://graph.facebook.com/v18.0/";
              const url = `${endpoint.replace(/\/$/, "")}/${container.phoneNumberId}/messages`;
              const recipientPhone = contact.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
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
              if (waData.messages?.[0]?.id) {
                messageData.whatsappMessageId = waData.messages[0].id;
              }
            } catch (waErr: any) {
              console.error("WhatsApp API error:", waErr.message);
            }
          }
        }
      }

      const message = await storage.createMessage(messageData);

      if (conv.assignedTo && conv.assignedTo !== userId) {
        broadcastToUser(conv.assignedTo, { type: 'new_message', message, conversationId: conv.id });
      }

      res.json(message);
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

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.getNotifications(userId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

    if (mode === "subscribe" && token) {
      const allContainers = await db.select().from(containers);
      const match = allContainers.find(c => c.webhookVerifyToken === token);
      if (match) {
        console.log("Webhook verified for container:", match.id);
        return res.status(200).send(challenge);
      }
    }
    res.status(403).send("Forbidden");
  });

  // WhatsApp Webhook Incoming Messages (POST)
  app.post("/api/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"] as string | undefined;
      const body = req.body;

      if (body.object !== "whatsapp_business_account") {
        return res.status(400).json({ message: "Invalid object type" });
      }

      for (const entry of body.entry || []) {
        const wabaId = entry.id;
        const [container] = await db.select().from(containers)
          .where(eq(containers.wabaId, wabaId));
        if (!container) continue;

        if (container.appSecret) {
          if (!signature) {
            console.warn("Webhook missing signature for container:", container.id);
            continue;
          }
          const rawBody = (req as any).rawBody
            ? Buffer.from((req as any).rawBody)
            : Buffer.from(JSON.stringify(body));
          const expected = "sha256=" + crypto
            .createHmac("sha256", container.appSecret)
            .update(rawBody)
            .digest("hex");
          try {
            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
              console.warn("Webhook signature mismatch for container:", container.id);
              continue;
            }
          } catch {
            console.warn("Webhook signature validation error for container:", container.id);
            continue;
          }
        }

        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          const value = change.value;
          if (!value?.messages) continue;

          for (const msg of value.messages) {
            if (msg.type !== "text") continue;
            const senderPhone = msg.from;
            const messageBody = msg.text?.body;
            if (!senderPhone || !messageBody) continue;

            let [contact] = await db.select().from(contacts)
              .where(and(
                eq(contacts.containerId, container.id),
                eq(contacts.phone, senderPhone)
              ));

            if (!contact) {
              const senderName = value.contacts?.[0]?.profile?.name || senderPhone;
              [contact] = await db.insert(contacts).values({
                containerId: container.id,
                name: senderName,
                phone: senderPhone,
              }).returning();
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
            }

            const newMessage = await storage.createMessage({
              conversationId: conv.id,
              content: messageBody,
              isFromContact: true,
              whatsappMessageId: msg.id,
            });

            if (conv.assignedTo) {
              broadcastToUser(conv.assignedTo, {
                type: "new_message",
                message: newMessage,
                conversationId: conv.id,
              });
            }

            const owner = container.ownerId;
            broadcastToUser(owner, {
              type: "new_message",
              message: newMessage,
              conversationId: conv.id,
            });
          }
        }
      }

      res.status(200).json({ status: "ok" });
    } catch (e: any) {
      console.error("Webhook processing error:", e.message);
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

  return httpServer;
}
