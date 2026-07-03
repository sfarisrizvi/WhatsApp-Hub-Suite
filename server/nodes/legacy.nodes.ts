import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";
import { db, dbEvents } from "../db";
import { contacts, conversations, messages, containers, orders } from "../../shared/schema";
import { storage } from "../storage";
import { eq, and, gt, ne } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

export class TriggerNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);
    
    const payload = context.$json.payload || {};
    const isTestRun = context.$env.isTestRun === "true";
    const containerId = context.$env.containerId;

    let outputData: any = { payload, triggerType: config.triggerType || "webhook" };

    if (config.triggerType === "whatsapp_message" || (payload.message && payload.message.from)) {
      // Legacy or WhatsApp explicit trigger: Resolve CRM Contact & Conversation
      if (containerId) {
        let contactPhone = payload.message?.from || "sandbox_test_phone";
        let contactName = payload.message?.from_name || "Guest";
        
        let contact = await db.query.contacts.findFirst({
          where: and(eq(contacts.containerId, containerId), eq(contacts.phone, contactPhone))
        });
        
        if (!contact) {
          [contact] = await db.insert(contacts).values({ containerId, name: contactName, phone: contactPhone }).returning();
        } else if (payload.message?.from_name && contact.name !== payload.message.from_name) {
          await db.update(contacts).set({ name: payload.message.from_name }).where(eq(contacts.id, contact.id));
          contact.name = payload.message.from_name;
        }

        let conversation = await db.query.conversations.findFirst({
          where: and(eq(conversations.containerId, containerId), eq(conversations.contactId, contact.id))
        });
        
        if (!conversation) {
          [conversation] = await db.insert(conversations).values({ containerId, contactId: contact.id, status: "open" }).returning();
        }

        const messageBody = payload.message?.body || "No message provided.";
        if (isTestRun && payload.message?.body) {
          await db.insert(messages).values({ conversationId: conversation.id, content: messageBody, isFromContact: true });
        }

        const dbMessages = await db.query.messages.findMany({
          where: eq(messages.conversationId, conversation.id),
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          limit: 50
        });

        const historyMessages = dbMessages.slice(0, Math.max(0, dbMessages.length - 1));
        outputData = { ...outputData, contact, conversation, messageBody, historyMessages };
      }
    }

    return {
      status: "success",
      data: outputData,
      nextEdges: outgoingEdges.map(e => e.id)
    };
  }
}

export class AiNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);

    const provider = config.provider || "openai";
    let systemPrompt = config.systemMessage || "You are a helpful assistant.";
    const userPrompt = config.prompt || "";
    const apiKey = process.env.OPENAI_API_KEY || "dummy";

    if (!apiKey || apiKey === "dummy") {
      // Mock mode if no key
      return { 
        status: "success", 
        data: { text: `[Mock AI Response] Evaluated Prompt: ${userPrompt.substring(0, 50)}...` }, 
        nextEdges: outgoingEdges.map(e => e.id) 
      };
    }

    if (config.knowledgeBaseId && config.knowledgeBaseId !== "none") {
      try {
        const { querySimilarChunks } = await import("../knowledge-engine");
        const similarDocs = await querySimilarChunks(config.knowledgeBaseId, userPrompt);
        if (similarDocs && similarDocs.length > 0) {
          const contextText = similarDocs.map((doc: any) => doc.content).join("\n\n---\n\n");
          systemPrompt += `\n\nUse the following knowledge base context to answer the user's query. If the context does not contain the answer, say you don't know based on the provided context.\n\nContext:\n${contextText}`;
        }
      } catch (err: any) {
        console.error("Failed to query knowledge base:", err.message);
      }
    }

    const modelName = provider === "anthropic" ? "claude-3-opus-20240229" : "gpt-4o";
    const llm = new ChatOpenAI({ modelName, temperature: 0.7, apiKey });

    const messagesList: any[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ];

    try {
      const response = await llm.invoke(messagesList);
      const rawContent = response.content as string;
      
      // Try to parse as JSON just in case they requested JSON in prompt
      let parsedOutput = rawContent;
      try {
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/{[\s\S]*}/);
        if (jsonMatch) parsedOutput = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {}
      
      return { status: "success", data: { text: rawContent, parsed: parsedOutput }, nextEdges: outgoingEdges.map(e => e.id) };
    } catch (err: any) {
      return { status: "failed", error: err.message };
    }
  }
}

