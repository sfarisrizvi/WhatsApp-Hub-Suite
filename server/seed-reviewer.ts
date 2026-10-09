import bcrypt from "bcryptjs";
import { db } from "./db";
import { 
  users, containers, containerMembers, contacts, 
  conversations, messages, templates, deals, orders, workflows 
} from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedMetaReviewerAccount() {
  const REVIEWER_EMAIL = "meta-reviewer@whatlify.com";
  const REVIEWER_PASS = "ReviewPass2026!";
  const REVIEWER_USER = "metareviewer";

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, REVIEWER_EMAIL));
    if (existing) {
      console.log("[Seed] Meta Reviewer account already exists.");
      return;
    }

    console.log("[Seed] Creating dedicated Meta Reviewer account with sample data...");

    const hashedPassword = await bcrypt.hash(REVIEWER_PASS, 10);
    const [reviewerUser] = await db.insert(users).values({
      email: REVIEWER_EMAIL,
      username: REVIEWER_USER,
      password: hashedPassword,
      firstName: "Meta",
      lastName: "Reviewer",
    }).returning();

    // 1. Create Demo Workspace (Container)
    const [container] = await db.insert(containers).values({
      name: "AlQaim Digital Demo Store",
      businessName: "Whatlify Showcase (AlQaim Digital)",
      phoneNumber: "+1 555-0199",
      phoneNumberId: "demo_phone_number_id",
      wabaId: "demo_waba_id_alqaime",
      isConfigured: true,
      ownerId: reviewerUser.id,
    }).returning();

    await db.insert(containerMembers).values({
      containerId: container.id,
      userId: reviewerUser.id,
      role: "admin",
    });

    // 2. Pre-populate Sample Contacts
    const [c1] = await db.insert(contacts).values({
      containerId: container.id,
      name: "Sarah Jenkins",
      phone: "+1 555-0101",
      email: "sarah.j@example.com",
      tags: ["VIP", "Retail"],
      customFields: { preferredCategory: "Electronics", totalOrders: 4 },
    }).returning();

    const [c2] = await db.insert(contacts).values({
      containerId: container.id,
      name: "David Chen",
      phone: "+1 555-0102",
      email: "david.c@example.com",
      tags: ["New Lead"],
      customFields: { source: "Instagram Ad" },
    }).returning();

    const [c3] = await db.insert(contacts).values({
      containerId: container.id,
      name: "Alex Rivera",
      phone: "+1 555-0103",
      email: "alex.r@example.com",
      tags: ["Support", "High Priority"],
    }).returning();

    // 3. Pre-populate Conversations & Chat History
    const [conv1] = await db.insert(conversations).values({
      containerId: container.id,
      contactId: c1.id,
      assignedTo: reviewerUser.id,
      status: "open",
      unreadCount: 0,
    }).returning();

    await db.insert(messages).values([
      {
        conversationId: conv1.id,
        content: "Hi! I saw your Whatlify promo on WhatsApp. Can I get a status update on my order?",
        isFromContact: true,
        whatsappMessageId: "wamid.HBgLMjA5NTg0ODkzFQIAEhggM0EyRj",
      },
      {
        conversationId: conv1.id,
        content: "Hello Sarah! Thanks for reaching out to AlQaim Digital Demo Store. Your order ORD-9081 is confirmed and out for delivery today!",
        isFromContact: false,
        whatsappMessageId: "wamid.HBgLMjA5NTg0ODkzFQIAEhggM0EyRjEx",
      },
      {
        conversationId: conv1.id,
        content: "That was super fast, thank you so much!",
        isFromContact: true,
        whatsappMessageId: "wamid.HBgLMjA5NTg0ODkzFQIAEhggM0EyRjEy",
      },
      {
        conversationId: conv1.id,
        content: "Customer is very satisfied. Marked for VIP summer discount follow-up.",
        isFromContact: false,
        isInternalNote: true,
      }
    ]);

    const [conv2] = await db.insert(conversations).values({
      containerId: container.id,
      contactId: c2.id,
      assignedTo: reviewerUser.id,
      status: "pending",
      unreadCount: 1,
    }).returning();

    await db.insert(messages).values([
      {
        conversationId: conv2.id,
        content: "Hello, I'd like to inquire about bulk enterprise pricing for WhatsApp Hub.",
        isFromContact: true,
        whatsappMessageId: "wamid.HBgLMjA5NTg0ODkzFQIAEhggM0EyRjIw",
      }
    ]);

    // 4. Pre-populate WhatsApp Templates
    await db.insert(templates).values([
      {
        containerId: container.id,
        name: "welcome_offer_2026",
        category: "marketing",
        templateType: "standard",
        language: "en",
        body: "Welcome to Whatlify by AlQaim Digital! Use coupon code WHATLIFY20 for 20% off your next order.",
        footerText: "Reply STOP to unsubscribe",
        status: "approved",
        metaTemplateId: "meta_tpl_welcome_2026",
      },
      {
        containerId: container.id,
        name: "order_confirmation_v2",
        category: "utility",
        templateType: "standard",
        language: "en",
        body: "Your order {{1}} has been confirmed! We will notify you once tracking is available.",
        footerText: "AlQaim Digital Store",
        status: "approved",
        metaTemplateId: "meta_tpl_order_conf",
      },
      {
        containerId: container.id,
        name: "limited_time_flash_sale",
        category: "marketing",
        templateType: "offer",
        language: "en",
        body: "Exclusive 48-hour flash sale for our WhatsApp VIP members! Tap below to claim your offer.",
        offerText: "SAVE30",
        footerText: "Terms apply",
        status: "approved",
      }
    ]);

    // 5. Pre-populate CRM Deals in Sales Pipeline
    await db.insert(deals).values([
      {
        containerId: container.id,
        contactId: c2.id,
        title: "Enterprise WhatsApp License - 50 Agents",
        value: 1250,
        stage: "proposal",
        assignedTo: reviewerUser.id,
      },
      {
        containerId: container.id,
        contactId: c1.id,
        title: "Retail VIP Annual Subscription",
        value: 480,
        stage: "closed_won",
        assignedTo: reviewerUser.id,
      },
      {
        containerId: container.id,
        contactId: c3.id,
        title: "E-commerce Custom Integration",
        value: 750,
        stage: "negotiation",
        assignedTo: reviewerUser.id,
      }
    ]);

    // 6. Pre-populate Orders
    await db.insert(orders).values([
      {
        containerId: container.id,
        contactId: c1.id,
        orderNumber: "ORD-9081",
        totalAmount: 149,
        status: "confirmed",
        shippingAddress: "742 Evergreen Terrace, Springfield",
        items: [
          { name: "Wireless Smart Headset", quantity: 1, price: 99 },
          { name: "Protective Hard Case", quantity: 1, price: 50 },
        ],
      },
      {
        containerId: container.id,
        contactId: c2.id,
        orderNumber: "ORD-9082",
        totalAmount: 89,
        status: "delivered",
        shippingAddress: "100 King Street, Suite 400",
        items: [
          { name: "Fast Charging Dock", quantity: 1, price: 89 },
        ],
      }
    ]);

    // 7. Pre-populate a Sample Active Workflow
    await db.insert(workflows).values({
      containerId: container.id,
      name: "Meta Reviewer Customer Service Bot",
      description: "Automated greeting and instant order status resolver for WhatsApp users",
      isActive: true,
      triggerType: "whatsapp_message",
      nodes: [
        {
          id: "node-trigger",
          type: "triggerNode",
          position: { x: 100, y: 150 },
          data: { label: "Inbound WhatsApp Message", triggerType: "whatsapp_message" },
        },
        {
          id: "node-ai",
          type: "aiNode",
          position: { x: 420, y: 150 },
          data: {
            label: "AlQaim Digital AI Assistant",
            provider: "openai",
            systemMessage: "You are an AI assistant for AlQaim Digital's Whatlify demo store. Greet customers warmly and help answer queries about their orders and services.",
            prompt: "{{ $json.message.body }}",
          },
        },
        {
          id: "node-reply",
          type: "messageNode",
          position: { x: 740, y: 150 },
          data: {
            label: "Send WhatsApp Reply",
            messageText: "{{ $node['node-ai'].json.response }}",
          },
        },
      ],
      edges: [
        { id: "e1-2", source: "node-trigger", target: "node-ai" },
        { id: "e2-3", source: "node-ai", target: "node-reply" },
      ],
    });

    console.log("[Seed] Meta Reviewer account successfully provisioned!");
  } catch (err: any) {
    console.error("[Seed] Failed to seed Meta Reviewer account:", err.message);
  }
}
