export * from "./models/auth";

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, uuid, customType } from "drizzle-orm/pg-core";

const vector1536 = customType<{ data: number[], driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const roleEnum = pgEnum("role", ["admin", "agent", "viewer"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "pending", "closed"]);
export const dealStageEnum = pgEnum("deal_stage", ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "sending", "sent", "failed"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "shipped", "delivered", "cancelled"]);
export const templateStatusEnum = pgEnum("template_status", ["draft", "pending", "approved", "rejected"]);

export const containers = pgTable("containers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  businessName: text("business_name"),
  phoneNumberId: text("phone_number_id"),
  wabaId: text("waba_id"),
  apiKey: text("api_key"),
  apiEndpoint: text("api_endpoint"),
  appSecret: text("app_secret"),
  webhookVerifyToken: text("webhook_verify_token"),
  isConfigured: boolean("is_configured").default(false),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const containerMembers = pgTable("container_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: roleEnum("role").notNull().default("agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("marketing"),
  templateType: text("template_type").notNull().default("standard"),
  language: text("language").notNull().default("en"),
  body: text("body").notNull(),
  headerType: text("header_type"),
  headerContent: text("header_content"),
  footerText: text("footer_text"),
  buttons: jsonb("buttons").default(sql`'[]'::jsonb`),
  offerText: text("offer_text"),
  offerExpiry: timestamp("offer_expiry"),
  carouselCards: jsonb("carousel_cards").default(sql`'[]'::jsonb`),
  variables: text("variables").array().default(sql`'{}'::text[]`),
  status: templateStatusEnum("status").default("draft"),
  metaTemplateId: text("meta_template_id"),
  isPremade: boolean("is_premade").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  templateId: varchar("template_id").references(() => templates.id),
  targetTags: text("target_tags").array().default(sql`'{}'::text[]`),
  scheduledAt: timestamp("scheduled_at"),
  status: campaignStatusEnum("status").default("draft"),
  totalRecipients: integer("total_recipients").default(0),
  delivered: integer("delivered").default(0),
  read: integer("read").default(0),
  replied: integer("replied").default(0),
  failed: integer("failed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  trigger: text("trigger"),
  responseText: text("response_text").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: conversationStatusEnum("status").default("open"),
  unreadCount: integer("unread_count").default(0),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id"),
  content: text("content").notNull(),
  isFromContact: boolean("is_from_contact").default(false),
  isInternalNote: boolean("is_internal_note").default(false),
  mediaType: text("media_type"),
  mediaUrl: text("media_url"),
  whatsappMessageId: text("whatsapp_message_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => contacts.id),
  title: text("title").notNull(),
  value: integer("value").default(0),
  stage: dealStageEnum("stage").default("lead"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => contacts.id),
  orderNumber: text("order_number").notNull(),
  items: jsonb("items").default([]),
  totalAmount: integer("total_amount").default(0),
  status: orderStatusEnum("status").default("pending"),
  shippingAddress: text("shipping_address"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  containerId: varchar("container_id").references(() => containers.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workflowPauses = pgTable("workflow_pauses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull(),
  workflowId: varchar("workflow_id").notNull().references(() => workflows.id),
  nodeId: text("node_id").notNull(),
  resumeAt: timestamp("resume_at").notNull(),
  context: jsonb("context").notNull(), // Saves ExpressionContext
  nextEdges: jsonb("next_edges").notNull(), // Saves string[]
  status: text("status").default("pending"), // pending, resumed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedContainers: many(containers),
  memberships: many(containerMembers),
  notifications: many(notifications),
}));

export const containersRelations = relations(containers, ({ one, many }) => ({
  owner: one(users, { fields: [containers.ownerId], references: [users.id] }),
  members: many(containerMembers),
  contacts: many(contacts),
  templates: many(templates),
  campaigns: many(campaigns),
  automationRules: many(automationRules),
  conversations: many(conversations),
  deals: many(deals),
  orders: many(orders),
}));

export const containerMembersRelations = relations(containerMembers, ({ one }) => ({
  container: one(containers, { fields: [containerMembers.containerId], references: [containers.id] }),
  user: one(users, { fields: [containerMembers.userId], references: [users.id] }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  container: one(containers, { fields: [contacts.containerId], references: [containers.id] }),
  conversations: many(conversations),
  deals: many(deals),
  orders: many(orders),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  container: one(containers, { fields: [conversations.containerId], references: [containers.id] }),
  contact: one(contacts, { fields: [conversations.contactId], references: [contacts.id] }),
  assignee: one(users, { fields: [conversations.assignedTo], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  container: one(containers, { fields: [deals.containerId], references: [containers.id] }),
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  assignee: one(users, { fields: [deals.assignedTo], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  container: one(containers, { fields: [orders.containerId], references: [containers.id] }),
  contact: one(contacts, { fields: [orders.contactId], references: [contacts.id] }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  container: one(containers, { fields: [templates.containerId], references: [containers.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  container: one(containers, { fields: [campaigns.containerId], references: [containers.id] }),
  template: one(templates, { fields: [campaigns.templateId], references: [templates.id] }),
}));

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
  container: one(containers, { fields: [automationRules.containerId], references: [containers.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  container: one(containers, { fields: [notifications.containerId], references: [containers.id] }),
}));

export const workflowPausesRelations = relations(workflowPauses, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowPauses.workflowId], references: [workflows.id] }),
}));

// Insert schemas
export const insertContainerSchema = createInsertSchema(containers).omit({ id: true, createdAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, createdAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, lastMessageAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertContainerMemberSchema = createInsertSchema(containerMembers).omit({ id: true, createdAt: true });

// Types
export type Container = typeof containers.$inferSelect;
export type InsertContainer = z.infer<typeof insertContainerSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ContainerMember = typeof containerMembers.$inferSelect;
export type InsertContainerMember = z.infer<typeof insertContainerMemberSchema>;

export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g. "postgres", "http_api"
  encryptedData: text("encrypted_data").notNull(),
  iv: text("iv").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const credentialsRelations = relations(credentials, ({ one }) => ({
  container: one(containers, {
    fields: [credentials.containerId],
    references: [containers.id],
  }),
}));

export const insertCredentialSchema = createInsertSchema(credentials).omit({ id: true, createdAt: true });
export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  containerId: uuid("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  triggerType: varchar("trigger_type", { length: 100 }), // e.g. "whatsapp_message"
  nodes: jsonb("nodes").default([]).notNull(),
  edges: jsonb("edges").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  containerId: uuid("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull(), // running, completed, failed
  triggerPayload: jsonb("trigger_payload"),
  metrics: jsonb("metrics"),
  error: text("error_message"),
  startTime: timestamp("started_at").defaultNow().notNull(),
  endTime: timestamp("completed_at"),
});

export const knowledgeBases = pgTable("knowledge_bases", {
  id: uuid("id").primaryKey().defaultRandom(),
  containerId: varchar("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseId: uuid("base_id").notNull().references(() => knowledgeBases.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("processing"), // processing, ready, failed
  contentUrl: text("content_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  embedding: vector1536("embedding"),
});

export const workflowNodeLogs = pgTable("workflow_node_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => workflowRuns.id, { onDelete: "cascade" }),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // success, failed
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  error: text("error_message"),
  startTime: timestamp("started_at").defaultNow().notNull(),
  endTime: timestamp("completed_at"),
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  container: one(containers, {
    fields: [workflows.containerId],
    references: [containers.id],
  }),
  runs: many(workflowRuns),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
  logs: many(workflowNodeLogs),
}));

export const workflowNodeLogsRelations = relations(workflowNodeLogs, ({ one }) => ({
  run: one(workflowRuns, {
    fields: [workflowNodeLogs.runId],
    references: [workflowRuns.id],
  }),
}));

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type InsertWorkflowRun = typeof workflowRuns.$inferInsert;
export type WorkflowNodeLog = typeof workflowNodeLogs.$inferSelect;
export type InsertWorkflowNodeLog = typeof workflowNodeLogs.$inferInsert;

export const knowledgeBasesRelations = relations(knowledgeBases, ({ one, many }) => ({
  container: one(containers, {
    fields: [knowledgeBases.containerId],
    references: [containers.id],
  }),
  documents: many(knowledgeDocuments),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  base: one(knowledgeBases, {
    fields: [knowledgeDocuments.baseId],
    references: [knowledgeBases.id],
  }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(knowledgeDocuments, {
    fields: [knowledgeChunks.documentId],
    references: [knowledgeDocuments.id],
  }),
}));

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBases.$inferInsert;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type InsertKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
