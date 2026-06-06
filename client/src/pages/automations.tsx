import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  Panel
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import { 
  Zap, 
  BrainCircuit, 
  MessageCircle, 
  Database,
  Play,
  Settings2,
  X,
  MessageSquare,
  ArrowRight,
  Save,
  Trash,
  RotateCcw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useContainer } from "@/lib/container-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// 1. CUSTOM NODES
// ============================================================================

const GlassNode = ({ icon: Icon, title, subtitle, colorClass, data, selected }: any) => (
  <div className={`relative rounded-xl border ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-black/5'} bg-white/60 backdrop-blur-xl shadow-lg w-64 p-4 transition-all duration-200 overflow-hidden group`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 shadow-inner`}>
        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{subtitle}</p>
      </div>
    </div>
    {data?.label && (
      <div className="mt-3 text-xs text-muted-foreground bg-black/5 px-2 py-1.5 rounded border border-black/5 truncate">
        {data.label}
      </div>
    )}
  </div>
);

export const TriggerNode = ({ data, selected }: any) => (
  <>
    <GlassNode icon={Zap} title="Trigger Event" subtitle="The Listener" colorClass="bg-amber-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-amber-500 border-2 border-white" />
  </>
);

export const AiNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
    <GlassNode icon={BrainCircuit} title="Cognitive Agent" subtitle="The Processor" colorClass="bg-indigo-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
  </>
);

export const MessageNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
    <GlassNode icon={MessageCircle} title="Send Message" subtitle="The Messenger" colorClass="bg-emerald-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
  </>
);

export const ActionNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-rose-500 border-2 border-white" />
    <GlassNode icon={Database} title="Database Action" subtitle="The Executor" colorClass="bg-rose-500" data={data} selected={selected} />
  </>
);

const nodeTypes = {
  triggerNode: TriggerNode,
  aiNode: AiNode,
  messageNode: MessageNode,
  actionNode: ActionNode,
};

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================

export default function Automations() {
  const { activeContainer } = useContainer();
  const containerId = activeContainer?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("V2 Automation Flow");
  
  // Local Testing State
  const [chatHistory, setChatHistory] = useState<{role: "user"|"bot", content: string}[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', containerId],
    queryFn: async () => {
      if (!containerId) return [];
      const res = await fetch(`/api/containers/${containerId}/workflows`);
      if (!res.ok) throw new Error("Failed to load workflows");
      return res.json();
    },
    enabled: !!containerId
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: workflowName, nodes, edges };
      const url = workflowId 
        ? `/api/workflows/${workflowId}` 
        : `/api/containers/${containerId}/workflows`;
      const method = workflowId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save workflow");
      return res.json();
    },
    onSuccess: (data) => {
      setWorkflowId(data.id);
      toast({ title: "Workflow Saved", description: "Your automation has been saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['workflows', containerId] });
    }
  });

  const testMutation = useMutation({
    mutationFn: async ({ text, history }: { text: string; history: { role: "user" | "bot"; content: string }[] }) => {
      if (!workflowId) throw new Error("Please save the workflow first.");
      const res = await fetch(`/api/workflows/${workflowId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: { body: text, from_name: "Local Tester" },
          session: { thread_id: "local_test_123" },
          history: history
        })
      });
      if (!res.ok) throw new Error("Test execution failed");
      return res.json();
    },
    onMutate: (variables) => {
      setIsTesting(true);
      setChatHistory(prev => [...prev, { role: "user", content: variables.text }]);
      setTestInput("");
    },
    onSuccess: (data) => {
      if (data.history) {
        setChatHistory(data.history);
      } else {
        setChatHistory(prev => [...prev, { role: "bot", content: data.response || "Workflow completed without returning text." }]);
      }
      setIsTesting(false);
    },
    onError: (err: any) => {
      setChatHistory(prev => [...prev, { role: "bot", content: `Error: ${err.message}` }]);
      setIsTesting(false);
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!workflowId) return;
      const res = await fetch(`/api/workflows/${workflowId}/reset-test`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to reset sandbox chat");
      return res.json();
    },
    onSuccess: () => {
      setChatHistory([]);
      toast({ title: "Sandbox Chat Reset", description: "Chat history has been cleared." });
    },
    onError: (err: any) => {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    }
  });

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)), [setEdges]);

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNode(nodes.length > 0 ? nodes[0] : null);
  }, []);

  useEffect(() => {
    if (workflowId) {
      fetch(`/api/workflows/${workflowId}/test-history`)
        .then((res) => res.json())
        .then((data) => {
          if (data.history) setChatHistory(data.history);
        })
        .catch((err) => console.error("Failed to load test history", err));
    }
  }, [workflowId]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, this would upload to S3/Supabase Storage.
    // For now, we'll store the file name to show it's saved.
    updateNodeData("fileName", file.name);
    
    if (file.type === "text/csv" || file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const currentPrompt = (selectedNode?.data as any)?.prompt || "";
        updateNodeData("prompt", currentPrompt + "\n\n--- Document Context ---\n" + text);
        toast({ title: "Document text added to knowledge base!" });
      };
      reader.readAsText(file);
    } else {
      toast({ title: "File uploaded successfully!" });
    }
  };

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        return { ...n, data: { ...n.data, [key]: value } };
      }
      return n;
    }));
    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: e.clientX - reactFlowBounds.left,
        y: e.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { label: `New ${type.replace('Node', '')}` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Load existing workflow or initialize default template
  React.useEffect(() => {
    const defaultNodes = [
      { id: "node_trigger", type: "triggerNode", position: { x: 50, y: 200 }, data: { label: "WhatsApp Listener", isLive: false } },
      { id: "node_ai", type: "aiNode", position: { x: 400, y: 200 }, data: { label: "CRM Assistant", llmConfig: { model: "gpt-4o", temperature: 0.7, apiKey: "" }, prompt: "" } },
      { id: "node_message", type: "messageNode", position: { x: 800, y: 100 }, data: { label: "Send Reply" } },
      { id: "node_action", type: "actionNode", position: { x: 800, y: 300 }, data: { label: "Log to CRM", targetTable: "crm_orders" } }
    ];
    const defaultEdges = [
      { id: "edge_1", source: "node_trigger", target: "node_ai", animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: "edge_2", source: "node_ai", target: "node_message", animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
      { id: "edge_3", source: "node_ai", target: "node_action", animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }
    ];

    if (workflows) {
      if (workflows.length > 0) {
        const wf = workflows[0];
        if (!workflowId) {
          setWorkflowId(wf.id);
          setWorkflowName(wf.name);
        }
        
        // Populate if empty
        if (!wf.nodes || wf.nodes.length === 0) {
          console.log("Existing workflow is empty, populating defaults.");
          setNodes(defaultNodes as Node[]);
          setEdges(defaultEdges as Edge[]);
        } else if (!workflowId) {
          console.log("Loading existing workflow nodes.");
          setNodes(wf.nodes);
          setEdges(wf.edges);
        }
      } else {
        // No workflows exist
        console.log("No workflows found, populating defaults.");
        if (nodes.length === 0) {
          setNodes(defaultNodes as Node[]);
          setEdges(defaultEdges as Edge[]);
        }
      }
    }
  }, [workflows]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#fafafa]">
      
      {/* LEFT NODE PALETTE */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col z-10 shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            Components
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Drag nodes onto the canvas.</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow flex items-center gap-3" draggable onDragStart={(e) => handleDragStart(e, 'triggerNode')}>
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">Trigger</span>
          </div>
          <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow flex items-center gap-3" draggable onDragStart={(e) => handleDragStart(e, 'aiNode')}>
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-medium">Cognitive AI</span>
          </div>
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow flex items-center gap-3" draggable onDragStart={(e) => handleDragStart(e, 'messageNode')}>
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">Send Message</span>
          </div>
          <div className="border border-rose-200 bg-rose-50 rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow flex items-center gap-3" draggable onDragStart={(e) => handleDragStart(e, 'actionNode')}>
            <Database className="w-5 h-5 text-rose-500" />
            <span className="text-sm font-medium">DB Action</span>
          </div>
        </div>
      </div>

      {/* MIDDLE CANVAS */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Input 
            value={workflowName} 
            onChange={(e) => setWorkflowName(e.target.value)} 
            className="w-64 bg-white/80 backdrop-blur shadow-sm border-0 ring-1 ring-black/5 font-semibold"
          />
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="shadow-sm">
            <Save className="w-4 h-4 mr-2" /> {saveMutation.isPending ? "Saving..." : "Save Workflow"}
          </Button>
          <Button variant="outline" onClick={() => {
            setNodes([
              { id: "node_trigger", type: "triggerNode", position: { x: 50, y: 200 }, data: { label: "WhatsApp Listener", isLive: false } },
              { id: "node_ai", type: "aiNode", position: { x: 400, y: 200 }, data: { label: "CRM Assistant", llmConfig: { model: "gpt-4o", temperature: 0.7, apiKey: "" }, prompt: "" } },
              { id: "node_message", type: "messageNode", position: { x: 800, y: 100 }, data: { label: "Send Reply" } },
              { id: "node_action", type: "actionNode", position: { x: 800, y: 300 }, data: { label: "Log to CRM", targetTable: "crm_orders" } }
            ] as Node[]);
            setEdges([
              { id: "edge_1", source: "node_trigger", target: "node_ai", animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
              { id: "edge_2", source: "node_ai", target: "node_message", animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
              { id: "edge_3", source: "node_ai", target: "node_action", animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }
            ] as Edge[]);
          }} className="shadow-sm bg-white">
            Reset to Default
          </Button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          className="flex-1"
        >
          <Background color="#ccc" gap={16} />
          <Controls className="bg-white shadow-md border-0 rounded-lg overflow-hidden" />
          <MiniMap className="rounded-lg shadow-md border-0" />
        </ReactFlow>

        {/* LOCAL CHAT WIDGET */}
        <div className="absolute bottom-4 left-4 z-10 w-80 bg-white rounded-xl shadow-2xl border border-black/5 overflow-hidden flex flex-col transition-all duration-300">
          <div className="bg-emerald-500 text-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold text-sm">Local Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-white hover:bg-white/20" 
                onClick={() => resetMutation.mutate()} 
                disabled={resetMutation.isPending || !workflowId}
                title="Reset Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">TEST_MODE</Badge>
            </div>
          </div>
          <div className="h-64 overflow-y-auto p-3 flex flex-col gap-3 bg-emerald-50/30">
            {chatHistory.length === 0 && (
              <div className="text-xs text-center text-muted-foreground mt-10">Send a message to trigger your flow locally.</div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${msg.role === 'user' ? 'bg-emerald-100 text-emerald-900 rounded-tr-sm' : 'bg-white border rounded-tl-sm text-slate-800'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTesting && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
          </div>
          <div className="p-2 bg-white border-t">
            <form onSubmit={(e) => { e.preventDefault(); if(testInput.trim() && workflowId) testMutation.mutate({ text: testInput, history: chatHistory }); }} className="flex gap-2 relative">
              <Input 
                placeholder={!workflowId ? "Save workflow to enable..." : "Type a message..."} 
                value={testInput} 
                onChange={(e) => setTestInput(e.target.value)}
                disabled={isTesting || !workflowId}
                className="rounded-full pr-10 border-emerald-100 focus-visible:ring-emerald-500"
              />
              <Button type="submit" size="icon" className="absolute right-1 top-1 h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600" disabled={isTesting || !testInput.trim() || !workflowId}>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - CONFIGURATION PANEL */}
      <div className={`w-80 bg-white border-l shadow-sm shrink-0 flex flex-col transition-transform duration-300 ${selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
        {selectedNode && (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Node Settings
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Node Name</Label>
                  <Input 
                    value={(selectedNode.data as any)?.label || ""} 
                    onChange={(e) => updateNodeData("label", e.target.value)} 
                    placeholder="Enter a label..."
                  />
                </div>

                <Separator />

                {selectedNode.type === "triggerNode" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Live Webhook Mode</Label>
                      <Switch 
                        checked={(selectedNode.data as any)?.isLive || false} 
                        onCheckedChange={(v) => updateNodeData("isLive", v)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">If disabled, this trigger will only accept messages from the Local Sandbox.</p>
                  </div>
                )}

                {selectedNode.type === "aiNode" && (
                  <Tabs defaultValue="knowledge" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                      <TabsTrigger value="config">AI Config</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="knowledge" className="space-y-5">
                      <div className="space-y-2">
                        <Label className="font-medium">Business Context & Instructions</Label>
                        <p className="text-[10px] text-muted-foreground leading-tight">Describe the nature of your business and specific instructions for the agent.</p>
                        <Textarea 
                          className="min-h-[120px] text-xs font-mono" 
                          placeholder="e.g., We are a real estate agency in Dubai..."
                          value={(selectedNode.data as any)?.prompt || ""}
                          onChange={(e) => updateNodeData("prompt", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Upload Documents</Label>
                        <p className="text-[10px] text-muted-foreground leading-tight">Upload PDFs or CSVs for the AI to reference.</p>
                        <Input type="file" className="text-xs" accept=".pdf,.csv,.txt" onChange={handleFileUpload} />
                        {(selectedNode.data as any)?.fileName && (
                          <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center">
                            <span className="truncate">Attached: {(selectedNode.data as any).fileName}</span>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="config" className="space-y-5">
                      <div className="space-y-2">
                        <Label className="font-medium text-amber-600">LLM API Key</Label>
                        <Input 
                          type="password"
                          placeholder="sk-..."
                          value={(selectedNode.data as any)?.llmConfig?.apiKey || ""}
                          onChange={(e) => updateNodeData("llmConfig", { ...((selectedNode.data as any)?.llmConfig || {}), apiKey: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">LLM Model</Label>
                        <Select value={(selectedNode.data as any)?.llmConfig?.model || "gpt-4o"} onValueChange={(v) => updateNodeData("llmConfig", { ...((selectedNode.data as any)?.llmConfig || {}), model: v })}>
                          <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</SelectItem>
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="font-medium">Temperature</Label>
                          <span className="text-xs text-muted-foreground">{(selectedNode.data as any)?.llmConfig?.temperature || 0.7}</span>
                        </div>
                        <Slider 
                          min={0} max={1} step={0.1} 
                          value={[(selectedNode.data as any)?.llmConfig?.temperature || 0.7]} 
                          onValueChange={(v) => updateNodeData("llmConfig", { ...((selectedNode.data as any)?.llmConfig || {}), temperature: v[0] })} 
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {selectedNode.type === "messageNode" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">This node automatically routes the generated `reply_text` from the AI back to the originating channel (WhatsApp or Sandbox).</p>
                  </div>
                )}

                {selectedNode.type === "actionNode" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Target DB Table</Label>
                      <Select value={(selectedNode.data as any)?.targetTable || "crm_orders"} onValueChange={(v) => updateNodeData("targetTable", v)}>
                        <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crm_orders">crm_orders</SelectItem>
                          <SelectItem value="crm_leads">crm_leads</SelectItem>
                          <SelectItem value="crm_support_tickets">crm_support_tickets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">The Engine will automatically insert the `extracted_entities` JSON from the AI Node into this table.</p>
                  </div>
                )}

                <div className="pt-4 border-t mt-auto space-y-2">
                  <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" /> {saveMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => {
                    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                    setSelectedNode(null);
                  }}>
                    <Trash className="w-4 h-4 mr-2" /> Delete Node
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </div>

    </div>
  );
}
