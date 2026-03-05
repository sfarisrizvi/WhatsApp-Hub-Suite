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
import { MessageSquare, Send, StickyNote, Search, Plus } from "lucide-react";
import type { Conversation, Contact, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type ConvWithContact = Conversation & { contact: Contact | null };

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

  const existingContactIds = new Set(conversations.map(c => c.contactId));
  const filteredContacts = allContacts.filter(c => {
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
    }
    return true;
  });

  if (!activeContainer) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a workspace to view inbox</p>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="inbox-container">
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between gap-1">
            <h2 className="font-semibold text-sm">Inbox</h2>
            <div className="flex items-center gap-1">
              <Badge variant="secondary">{conversations.length}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowNewConv(true)}
                data-testid="button-new-conversation"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="all" className="text-xs flex-1" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="open" className="text-xs flex-1" data-testid="tab-open">Open</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs flex-1" data-testid="tab-pending">Pending</TabsTrigger>
              <TabsTrigger value="closed" className="text-xs flex-1" data-testid="tab-closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
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
                  className={`w-full text-left p-3 border-b transition-colors ${
                    selectedConv === conv.id ? "bg-accent" : ""
                  }`}
                  data-testid={`conv-item-${conv.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {conv.contact?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium truncate">{conv.contact?.name || "Unknown"}</p>
                        <Badge
                          variant={conv.status === "open" ? "default" : conv.status === "pending" ? "secondary" : "outline"}
                          className="text-[10px] shrink-0"
                        >
                          {conv.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.contact?.phone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedConv ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
              <Button
                variant="outline"
                className="mt-4"
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
            <div className="h-14 border-b flex items-center justify-between gap-1 px-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {activeConv?.contact?.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium" data-testid="text-conv-contact-name">{activeConv?.contact?.name}</p>
                  <p className="text-xs text-muted-foreground">{activeConv?.contact?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={activeConv?.status || "open"}
                  onValueChange={(val) => updateStatusMutation.mutate({ id: selectedConv, status: val })}
                >
                  <SelectTrigger className="h-8 w-28" data-testid="select-conv-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-48" />)}
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl mx-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromContact ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`rounded-xl px-4 py-2.5 max-w-[75%] ${
                          msg.isInternalNote
                            ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700"
                            : msg.isFromContact
                            ? "bg-card border"
                            : "bg-primary text-primary-foreground"
                        }`}
                        data-testid={`message-${msg.id}`}
                      >
                        {msg.isInternalNote && (
                          <div className="flex items-center gap-1 mb-1">
                            <StickyNote className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Internal Note</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.isInternalNote ? "text-muted-foreground" :
                          msg.isFromContact ? "text-muted-foreground" : "text-primary-foreground/70"
                        }`}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-3">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={isNote ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsNote(!isNote)}
                  data-testid="button-toggle-note"
                >
                  <StickyNote className="h-3.5 w-3.5 mr-1" />
                  {isNote ? "Internal Note" : "Message"}
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder={isNote ? "Write an internal note..." : "Type a message..."}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="resize-none min-h-[44px] max-h-32 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (messageText.trim()) sendMutation.mutate({ content: messageText, isInternalNote: isNote });
                    }
                  }}
                  data-testid="input-message"
                />
                <Button
                  size="icon"
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
