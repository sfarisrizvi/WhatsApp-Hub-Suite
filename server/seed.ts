import { db } from "./db";
import { containers, contacts, templates, campaigns, conversations, messages, automationRules, deals, orders } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase(userId: string) {
  const existing = await db.select().from(containers).where(eq(containers.ownerId, userId));
  if (existing.length > 0) return;

  const [container] = await db.insert(containers).values({
    name: "Greenleaf Store",
    phoneNumber: "+1 555-0100",
    businessName: "Greenleaf Commerce",
    isConfigured: false,
    ownerId: userId,
  }).returning();

  const { containerMembers } = await import("@shared/schema");
  await db.insert(containerMembers).values({
    containerId: container.id,
    userId: userId,
    role: "admin",
  });

  const contactData = [
    { name: "Sarah Mitchell", phone: "+1 555-0201", email: "sarah@example.com", tags: ["vip", "wholesale"], containerId: container.id },
    { name: "James Chen", phone: "+1 555-0202", email: "james@example.com", tags: ["new", "retail"], containerId: container.id },
    { name: "Maria Garcia", phone: "+1 555-0203", email: "maria@example.com", tags: ["vip", "retail"], containerId: container.id },
    { name: "David Kim", phone: "+1 555-0204", email: "david@example.com", tags: ["wholesale"], containerId: container.id },
    { name: "Emma Wilson", phone: "+1 555-0205", email: "emma@example.com", tags: ["new"], containerId: container.id },
  ];
  const insertedContacts = await db.insert(contacts).values(contactData).returning();

  const templateData = [
    { name: "Welcome Message", category: "utility", body: "Hello {{1}}! Welcome to Greenleaf Store. How can we help you today?", variables: ["customer_name"], status: "approved" as const, containerId: container.id },
    { name: "Order Update", category: "utility", body: "Hi {{1}}, your order #{{2}} status has been updated to: {{3}}. Thank you for shopping with us!", variables: ["customer_name", "order_number", "status"], status: "approved" as const, containerId: container.id },
    { name: "Flash Sale", category: "marketing", body: "Hey {{1}}! Flash sale alert: Get {{2}}% off on all products today only! Use code FLASH{{3}}. Shop now!", variables: ["customer_name", "discount", "year"], status: "approved" as const, containerId: container.id },
    { name: "Payment Reminder", category: "utility", body: "Hi {{1}}, this is a friendly reminder about your pending payment of ${{2}}. Please complete it by {{3}}.", variables: ["customer_name", "amount", "due_date"], status: "draft" as const, containerId: container.id },
  ];
  const insertedTemplates = await db.insert(templates).values(templateData).returning();

  await db.insert(campaigns).values([
    { name: "Spring Sale 2025", templateId: insertedTemplates[2].id, targetTags: ["vip", "retail"], status: "sent" as const, totalRecipients: 45, delivered: 42, read: 35, replied: 12, failed: 3, containerId: container.id },
    { name: "New Arrivals Announcement", templateId: insertedTemplates[2].id, targetTags: ["new"], status: "sent" as const, totalRecipients: 28, delivered: 27, read: 20, replied: 8, failed: 1, containerId: container.id },
    { name: "Holiday Special", templateId: insertedTemplates[2].id, targetTags: [], status: "draft" as const, totalRecipients: 0, delivered: 0, read: 0, replied: 0, failed: 0, containerId: container.id },
  ]);

  await db.insert(automationRules).values([
    { name: "Welcome Greeting", type: "welcome", responseText: "Welcome to Greenleaf Store! We're happy to have you. How can we assist you today?", isActive: true, containerId: container.id },
    { name: "Business Hours Reply", type: "away", responseText: "Thank you for reaching out! Our team is currently away. We'll respond within 24 hours during business days (Mon-Fri, 9AM-6PM).", isActive: true, containerId: container.id },
    { name: "Pricing Inquiry", type: "keyword", trigger: "price, pricing, cost, how much", responseText: "Thanks for your interest! I'll connect you with our sales team for pricing details. In the meantime, check our catalog at greenleaf.com/products", isActive: true, containerId: container.id },
  ]);

  const convData = [
    { contactId: insertedContacts[0].id, status: "open" as const, containerId: container.id },
    { contactId: insertedContacts[1].id, status: "pending" as const, containerId: container.id },
    { contactId: insertedContacts[2].id, status: "closed" as const, containerId: container.id },
  ];
  const insertedConvs = await db.insert(conversations).values(convData).returning();

  await db.insert(messages).values([
    { conversationId: insertedConvs[0].id, content: "Hi, I'd like to place a bulk order for the premium collection.", isFromContact: true, senderId: null },
    { conversationId: insertedConvs[0].id, content: "Hello Sarah! I'd be happy to help with your bulk order. How many units are you looking for?", isFromContact: false, senderId: userId },
    { conversationId: insertedConvs[0].id, content: "Around 500 units. Can you offer a wholesale discount?", isFromContact: true, senderId: null },
    { conversationId: insertedConvs[1].id, content: "Hello, what are your shipping rates to California?", isFromContact: true, senderId: null },
    { conversationId: insertedConvs[1].id, content: "Checking availability for agent", isFromContact: false, isInternalNote: true, senderId: userId },
    { conversationId: insertedConvs[2].id, content: "My order arrived perfectly. Thank you!", isFromContact: true, senderId: null },
    { conversationId: insertedConvs[2].id, content: "Wonderful to hear! Thank you for your business, Maria!", isFromContact: false, senderId: userId },
  ]);

  await db.insert(deals).values([
    { title: "Greenleaf Premium Bundle", value: 15000, stage: "qualified" as const, contactId: insertedContacts[0].id, containerId: container.id },
    { title: "Retail Partnership Q2", value: 8500, stage: "proposal" as const, contactId: insertedContacts[1].id, containerId: container.id },
    { title: "Wholesale Contract 2025", value: 45000, stage: "negotiation" as const, contactId: insertedContacts[3].id, containerId: container.id },
    { title: "New Product Launch Collab", value: 3200, stage: "lead" as const, contactId: insertedContacts[4].id, containerId: container.id },
    { title: "Holiday Gift Set Deal", value: 12000, stage: "closed_won" as const, contactId: insertedContacts[2].id, containerId: container.id },
  ]);

  await db.insert(orders).values([
    { orderNumber: "ORD-001", totalAmount: 25000, status: "delivered" as const, contactId: insertedContacts[2].id, items: [{ name: "Premium Gift Set" }, { name: "Eco Bag" }], containerId: container.id },
    { orderNumber: "ORD-002", totalAmount: 15500, status: "shipped" as const, contactId: insertedContacts[0].id, items: [{ name: "Bulk Premium Collection" }], containerId: container.id },
    { orderNumber: "ORD-003", totalAmount: 8900, status: "confirmed" as const, contactId: insertedContacts[1].id, items: [{ name: "Starter Kit x3" }], containerId: container.id },
    { orderNumber: "ORD-004", totalAmount: 4500, status: "pending" as const, contactId: insertedContacts[4].id, items: [{ name: "Sample Pack" }], containerId: container.id },
  ]);

  console.log("Seed data created successfully for user:", userId);
}
