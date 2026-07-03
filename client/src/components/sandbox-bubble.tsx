import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useContainer } from "@/lib/container-context";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "bot" | "info";
  content: string;
}

export function SandboxBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeContainer } = useContainer();
  const cid = activeContainer?.id;
  const { toast } = useToast();

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!cid) throw new Error("No active container selected. Please select a container first.");
      const res = await apiRequest("POST", `/api/containers/${cid}/sandbox/message`, { content });
      const data = await res.json();
      return data as { reply?: string | null; info?: string; error?: string };
    },
    onMutate: (content) => {
      setInputVal("");
      // Immediately show the user's message
      setChatHistory(prev => [...prev, { role: "user", content }]);
    },
    onSuccess: (data) => {
      if (data.error) {
        setChatHistory(prev => [...prev, { role: "info", content: `⚠️ ${data.error}` }]);
        return;
      }
      if (data.info) {
        // No active workflow
        setChatHistory(prev => [...prev, { role: "info", content: `ℹ️ ${data.info}` }]);
        return;
      }
      if (data.reply) {
        setChatHistory(prev => [...prev, { role: "bot", content: data.reply! }]);
      } else {
        setChatHistory(prev => [...prev, { role: "info", content: "ℹ️ Workflow ran but produced no text reply. Check node outputs." }]);
      }
    },
    onError: (err: any) => {
      // Remove the optimistically added user message on hard failure
      setChatHistory(prev => prev.slice(0, -1));
      toast({
        variant: "destructive",
        title: "Sandbox Error",
        description: err.message,
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || sendMutation.isPending) return;
    sendMutation.mutate(inputVal.trim());
  };

  const handleClear = () => {
    if (confirm("Clear this test conversation?")) {
      setChatHistory([]);
    }
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
        {isOpen
          ? <X className="w-6 h-6" />
          : <MessageSquare className="w-6 h-6" />
        }
      </button>

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">

          {/* HEADER */}
          <div className="bg-emerald-500 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-300 ring-1 ring-white"></span>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-none">Sandbox Tester</p>
                <p className="text-[10px] text-emerald-100 mt-0.5">Test workflow without hitting WhatsApp API</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-7 w-7 text-white/80 hover:text-white hover:bg-emerald-600 rounded-full"
                title="Clear Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-white/80 hover:text-white hover:bg-emerald-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* MESSAGE STREAM */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="font-semibold text-xs text-slate-700">Simulate a WhatsApp Customer</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Type a message to test how your active automation workflow responds. No real messages are sent.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => {
                if (msg.role === "info") {
                  return (
                    <div key={idx} className="flex justify-center">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-200/60 rounded-full px-3 py-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-emerald-500 text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 text-xs shadow-sm flex items-center gap-1.5 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                  Agent is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2 items-center">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Message as customer..."
              className="flex-1 rounded-full text-xs h-9 border-slate-200 focus-visible:ring-emerald-500"
              disabled={sendMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 h-9 w-9 text-white shrink-0"
              disabled={!inputVal.trim() || sendMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
