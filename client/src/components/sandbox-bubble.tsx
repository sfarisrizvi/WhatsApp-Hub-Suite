import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, RotateCcw, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useWS } from "@/lib/ws-context";
import { useContainer } from "@/lib/container-context";

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  createdAt?: string;
}

export function SandboxBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { lastMessage } = useWS();
  const { activeContainer } = useContainer();
  const cid = activeContainer?.id;

  // Load chat history
  const { data: historyData, isLoading } = useQuery<{ history: ChatMessage[] }>({
    queryKey: ["/api/containers", cid, "sandbox", "history"],
    enabled: isOpen && !!cid,
  });

  const chatHistory = historyData?.history || [];

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatHistory, isOpen]);

  // Sync sandbox messages in real-time if open
  useEffect(() => {
    if (!lastMessage || !isOpen || !cid) return;
    
    // Check if the received message belongs to the sandbox conversation
    if (
      lastMessage.type === "new_message" &&
      lastMessage.message?.conversationId &&
      chatHistory.length > 0
    ) {
      // Invalidate query to pull new message
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "sandbox", "history"] });
    }
  }, [lastMessage, isOpen, cid, queryClient]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!cid) throw new Error("No active container");
      const res = await apiRequest("POST", `/api/containers/${cid}/sandbox/message`, { content });
      return res.json ? await res.json() : res;
    },
    onMutate: async (newMsg) => {
      setInputVal("");
      if (!cid) return;
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/containers", cid, "sandbox", "history"] });
      
      // Snapshot the previous value
      const previousHistory = queryClient.getQueryData<{ history: ChatMessage[] }>([
        "/api/containers", cid, "sandbox", "history"
      ]);

      // Optimistically update
      queryClient.setQueryData<{ history: ChatMessage[] }>([
        "/api/containers", cid, "sandbox", "history"
      ], (old) => ({
        history: [...(old?.history || []), { role: "user", content: newMsg }]
      }));

      return { previousHistory };
    },
    onError: (err, newMsg, context: any) => {
      if (cid) {
        queryClient.setQueryData([
          "/api/containers", cid, "sandbox", "history"
        ], context?.previousHistory);
      }
    },
    onSuccess: (data) => {
      if (cid) {
        queryClient.setQueryData<{ history: ChatMessage[] }>([
          "/api/containers", cid, "sandbox", "history"
        ], {
          history: data.history
        });
      }
      // Invalidate queries to refresh CRM Inbox if open
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
    },
  });

  // Reset conversation history
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("No active container");
      await apiRequest("POST", `/api/containers/${cid}/sandbox/reset`);
    },
    onSuccess: () => {
      if (cid) {
        queryClient.setQueryData<{ history: ChatMessage[] }>([
          "/api/containers", cid, "sandbox", "history"
        ], { history: [] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || sendMutation.isPending) return;
    sendMutation.mutate(inputVal.trim());
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center border border-emerald-400/20"
        title="Open Sandbox Test Chat"
        data-testid="sandbox-chat-bubble-trigger"
      >
        {isOpen ? <X className="w-6 h-6 animate-in fade-in zoom-in duration-200" /> : <MessageSquare className="w-6 h-6 animate-in fade-in zoom-in duration-200" />}
      </button>

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[350px] h-[480px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* HEADER */}
          <div className="bg-emerald-500 text-white px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="flex h-2 w-2 rounded-full bg-green-400 absolute right-0 bottom-0 ring-1 ring-white"></span>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm leading-none">Sandbox Tester</h4>
                <span className="text-[10px] text-emerald-100">Automation Live</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Reset conversation history?")) resetMutation.mutate();
                }}
                disabled={resetMutation.isPending}
                className="h-7 w-7 text-white hover:bg-emerald-600/50 rounded-full"
                title="Reset History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-white hover:bg-emerald-600/50 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* MESSAGE STREAM */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1.5">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span className="text-xs">Loading history...</span>
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <h5 className="font-medium text-xs text-slate-700">Simulate WhatsApp Customer</h5>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Type a message below to test your active automation workflow without sending real WhatsApp API requests!
                </p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-normal shadow-sm ${
                      msg.role === "user"
                        ? "bg-emerald-500 text-white rounded-br-none"
                        : "bg-white text-slate-800 border border-slate-200/60 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/60 rounded-2xl rounded-bl-none px-3 py-2 text-xs shadow-sm flex items-center gap-1 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                  <span>Agent is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM */}
          <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2 items-center">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type message as customer..."
              className="flex-1 rounded-full text-xs h-9 focus-visible:ring-emerald-500"
              disabled={sendMutation.isPending || resetMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 shrink-0 h-9 w-9 text-white"
              disabled={!inputVal.trim() || sendMutation.isPending || resetMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
