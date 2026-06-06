import {
  type User, type UpsertUser,
  type Container, type InsertContainer,
  type Contact, type InsertContact,
  type Template, type InsertTemplate,
  type Campaign, type InsertCampaign,
  type AutomationRule, type InsertAutomationRule,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Deal, type InsertDeal,
  type Order, type InsertOrder,
  type Notification, type InsertNotification,
  type ContainerMember, type InsertContainerMember,
  containers, contacts, templates, campaigns, automationRules,
  conversations, messages, deals, orders, notifications, containerMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // Containers
  getContainersByUser(userId: string): Promise<Container[]>;
  getContainer(id: string): Promise<Container | undefined>;
  createContainer(data: InsertContainer): Promise<Container>;
  updateContainer(id: string, data: Partial<InsertContainer>): Promise<Container>;
  deleteContainer(id: string): Promise<void>;

  // Container Members
  getContainerMembers(containerId: string): Promise<ContainerMember[]>;
  addContainerMember(data: InsertContainerMember): Promise<ContainerMember>;
  removeContainerMember(id: string): Promise<void>;
  updateMemberRole(id: string, role: string): Promise<ContainerMember>;

  // Contacts
  getContacts(containerId: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(data: InsertContact): Promise<Contact>;
  updateContact(id: string, data: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  searchContacts(containerId: string, query: string): Promise<Contact[]>;

  // Templates
  getTemplates(containerId: string): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(data: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;

  // Campaigns
  getCampaigns(containerId: string): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;

  // Automation Rules
  getAutomationRules(containerId: string): Promise<AutomationRule[]>;
  createAutomationRule(data: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: string, data: Partial<InsertAutomationRule>): Promise<AutomationRule>;
  deleteAutomationRule(id: string): Promise<void>;

  // Conversations
  getConversations(containerId: string): Promise<(Conversation & { contact: Contact | null })[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;

  // Deals
  getDeals(containerId: string): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(data: InsertDeal): Promise<Deal>;
  updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal>;
  deleteDeal(id: string): Promise<void>;

  // Orders
  getOrders(containerId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Containers
  async getContainersByUser(userId: string): Promise<Container[]> {
    const owned = await db.select().from(containers).where(eq(containers.ownerId, userId));
    const memberOf = await db.select({ containerId: containerMembers.containerId })
      .from(containerMembers).where(eq(containerMembers.userId, userId));
    if (memberOf.length > 0) {
      const memberContainers = await db.select().from(containers)
        .where(inArray(containers.id, memberOf.map(m => m.containerId)));
      const allIds = new Set(owned.map(c => c.id));
      for (const c of memberContainers) {
        if (!allIds.has(c.id)) owned.push(c);
      }
    }
    return owned;
  }

  async getContainer(id: string): Promise<Container | undefined> {
    const [container] = await db.select().from(containers).where(eq(containers.id, id));
    return container;
  }

  async createContainer(data: InsertContainer): Promise<Container> {
    const [container] = await db.insert(containers).values(data).returning();
    await db.insert(containerMembers).values({
      containerId: container.id,
      userId: data.ownerId,
      role: "admin",
    });
    return container;
  }

  async updateContainer(id: string, data: Partial<InsertContainer>): Promise<Container> {
    const [container] = await db.update(containers).set(data).where(eq(containers.id, id)).returning();
    return container;
  }

  async deleteContainer(id: string): Promise<void> {
    await db.delete(containers).where(eq(containers.id, id));
  }

  // Container Members
  async getContainerMembers(containerId: string): Promise<ContainerMember[]> {
    return db.select().from(containerMembers).where(eq(containerMembers.containerId, containerId));
  }

  async addContainerMember(data: InsertContainerMember): Promise<ContainerMember> {
    const [member] = await db.insert(containerMembers).values(data).returning();
    return member;
  }

  async removeContainerMember(id: string): Promise<void> {
    await db.delete(containerMembers).where(eq(containerMembers.id, id));
  }

  async updateMemberRole(id: string, role: string): Promise<ContainerMember> {
    const [member] = await db.update(containerMembers).set({ role: role as any }).where(eq(containerMembers.id, id)).returning();
    return member;
  }

  // Contacts
  async getContacts(containerId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.containerId, containerId)).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(data: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
  }

  async updateContact(id: string, data: Partial<InsertContact>): Promise<Contact> {
    const [contact] = await db.update(contacts).set(data).where(eq(contacts.id, id)).returning();
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async searchContacts(containerId: string, query: string): Promise<Contact[]> {
    return db.select().from(contacts)
      .where(and(eq(contacts.containerId, containerId), ilike(contacts.name, `%${query}%`)));
  }

  // Templates
  async getTemplates(containerId: string): Promise<Template[]> {
    return db.select().from(templates).where(eq(templates.containerId, containerId)).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(data: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(data).returning();
    return template;
  }

  async updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template> {
    const [template] = await db.update(templates).set(data).where(eq(templates.id, id)).returning();
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Campaigns
  async getCampaigns(containerId: string): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.containerId, containerId)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(data).returning();
    return campaign;
  }

  async updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign> {
    const [campaign] = await db.update(campaigns).set(data).where(eq(campaigns.id, id)).returning();
    return campaign;
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Automation Rules
  async getAutomationRules(containerId: string): Promise<AutomationRule[]> {
    return db.select().from(automationRules).where(eq(automationRules.containerId, containerId));
  }

  async createAutomationRule(data: InsertAutomationRule): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRules).values(data).returning();
    return rule;
  }

  async updateAutomationRule(id: string, data: Partial<InsertAutomationRule>): Promise<AutomationRule> {
    const [rule] = await db.update(automationRules).set(data).where(eq(automationRules.id, id)).returning();
    return rule;
  }

  async deleteAutomationRule(id: string): Promise<void> {
    await db.delete(automationRules).where(eq(automationRules.id, id));
  }

  // Conversations
  async getConversations(containerId: string): Promise<(Conversation & { contact: Contact | null; lastMessage?: Message | null })[]> {
    const convs = await db.select().from(conversations)
      .where(eq(conversations.containerId, containerId))
      .orderBy(desc(conversations.lastMessageAt));
    const result = [];
    for (const conv of convs) {
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, conv.contactId));
      const lastMsgs = await db.select().from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      result.push({ ...conv, contact: contact || null, lastMessage: lastMsgs[0] || null });
    }
    return result;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const [conv] = await db.update(conversations).set(data).where(eq(conversations.id, id)).returning();
    return conv;
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, data.conversationId));
    return message;
  }

  // Deals
  async getDeals(containerId: string): Promise<Deal[]> {
    return db.select().from(deals).where(eq(deals.containerId, containerId));
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal;
  }

  async createDeal(data: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(deals).values(data).returning();
    return deal;
  }

  async updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal> {
    const [deal] = await db.update(deals).set(data).where(eq(deals.id, id)).returning();
    return deal;
  }

  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  }

  // Orders
  async getOrders(containerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.containerId, containerId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();