export class MessageNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);
    
    const triggerData = context.$node["node_trigger"]?.json || context.$node["Trigger"]?.json || {};
    const isTestRun = context.$env.isTestRun === "true";
    const containerId = context.$env.containerId;

    const platform = config.platform || "whatsapp";
    const recipient = config.recipient || triggerData.contact?.phone || "";
    const messageBody = config.messageBody || "";

    if (!messageBody) {
      return { status: "failed", error: "Message body is empty" };
    }

    const conversationId = triggerData.conversation?.id || context.$env.conversationId;
    if (conversationId && isTestRun) {
      // Mock saving to DB for test runs if there's a conversation context
      await db.insert(messages).values({
        conversationId,
        content: messageBody,
        isFromContact: false,
      });
    }

    if (!isTestRun && containerId && recipient) {
      if (platform === "whatsapp") {
        const container = await db.query.containers.findFirst({ where: eq(containers.id, containerId) });
        if (container?.isConfigured && container.phoneNumberId && container.apiKey) {
          try {
            const recipientPhone = recipient.replace(/[^0-9+]/g, "").replace(/^\+/, "");
            const endpoint = container.apiEndpoint || "https://graph.facebook.com/v18.0/";
            const url = `${endpoint.replace(/\/$/, "")}/${container.phoneNumberId}/messages`;
            
            let requestBody: any = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: recipientPhone
            };

            const messageType = config.messageType || "text";

            if (messageType === "text") {
              requestBody.type = "text";
              requestBody.text = { body: messageBody };
            } 
            else if (messageType === "buttons") {
              const buttonsList = config.buttons || [];
              requestBody.type = "interactive";
              requestBody.interactive = {
                type: "button",
                body: { text: messageBody },
                action: {
                  buttons: buttonsList.map((title: string, idx: number) => ({
                    type: "reply",
                    reply: { id: `btn_${idx + 1}`, title: title.substring(0, 20) } // WhatsApp CTA titles cap at 20 chars
                  }))
                }
              };
            } 
            else if (messageType === "location") {
              requestBody.type = "interactive";
              requestBody.interactive = {
                type: "location_request_message",
                body: { text: messageBody },
                action: {
                  name: "send_location"
                }
              };
            } 
            else if (messageType === "link") {
              requestBody.type = "interactive";
              requestBody.interactive = {
                type: "cta_url",
                body: { text: messageBody },
                action: {
                  name: "cta_url",
                  parameters: {
                    display_text: config.linkText || "Open Link",
                    url: config.linkUrl || ""
                  }
                }
              };
            }
            else if (messageType === "flow") {
              requestBody.type = "interactive";
              requestBody.interactive = {
                type: "flow",
                body: { text: messageBody },
                action: {
                  name: "flow",
                  parameters: {
                    flow_message_version: "3",
                    flow_token: config.flowToken || `flow_tok_${Date.now()}`,
                    flow_id: config.flowId || "",
                    flow_cta: config.flowCta || "Open Form",
                    flow_action: "navigate",
                    flow_action_payload: {
                      screen: config.flowScreen || "START"
                    }
                  }
                }
              };
            }

            await fetch(url, {
              method: "POST",
              headers: { "Authorization": `Bearer ${container.apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            });
          } catch (err) { console.error("WhatsApp Send Error", err); }
        }
      }
    }

    return { status: "success", data: { platform, recipient, sentText: messageBody }, nextEdges: outgoingEdges.map(e => e.id) };
  }
}

export class ActionNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);

    const actionType = config.actionType || "unknown";
    const payload = config.payload || {};
    
    const isTestRun = context.$env.isTestRun === "true";
    const containerId = context.$env.containerId;
    const triggerData = context.$node["node_trigger"]?.json || context.$node["Trigger"]?.json || {};
    const contactId = triggerData.contact?.id;

    if (!isTestRun && containerId) {
      try {
        if (actionType === "Create Order") {
          const orderNumber = payload.orderNumber || `ORD-${Math.floor(Math.random() * 10000)}`;
          const items = payload.items || [];
          const totalAmount = typeof payload.totalAmount === "number" ? payload.totalAmount : 0;
          
          await db.insert(orders).values({
            containerId,
            contactId,
            orderNumber,
            items,
            totalAmount,
            status: "pending"
          });
        } else if (actionType === "Update Contact" && contactId) {
           await db.update(contacts).set({
             ...(payload.name ? { name: payload.name } : {}),
             ...(payload.email ? { email: payload.email } : {}),
             ...(payload.customFields ? { customFields: payload.customFields } : {})
           }).where(eq(contacts.id, contactId));
        }
      } catch (err) {
        console.error("Action Node Error:", err);
      }
    }

    return { status: "success", data: { action_executed: true, actionType, payload }, nextEdges: outgoingEdges.map(e => e.id) };
  }
}
