import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { useAuth } from "@/hooks/use-auth";
import { useWS } from "@/lib/ws-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  MessageSquare, Send, StickyNote, Search, Plus, Phone, Mail,
  Tag, User, Clock, ChevronRight, Paperclip, Smile, X, UserCircle,
} from "lucide-react";
import type { Conversation, Contact, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type ConvWithContact = Conversation & { contact: Contact | null; lastMessage?: Message | null };

function formatConvDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function groupMessagesByDate(msgs: Message[]): { date: string; messages: Message[] }[] {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of msgs) {
    const d = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "Unknown";
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: d, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function Inbox() {
  const { activeContainer } = useContainer();
  const { user } = useAuth();
  const { lastMessage } = useWS();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactPanel, setShowContactPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<ConvWithContact[]>({
    queryKey: ["/api/containers", cid, "conversations"],
    enabled: !!cid,
  });

  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConv, "messages"],
    enabled: !!selectedConv,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { content: string; isInternalNote: boolean }) => {
      const res = await apiRequest("POST", `/api/conversations/${selectedConv}/messages`, {
        content: data.content,
        isFromContact: false,
        isInternalNote: data.isInternalNote,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConv, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "conversations"] });
      setMessageText("");
      if (data.whatsappError) {
        toast({ title: "Message saved but WhatsApp delivery failed", description: data.whatsappError, variant: "destructive" });
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "conversations"] });
    },
  });

  const createConvMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const existing = conversations.find(c => c.contactId === contactId);
      if (existing) return existing;
      const res = await apiRequest("POST", `/api/containers/${cid}/conversations`, {
        contactId,
        status: "open",
      });
      return res.json();
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "conversations"] });
      setSelectedConv(conv.id);
      setShowNewConv(false);
      setContactSearch("");
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const res = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "conversations"] });
    },
  });

  useEffect(() => {
    if (lastMessage?.type === "new_message") {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "conversations"] });
      if (lastMessage.conversationId === selectedConv) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConv, "messages"] });
      }
    }
  }, [lastMessage, selectedConv, cid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConvs = conversations.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery && !c.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeConv = conversations.find(c => c.id === selectedConv);
  const activeContact = activeConv?.contact;

  const existingContactIds = new Set(conversations.map(c => c.contactId));
  const filteredContacts = allContacts.filter(c => {
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
    }
    return true;
  });

  const messageGroups = groupMessagesByDate(messages);

  if (!activeContainer) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a workspace to view inbox</p>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="inbox-container">
      <div className="w-[320px] border-r flex flex-col shrink-0 bg-card">
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 h-9 text-sm bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
          <div className="flex items-center justify-between">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
              <TabsList className="h-7 bg-transparent p-0 gap-1">
                <TabsTrigger value="all" className="text-xs h-7 px-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="open" className="text-xs h-7 px-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full" data-testid="tab-open">Unread</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs h-7 px-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full" data-testid="tab-pending">Pending</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowNewConv(true)}
              data-testid="button-new-conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-3 space-y-1">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[68px] w-full rounded-lg" />)}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground mb-3">No conversations yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewConv(true)}
                data-testid="button-new-conversation-empty"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Start a conversation
              </Button>
            </div>
          ) : (
            <div>
              {filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-accent/50 ${
                    selectedConv === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                  data-testid={`conv-item-${conv.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {conv.contact?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-sm font-semibold truncate">{conv.contact?.name || "Unknown"}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatConvDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-relaxed">
                        {conv.lastMessage
                          ? (conv.lastMessage.isFromContact ? "" : "You: ") + conv.lastMessage.content
                          : "No messages yet"
                        }
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConv ? (
          <div className="flex items-center justify-center h-full bg-muted/20">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-primary/60" />
              </div>
              <h3 className="text-lg font-medium mb-1">Your conversations</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a conversation or start a new one</p>
              <Button
                onClick={() => setShowNewConv(true)}
                data-testid="button-new-conversation-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[60px] border-b flex items-center justify-between px-4 bg-card shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {activeConv?.contact?.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold" data-testid="text-conv-contact-name">{activeConv?.contact?.name}</p>
                  <p className="text-xs text-muted-foreground">{activeConv?.contact?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Select
                  value={activeConv?.status || "open"}
                  onValueChange={(val) => updateStatusMutation.mutate({ id: selectedConv, status: val })}
                >
                  <SelectTrigger className="h-8 w-[100px] text-xs" data-testid="select-conv-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowContactPanel(!showContactPanel)}
                  data-testid="button-toggle-contact-panel"
                >
                  <UserCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#f0f2f5] dark:bg-muted/30 relative">
              <ScrollArea className="h-full">
                <div className="px-4 py-3 max-w-3xl mx-auto">
                  {loadingMessages ? (
                    <div className="space-y-3 py-4">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-48" />)}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground bg-card/80 inline-block px-4 py-2 rounded-lg shadow-sm">
                        No messages yet. Send a message to start the conversation.
                      </p>
                    </div>
                  ) : (
                    messageGroups.map((group, gi) => (
                      <div key={gi}>
                        <div className="flex justify-center my-3">
                          <span className="text-[11px] text-muted-foreground bg-card/90 dark:bg-card px-3 py-1 rounded-md shadow-sm font-medium">
                            {group.date}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {group.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.isFromContact ? "justify-start" : "justify-end"}`}
                            >
                              {msg.isFromContact && (
                                <Avatar className="h-7 w-7 shrink-0 mr-2 mt-1">
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                    {activeConv?.contact?.name?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`rounded-lg px-3 py-2 max-w-[65%] shadow-sm ${
                                  msg.isInternalNote
                                    ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                                    : msg.isFromContact
                                    ? "bg-card dark:bg-card"
                                    : "bg-[#d9fdd3] dark:bg-primary/20"
                                }`}
                                data-testid={`message-${msg.id}`}
                              >
                                {msg.isInternalNote && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <StickyNote className="h-3 w-3 text-yellow-600" />
                                    <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400">Internal Note</span>
                                  </div>
                                )}
                                <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{msg.content}</p>
                                <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            <div className="border-t bg-card p-3 shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Button
                  variant={isNote ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsNote(!isNote)}
                  data-testid="button-toggle-note"
                >
                  <StickyNote className="h-3 w-3 mr-1" />
                  {isNote ? "Note" : "Message"}
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder={isNote ? "Write an internal note..." : "Type a message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="resize-none min-h-[40px] max-h-28 text-sm pr-10 bg-background"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (messageText.trim()) sendMutation.mutate({ content: messageText, isInternalNote: isNote });
                      }
                    }}
                    data-testid="input-message"
                  />
                </div>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0"
                  disabled={!messageText.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate({ content: messageText, isInternalNote: isNote })}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedConv && showContactPanel && activeContact && (
        <div className="w-[300px] border-l flex flex-col shrink-0 bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Contact Details</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowContactPanel(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-16 w-16 mb-2">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {activeContact.name[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm" data-testid="text-contact-name">{activeContact.name}</p>
              <p className="text-xs text-muted-foreground">{activeContact.phone}</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact Info</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{activeContact.phone}</span>
                  </div>
                  {activeContact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{activeContact.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Added {activeContact.createdAt ? new Date(activeContact.createdAt).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</h4>
                <Select
                  value={activeConv?.status || "open"}
                  onValueChange={(val) => updateStatusMutation.mutate({ id: selectedConv, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(activeContact.tags || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No labels</p>
                  ) : (
                    (activeContact.tags || []).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Messages</span>
                    <span className="font-medium">{messages.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last active</span>
                    <span className="font-medium text-xs">
                      {activeConv?.lastMessageAt ? formatConvDate(activeConv.lastMessageAt) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-xs text-muted-foreground italic">
                  Use internal notes in the chat to keep track of important interactions.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>Select a contact to start a conversation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-8"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                data-testid="input-search-contacts-dialog"
              />
            </div>
            <ScrollArea className="max-h-[300px]">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {allContacts.length === 0 ? "No contacts yet. Add contacts first." : "No contacts match your search."}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.map((contact) => {
                    const hasConv = existingContactIds.has(contact.id);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => createConvMutation.mutate(contact.id)}
                        disabled={createConvMutation.isPending}
                        className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                        data-testid={`contact-pick-${contact.id}`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {contact.name[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                        </div>
                        {hasConv && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Active</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
