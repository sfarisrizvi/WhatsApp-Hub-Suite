import React, { useState, useCallback, useEffect } from "react";
import { 
  ReactFlow, Background, Controls, MiniMap, 
  useNodesState, useEdgesState, addEdge, Connection, Edge, Node, Handle, Position
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import { 
  Zap, BrainCircuit, MessageCircle, Database, Settings2, X, MessageSquare, ArrowRight, Save, Trash, RotateCcw, 
  Globe, SplitSquareHorizontal, Waypoints, Play,
  Code, Repeat, Hourglass, Wrench, AlertTriangle, Shield, FileArchive, FileCode2, Upload
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

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
    {data?.continueOnFail && (
      <div className="absolute top-2 right-2 flex items-center">
        <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600 bg-amber-50">Continue on Fail</Badge>
      </div>
    )}
  </div>
);

// Triggers
export const TriggerNode = ({ data, selected }: any) => (
  <><GlassNode icon={Zap} title="Trigger Event" subtitle="Entry Point" colorClass="bg-amber-500" data={data} selected={selected} /><Handle type="source" position={Position.Right} className="w-3 h-3 bg-amber-500" /></>
);

// Logic
export const IfNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
    <GlassNode icon={SplitSquareHorizontal} title="If Condition" subtitle="Logic" colorClass="bg-blue-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="w-3 h-3 bg-emerald-500" />
    <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="w-3 h-3 bg-rose-500" />
  </>
);

export const SwitchNode = ({ data, selected }: any) => {
  const rules = data?.rules || [];
  return (
    <>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <GlassNode icon={Waypoints} title="Switch" subtitle="Logic" colorClass="bg-blue-500" data={data} selected={selected} />
      {rules.map((rule: any, i: number) => (
        <Handle key={i} type="source" position={Position.Right} id={rule.handleName || `case_${i}`} style={{ top: `${(i+1)*20}%` }} className="w-3 h-3 bg-blue-500" />
      ))}
      <Handle type="source" position={Position.Right} id="default" style={{ top: '90%' }} className="w-3 h-3 bg-slate-500" />
    </>
  );
};

export const ErrorNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-600" />
    <GlassNode icon={AlertTriangle} title="Error Catcher" subtitle="Logic" colorClass="bg-red-600" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} id="success" style={{ top: '30%' }} className="w-3 h-3 bg-emerald-500" />
    <Handle type="source" position={Position.Right} id="error" style={{ top: '70%' }} className="w-3 h-3 bg-red-600" />
  </>
);

// Data & Transformations
export const CodeNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-800" />
    <GlassNode icon={Code} title="Code Sandbox" subtitle="Data & Logic" colorClass="bg-slate-800" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-800" />
  </>
);

export const LoopNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-pink-500" />
    <GlassNode icon={Repeat} title="Loop Array" subtitle="Data & Logic" colorClass="bg-pink-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} id="item" style={{ top: '30%' }} className="w-3 h-3 bg-pink-500" />
    <Handle type="source" position={Position.Right} id="done" style={{ top: '70%' }} className="w-3 h-3 bg-slate-400" />
  </>
);

export const WaitNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-cyan-500" />
    <GlassNode icon={Hourglass} title="Wait" subtitle="Data & Logic" colorClass="bg-cyan-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-cyan-500" />
  </>
);

export const SetNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
    <GlassNode icon={Wrench} title="Set Fields" subtitle="Data & Logic" colorClass="bg-orange-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
  </>
);


// Integrations
export const HttpNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
    <GlassNode icon={Globe} title="HTTP Request" subtitle="Integration" colorClass="bg-purple-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
  </>
);

export const DatabaseNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-rose-500" />
    <GlassNode icon={Database} title="Database" subtitle="Integration" colorClass="bg-rose-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-rose-500" />
  </>
);

// Legacy/Specific
export const AiNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />
    <GlassNode icon={BrainCircuit} title="Cognitive Agent" subtitle="AI" colorClass="bg-indigo-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500" />
  </>
);

export const MessageNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500" />
    <GlassNode icon={MessageCircle} title="Send Message" subtitle="Communication" colorClass="bg-emerald-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500" />
  </>
);

export const ActionNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-rose-500" />
    <GlassNode icon={Database} title="DB Action (Legacy)" subtitle="The Executor" colorClass="bg-rose-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-rose-500" />
  </>
);

export const CryptoNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-500" />
    <GlassNode icon={Shield} title="Cryptography" subtitle="Utility" colorClass="bg-zinc-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-500" />
  </>
);

export const CompressNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-500" />
    <GlassNode icon={FileArchive} title="Archive (Zip)" subtitle="Utility" colorClass="bg-zinc-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-500" />
  </>
);

export const FormatNode = ({ data, selected }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-500" />
    <GlassNode icon={FileCode2} title="Format Data" subtitle="Utility" colorClass="bg-zinc-500" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-500" />
  </>
);

export const ErrorTriggerNode = ({ data, selected }: any) => (
  <>
    <GlassNode icon={AlertTriangle} title="Error Trigger" subtitle="Trigger" colorClass="bg-red-600" data={data} selected={selected} />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-red-600" />
  </>
);

const nodeTypes = {
  triggerNode: TriggerNode,
  ifNode: IfNode,
  switchNode: SwitchNode,
  errorNode: ErrorNode,
  codeNode: CodeNode,
  loopNode: LoopNode,
  waitNode: WaitNode,
  setNode: SetNode,
  httpNode: HttpNode,
  databaseNode: DatabaseNode,
  aiNode: AiNode,
  messageNode: MessageNode,
  actionNode: ActionNode,
  cryptoNode: CryptoNode,
  compressNode: CompressNode,
  formatNode: FormatNode,
  errorTriggerNode: ErrorTriggerNode,
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

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importJsonContent, setImportJsonContent] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWfName, setNewWfName] = useState("");
  
  // Local Testing State
  const [chatHistory, setChatHistory] = useState<{role: "user"|"bot", content: string}[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null); // For single node test

  const { data: knowledgeBases = [] } = useQuery<any[]>({
    queryKey: ["/api/containers", containerId, "knowledge-bases"],
    enabled: !!containerId,
  });

  const { data: workflows } = useQuery({
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
      const url = workflowId ? `/api/workflows/${workflowId}` : `/api/containers/${containerId}/workflows`;
      const res = await fetch(url, { method: workflowId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save workflow");
      return res.json();
    },
    onSuccess: (data) => {
      setWorkflowId(data.id);
      toast({ title: "Saved", description: "Workflow saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['workflows', containerId] });
    }
  });

  const testMutation = useMutation({
    mutationFn: async ({ text, history }: any) => {
      if (!workflowId) throw new Error("Save workflow first.");
      const res = await fetch(`/api/workflows/${workflowId}/test`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { body: text, from_name: "Local Tester" }, session: {}, history })
      });
      if (!res.ok) throw new Error("Test execution failed");
      return res.json();
    },
    onMutate: (vars) => { setIsTesting(true); setChatHistory(prev => [...prev, { role: "user", content: vars.text }]); setTestInput(""); },
    onSuccess: (data) => {
      if (data.history) setChatHistory(data.history);
      setIsTesting(false);
    },
    onError: (err: any) => { setChatHistory(prev => [...prev, { role: "bot", content: `Error: ${err.message}` }]); setIsTesting(false); }
  });

  // Single Node Test Placeholder
  const testSingleNode = async () => {
    toast({ title: "Node Execution", description: "This will run the executor for this node in isolation (UI feature coming soon)." });
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonContent);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("JSON is not an object");
      }
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("JSON must contain 'nodes' and 'edges' arrays");
      }
      
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      if (parsed.name) {
        setWorkflowName(parsed.name);
      }
      
      setIsImportDialogOpen(false);
      setImportJsonContent("");
      toast({ title: "Import Successful", description: "Workflow parsed onto canvas. Click Save to persist." });
    } catch (err: any) {
      toast({ title: "Invalid JSON", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateNewWorkflow = () => {
    if (!newWfName) return;
    setWorkflowId(null);
    setWorkflowName(newWfName);
    setNodes([]);
    setEdges([]);
    setNewWfName("");
    setIsCreateDialogOpen(false);
    toast({ title: "New Workflow Initialized", description: `Started fresh workflow "${newWfName}"` });
  };

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)), [setEdges]);

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNode(nodes.length > 0 ? nodes[0] : null);
  }, []);

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: value } } : n));
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

      const position = { x: e.clientX - reactFlowBounds.left, y: e.clientY - reactFlowBounds.top };
      const newNode: Node = { id: `node_${Date.now()}`, type, position, data: { label: `New ${type.replace('Node', '')}` } };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  useEffect(() => {
    if (workflows && workflows.length > 0) {
      const wf = workflows[0];
      if (!workflowId) {
        setWorkflowId(wf.id);
        setWorkflowName(wf.name);
        setNodes(wf.nodes || []);
        setEdges(wf.edges || []);
      }
    }
  }, [workflows]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#fafafa]">
      
      {/* LEFT PALETTE */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col z-10 shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Waypoints className="w-5 h-5 text-indigo-500" /> Components</h2>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Triggers</h3>
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'triggerNode')}>
                <Zap className="w-5 h-5 text-amber-500" /> <span className="text-sm font-medium">Webhook / Trigger</span>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'errorTriggerNode')}>
                <AlertTriangle className="w-5 h-5 text-red-500" /> <span className="text-sm font-medium">Error Trigger</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Data & Logic</h3>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'ifNode')}>
                <SplitSquareHorizontal className="w-5 h-5 text-blue-500" /> <span className="text-sm font-medium">If Condition</span>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'switchNode')}>
                <Waypoints className="w-5 h-5 text-blue-500" /> <span className="text-sm font-medium">Switch</span>
              </div>
              <div className="border border-pink-200 bg-pink-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'loopNode')}>
                <Repeat className="w-5 h-5 text-pink-500" /> <span className="text-sm font-medium">Loop Array</span>
              </div>
              <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'codeNode')}>
                <Code className="w-5 h-5 text-slate-800" /> <span className="text-sm font-medium">Code Sandbox</span>
              </div>
              <div className="border border-cyan-200 bg-cyan-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'waitNode')}>
                <Hourglass className="w-5 h-5 text-cyan-500" /> <span className="text-sm font-medium">Wait Delay</span>
              </div>
              <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'setNode')}>
                <Wrench className="w-5 h-5 text-orange-500" /> <span className="text-sm font-medium">Set Fields</span>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'errorNode')}>
                <AlertTriangle className="w-5 h-5 text-red-600" /> <span className="text-sm font-medium">Error Catcher</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Integrations</h3>
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'httpNode')}>
                <Globe className="w-5 h-5 text-purple-500" /> <span className="text-sm font-medium">HTTP Request</span>
              </div>
              <div className="border border-rose-200 bg-rose-50 rounded-lg p-3 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'databaseNode')}>
                <Database className="w-5 h-5 text-rose-500" /> <span className="text-sm font-medium">Database (SQL)</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider mt-4">AI & Messaging</h3>
              <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'aiNode')}>
                <BrainCircuit className="w-5 h-5 text-indigo-500" /> <span className="text-sm font-medium">Cognitive AI</span>
              </div>
              <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'messageNode')}>
                <MessageCircle className="w-5 h-5 text-emerald-500" /> <span className="text-sm font-medium">Send Message</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider mt-4">Files & Utilities</h3>
              <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'cryptoNode')}>
                <Shield className="w-5 h-5 text-zinc-500" /> <span className="text-sm font-medium">Cryptography</span>
              </div>
              <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-3 mb-2 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'compressNode')}>
                <FileArchive className="w-5 h-5 text-zinc-500" /> <span className="text-sm font-medium">Archive (Zip)</span>
              </div>
              <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-3 cursor-grab hover:shadow-md flex gap-3" draggable onDragStart={(e) => handleDragStart(e, 'formatNode')}>
                <FileCode2 className="w-5 h-5 text-zinc-500" /> <span className="text-sm font-medium">Format Data</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* CANVAS */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center bg-white/90 p-2 rounded-lg border shadow-sm">
          <Select 
            value={workflowId || ""} 
            onValueChange={(val) => {
              if (val === "new") {
                setIsCreateDialogOpen(true);
              } else {
                const selected = (workflows || []).find((w: any) => w.id === val);
                if (selected) {
                  setWorkflowId(selected.id);
                  setWorkflowName(selected.name);
                  setNodes(selected.nodes || []);
                  setEdges(selected.edges || []);
                }
              }
            }}
          >
            <SelectTrigger className="w-56 font-semibold"><SelectValue placeholder="Select Workflow" /></SelectTrigger>
            <SelectContent>
              {workflows && workflows.map((w: any) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
              <SelectItem value="new">+ Create New Workflow</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>Start fresh with a clean canvas.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Workflow Name</Label>
                  <Input 
                    placeholder="e.g. Lead Follow-up Automation" 
                    value={newWfName} 
                    onChange={(e) => setNewWfName(e.target.value)} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateNewWorkflow} disabled={!newWfName}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white/90 shadow-sm" size="sm">
                <Upload className="w-4 h-4 mr-2" /> Import JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Import Workflow Template</DialogTitle>
                <DialogDescription>Paste the workflow JSON config to render it instantly.</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Textarea 
                  placeholder='{ "name": "My Flow", "nodes": [...], "edges": [...] }' 
                  className="font-mono text-xs h-64" 
                  value={importJsonContent} 
                  onChange={(e) => setImportJsonContent(e.target.value)} 
                />
              </div>
              <DialogFooter>
                <Button onClick={handleImportJson} disabled={!importJsonContent}>Import Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver} onSelectionChange={onSelectionChange} nodeTypes={nodeTypes} fitView className="flex-1">
          <Background color="#ccc" gap={16} />
          <Controls className="bg-white shadow-md border-0 rounded-lg" />
          <MiniMap className="rounded-lg shadow-md border-0" />
        </ReactFlow>

        {/* CHAT WIDGET */}
        <div className="absolute bottom-4 left-4 z-10 w-80 bg-white rounded-xl shadow-2xl border flex flex-col">
          <div className="bg-emerald-500 text-white p-3 flex justify-between">
            <div className="flex gap-2 items-center"><MessageSquare className="w-4 h-4" /><span className="font-semibold text-sm">Test Sandbox</span></div>
          </div>
          <div className="h-64 overflow-y-auto p-3 flex flex-col gap-3">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-emerald-100' : 'bg-slate-100'}`}>{msg.content}</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t">
            <form onSubmit={(e) => { e.preventDefault(); testMutation.mutate({ text: testInput, history: chatHistory }); }} className="flex gap-2">
              <Input placeholder="Type message..." value={testInput} onChange={(e) => setTestInput(e.target.value)} className="rounded-full" />
              <Button type="submit" size="icon" className="rounded-full bg-emerald-500"><ArrowRight className="w-4 h-4" /></Button>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR CONFIGURATION */}
      <div className={`w-80 bg-white border-l shadow-sm shrink-0 flex flex-col transition-transform duration-300 ${selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
        {selectedNode && (
          <>
            <div className="p-4 border-b flex justify-between bg-slate-50 items-center">
              <h3 className="font-semibold text-sm flex gap-2"><Settings2 className="w-4 h-4" /> Config</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}><X className="w-4 h-4" /></Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-5">
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-muted-foreground">Node Label</Label>
                  <Input value={(selectedNode.data as any)?.label || ""} onChange={(e) => updateNodeData("label", e.target.value)} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Continue On Fail</Label>
                  <Switch checked={(selectedNode.data as any)?.continueOnFail || false} onCheckedChange={(v) => updateNodeData("continueOnFail", v)} />
                </div>

                <div className="space-y-2 bg-slate-50 border p-3 rounded-lg">
                  <Label className="text-xs uppercase text-muted-foreground flex gap-1 items-center"><Code className="w-3.5 h-3.5 text-indigo-500" /> Variable Helper</Label>
                  <Select onValueChange={(val) => {
                    navigator.clipboard.writeText(val);
                    toast({ title: "Copied Expression", description: `Copied "${val}" to clipboard. Paste it in any input field.` });
                  }}>
                    <SelectTrigger className="bg-white text-xs h-8"><SelectValue placeholder="Select preceding variable to copy..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="{{ $json.payload }}">{"Trigger Webhook Payload ({{ $json.payload }})"}</SelectItem>
                      {nodes.filter(n => n.id !== selectedNode.id).map(n => {
                        const lbl = (n.data as any)?.label || n.type;
                        return (
                          <SelectItem key={n.id} value={`{{ $node['${lbl}'].json }}`}>{lbl} output (JSON)</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* TRIGGER NODE CONFIG */}
                {selectedNode.type === "triggerNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Trigger Type</Label>
                      <Select value={(selectedNode.data as any)?.triggerType || "webhook"} onValueChange={(v) => updateNodeData("triggerType", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="webhook">Webhook</SelectItem><SelectItem value="schedule">Schedule</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent>
                      </Select>
                    </div>
                    {(selectedNode.data as any)?.triggerType === "webhook" && (
                      <>
                        <div className="space-y-1">
                          <Label>Webhook Path</Label>
                          <Input placeholder="/my-webhook" value={(selectedNode.data as any)?.webhookPath || ""} onChange={(e) => updateNodeData("webhookPath", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>HTTP Method</Label>
                          <Select value={(selectedNode.data as any)?.method || "POST"} onValueChange={(v) => updateNodeData("method", v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                          <div className="flex gap-2 items-center mt-1">
                            <Input 
                              readOnly 
                              className="font-mono text-xs h-8 bg-white" 
                              value={workflowId ? `${window.location.origin}/api/engine/run/${workflowId}` : "Save workflow to get URL"} 
                            />
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 px-2"
                              disabled={!workflowId}
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/engine/run/${workflowId}`);
                                toast({ title: "Copied", description: "Webhook URL copied to clipboard." });
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                    {(selectedNode.data as any)?.triggerType === "schedule" && (
                      <div className="space-y-1">
                        <Label>Cron Expression</Label>
                        <Input placeholder="* * * * *" value={(selectedNode.data as any)?.cron || ""} onChange={(e) => updateNodeData("cron", e.target.value)} />
                      </div>
                    )}
                  </>
                )}

                {/* SWITCH NODE CONFIG */}
                {selectedNode.type === "switchNode" && (
                  <>
                    <div className="space-y-4">
                      <Label>Routing Rules</Label>
                      {((selectedNode.data as any)?.rules || []).map((rule: any, i: number) => (
                        <div key={i} className="flex gap-2 items-center bg-black/5 p-2 rounded-lg border border-black/10">
                          <Input placeholder="{{ $json.val }}" value={rule.value1 || ""} onChange={(e) => {
                            const newRules = [...((selectedNode.data as any)?.rules || [])];
                            newRules[i] = { ...newRules[i], value1: e.target.value };
                            updateNodeData("rules", newRules);
                          }} className="w-1/3 text-xs" />
                          <Select value={rule.operator || "==="} onValueChange={(v) => {
                            const newRules = [...((selectedNode.data as any)?.rules || [])];
                            newRules[i] = { ...newRules[i], operator: v };
                            updateNodeData("rules", newRules);
                          }}>
                            <SelectTrigger className="w-24 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="===">==</SelectItem><SelectItem value="!==">!=</SelectItem><SelectItem value=">">&gt;</SelectItem><SelectItem value="<">&lt;</SelectItem></SelectContent>
                          </Select>
                          <Input placeholder="match" value={rule.value2 || ""} onChange={(e) => {
                            const newRules = [...((selectedNode.data as any)?.rules || [])];
                            newRules[i] = { ...newRules[i], value2: e.target.value };
                            updateNodeData("rules", newRules);
                          }} className="w-1/3 text-xs" />
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => {
                            const newRules = [...((selectedNode.data as any)?.rules || [])];
                            newRules.splice(i, 1);
                            updateNodeData("rules", newRules);
                          }}><Trash className="w-3 h-3"/></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                        const newRules = [...((selectedNode.data as any)?.rules || [])];
                        newRules.push({ value1: "", operator: "===", value2: "", handleName: `case_${newRules.length}` });
                        updateNodeData("rules", newRules);
                      }}>+ Add Rule</Button>
                    </div>
                  </>
                )}

                {/* ERROR NODE CONFIG */}
                {selectedNode.type === "errorNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Catch Type</Label>
                      <Select value={(selectedNode.data as any)?.catchType || "all"} onValueChange={(v) => updateNodeData("catchType", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Errors</SelectItem><SelectItem value="specific">Specific Error</SelectItem></SelectContent>
                      </Select>
                    </div>
                    {(selectedNode.data as any)?.catchType === "specific" && (
                      <div className="space-y-1">
                        <Label>Error Name (e.g. ValidationError)</Label>
                        <Input placeholder="ValidationError" value={(selectedNode.data as any)?.errorName || ""} onChange={(e) => updateNodeData("errorName", e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label>Fallback Payload (JSON)</Label>
                      <Textarea placeholder='{"status": "recovered"}' className="font-mono text-xs h-24" value={typeof (selectedNode.data as any)?.fallback === "string" ? (selectedNode.data as any)?.fallback : JSON.stringify((selectedNode.data as any)?.fallback || {}, null, 2)} onChange={(e) => {
                        try { updateNodeData("fallback", JSON.parse(e.target.value)); } catch(err) { updateNodeData("fallback", e.target.value); }
                      }} />
                    </div>
                  </>
                )}

                {/* AI NODE CONFIG */}
                {selectedNode.type === "aiNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Model Provider</Label>
                      <Select value={(selectedNode.data as any)?.provider || "openai"} onValueChange={(v) => updateNodeData("provider", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="openai">OpenAI (GPT-4)</SelectItem><SelectItem value="anthropic">Anthropic (Claude)</SelectItem><SelectItem value="local">Local LLM</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Knowledge Base (RAG)</Label>
                      <Select value={(selectedNode.data as any)?.knowledgeBaseId || "none"} onValueChange={(v) => updateNodeData("knowledgeBaseId", v)}>
                        <SelectTrigger><SelectValue placeholder="Select Knowledge Base" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Standard Prompt)</SelectItem>
                          {knowledgeBases.map((kb: any) => (
                            <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>System Message</Label>
                      <Textarea placeholder="You are a helpful assistant..." className="font-mono text-xs h-24" value={(selectedNode.data as any)?.systemMessage || ""} onChange={(e) => updateNodeData("systemMessage", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>User Prompt</Label>
                      <Textarea placeholder="Process this: {{ $json.text }}" className="font-mono text-xs h-24" value={(selectedNode.data as any)?.prompt || ""} onChange={(e) => updateNodeData("prompt", e.target.value)} />
                    </div>
                  </>
                )}

                {/* MESSAGE NODE CONFIG */}
                {selectedNode.type === "messageNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Platform</Label>
                      <Select value={(selectedNode.data as any)?.platform || "whatsapp"} onValueChange={(v) => updateNodeData("platform", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="telegram">Telegram</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Recipient (To)</Label>
                      <Input placeholder="{{ $json.phone }}" value={(selectedNode.data as any)?.recipient || ""} onChange={(e) => updateNodeData("recipient", e.target.value)} />
                    </div>
                    
                    <div className="space-y-1">
                      <Label>Message Format</Label>
                      <Select value={(selectedNode.data as any)?.messageType || "text"} onValueChange={(v) => updateNodeData("messageType", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Standard Text</SelectItem>
                          <SelectItem value="buttons">Quick Reply Buttons</SelectItem>
                          <SelectItem value="location">Request Location/Address</SelectItem>
                          <SelectItem value="link">CTA Link Button</SelectItem>
                          <SelectItem value="flow">WhatsApp Flow Form</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Message Body</Label>
                      <Textarea placeholder="Hello {{ $json.name }}!" className="font-mono text-xs h-24" value={(selectedNode.data as any)?.messageBody || ""} onChange={(e) => updateNodeData("messageBody", e.target.value)} />
                    </div>

                    {/* Quick Reply Buttons */}
                    {((selectedNode.data as any)?.messageType === "buttons") && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Response Buttons (Max 3)</Label>
                        {((selectedNode.data as any)?.buttons || []).map((btn: string, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input placeholder={`Button ${idx + 1} Label`} className="h-8 text-xs flex-1" value={btn || ""} onChange={(e) => {
                              const newBtns = [...((selectedNode.data as any)?.buttons || [])];
                              newBtns[idx] = e.target.value;
                              updateNodeData("buttons", newBtns);
                            }} />
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 animate-none" onClick={() => {
                              const newBtns = [...((selectedNode.data as any)?.buttons || [])];
                              newBtns.splice(idx, 1);
                              updateNodeData("buttons", newBtns);
                            }}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {((selectedNode.data as any)?.buttons || []).length < 3 && (
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => {
                            const newBtns = [...((selectedNode.data as any)?.buttons || []), ""];
                            updateNodeData("buttons", newBtns);
                          }}>
                            + Add Response Button
                          </Button>
                        )}
                      </div>
                    )}

                    {/* CTA Link Button */}
                    {((selectedNode.data as any)?.messageType === "link") && (
                      <>
                        <div className="space-y-1">
                          <Label>Button Display Text</Label>
                          <Input placeholder="Open URL Link" value={(selectedNode.data as any)?.linkText || ""} onChange={(e) => updateNodeData("linkText", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Button URL Link</Label>
                          <Input placeholder="https://example.com/checkout" value={(selectedNode.data as any)?.linkUrl || ""} onChange={(e) => updateNodeData("linkUrl", e.target.value)} />
                        </div>
                      </>
                    )}

                    {/* WhatsApp Flow Forms */}
                    {((selectedNode.data as any)?.messageType === "flow") && (
                      <>
                        <div className="space-y-1">
                          <Label>Flow ID (from Meta Developer Panel)</Label>
                          <Input placeholder="e.g. 382910482901" value={(selectedNode.data as any)?.flowId || ""} onChange={(e) => updateNodeData("flowId", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Button CTA Text (Label on Button)</Label>
                          <Input placeholder="e.g. Open Form" value={(selectedNode.data as any)?.flowCta || ""} onChange={(e) => updateNodeData("flowCta", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Starting Screen ID</Label>
                          <Input placeholder="START" value={(selectedNode.data as any)?.flowScreen || "START"} onChange={(e) => updateNodeData("flowScreen", e.target.value)} />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ACTION NODE CONFIG */}
                {selectedNode.type === "actionNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Action Type</Label>
                      <Select value={(selectedNode.data as any)?.actionType || "create_contact"} onValueChange={(v) => updateNodeData("actionType", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="create_contact">Create Contact</SelectItem><SelectItem value="update_contact">Update Contact</SelectItem><SelectItem value="create_order">Create Order</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Payload (JSON)</Label>
                      <Textarea placeholder='{"name": "{{ $json.name }}"}' className="font-mono text-xs h-32" value={typeof (selectedNode.data as any)?.payload === "string" ? (selectedNode.data as any)?.payload : JSON.stringify((selectedNode.data as any)?.payload || {}, null, 2)} onChange={(e) => {
                        try { updateNodeData("payload", JSON.parse(e.target.value)); } catch(err) { updateNodeData("payload", e.target.value); }
                      }} />
                    </div>
                  </>
                )}

                {/* CRYPTO NODE CONFIG */}
                {selectedNode.type === "cryptoNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Operation</Label>
                      <Select value={(selectedNode.data as any)?.operation || "hash"} onValueChange={(v) => updateNodeData("operation", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="hash">Hash</SelectItem><SelectItem value="hmac">HMAC</SelectItem><SelectItem value="encrypt">Encrypt (AES)</SelectItem><SelectItem value="decrypt">Decrypt (AES)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Algorithm (for Hash/HMAC)</Label>
                      <Input placeholder="sha256" value={(selectedNode.data as any)?.algorithm || ""} onChange={(e) => updateNodeData("algorithm", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Data (Input string)</Label>
                      <Input placeholder="{{ $json.payload }}" value={(selectedNode.data as any)?.data || ""} onChange={(e) => updateNodeData("data", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Secret Key</Label>
                      <Input type="password" placeholder="super-secret-key" value={(selectedNode.data as any)?.secret || ""} onChange={(e) => updateNodeData("secret", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Output Property</Label>
                      <Input placeholder="cryptoResult" value={(selectedNode.data as any)?.outputProperty || "cryptoResult"} onChange={(e) => updateNodeData("outputProperty", e.target.value)} />
                    </div>
                  </>
                )}

                {/* COMPRESS NODE CONFIG */}
                {selectedNode.type === "compressNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Operation</Label>
                      <Select value={(selectedNode.data as any)?.operation || "compress"} onValueChange={(v) => updateNodeData("operation", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="compress">Compress to Zip</SelectItem><SelectItem value="extract">Extract Zip</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Input Binary Property</Label>
                      <Input placeholder="data" value={(selectedNode.data as any)?.inputBinaryProperty || "data"} onChange={(e) => updateNodeData("inputBinaryProperty", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Target Binary Property</Label>
                      <Input placeholder="data" value={(selectedNode.data as any)?.binaryPropertyName || "data"} onChange={(e) => updateNodeData("binaryPropertyName", e.target.value)} />
                    </div>
                    {((selectedNode.data as any)?.operation || "compress") === "compress" && (
                      <div className="space-y-1">
                        <Label>File Name</Label>
                        <Input placeholder="archive.zip" value={(selectedNode.data as any)?.fileName || "archive.zip"} onChange={(e) => updateNodeData("fileName", e.target.value)} />
                      </div>
                    )}
                  </>
                )}

                {/* FORMAT NODE CONFIG */}
                {selectedNode.type === "formatNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Operation</Label>
                      <Select value={(selectedNode.data as any)?.operation || "jsonToCsv"} onValueChange={(v) => updateNodeData("operation", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="jsonToCsv">JSON to CSV</SelectItem><SelectItem value="csvToJson">CSV to JSON</SelectItem><SelectItem value="base64Encode">Base64 Encode</SelectItem><SelectItem value="base64Decode">Base64 Decode</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Input Data</Label>
                      <Textarea placeholder="{{ $json.items }}" className="font-mono text-xs h-24" value={(selectedNode.data as any)?.data || ""} onChange={(e) => updateNodeData("data", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Output Property</Label>
                      <Input placeholder="formattedResult" value={(selectedNode.data as any)?.outputProperty || "formattedResult"} onChange={(e) => updateNodeData("outputProperty", e.target.value)} />
                    </div>
                  </>
                )}


                {/* HTTP NODE CONFIG */}
                {selectedNode.type === "httpNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Method</Label>
                      <Select value={(selectedNode.data as any)?.method || "GET"} onValueChange={(v) => updateNodeData("method", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem><SelectItem value="DELETE">DELETE</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>URL</Label>
                      <Input placeholder="https://api.example.com/data" value={(selectedNode.data as any)?.url || ""} onChange={(e) => updateNodeData("url", e.target.value)} />
                      <p className="text-[10px] text-muted-foreground">Supports {'{{ $json.myVariable }}'}</p>
                    </div>
                    {["POST", "PUT", "PATCH"].includes((selectedNode.data as any)?.method || "GET") && (
                      <>
                        <div className="space-y-1">
                          <Label>Body Type</Label>
                          <Select value={(selectedNode.data as any)?.bodyType || "json"} onValueChange={(v) => updateNodeData("bodyType", v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="json">Raw JSON (Advanced)</SelectItem>
                              <SelectItem value="form">Key-Value Form (No-Code)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {((selectedNode.data as any)?.bodyType || "json") === "form" ? (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Form Parameters</Label>
                            {((selectedNode.data as any)?.formParams || []).map((param: any, idx: number) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <Input placeholder="Key" className="h-8 text-xs font-mono w-28 shrink-0" value={param.key || ""} onChange={(e) => {
                                  const newParams = [...((selectedNode.data as any)?.formParams || [])];
                                  newParams[idx] = { ...newParams[idx], key: e.target.value };
                                  updateNodeData("formParams", newParams);
                                  const newBody: Record<string, any> = {};
                                  newParams.forEach(p => { if (p.key) newBody[p.key] = p.value; });
                                  updateNodeData("body", newBody);
                                }} />
                                <Input placeholder="Value" className="h-8 text-xs flex-1" value={param.value || ""} onChange={(e) => {
                                  const newParams = [...((selectedNode.data as any)?.formParams || [])];
                                  newParams[idx] = { ...newParams[idx], value: e.target.value };
                                  updateNodeData("formParams", newParams);
                                  const newBody: Record<string, any> = {};
                                  newParams.forEach(p => { if (p.key) newBody[p.key] = p.value; });
                                  updateNodeData("body", newBody);
                                }} />
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 animate-none" onClick={() => {
                                  const newParams = [...((selectedNode.data as any)?.formParams || [])];
                                  newParams.splice(idx, 1);
                                  updateNodeData("formParams", newParams);
                                  const newBody: Record<string, any> = {};
                                  newParams.forEach(p => { if (p.key) newBody[p.key] = p.value; });
                                  updateNodeData("body", newBody);
                                }}>
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => {
                              const newParams = [...((selectedNode.data as any)?.formParams || []), { key: "", value: "" }];
                              updateNodeData("formParams", newParams);
                            }}>
                              + Add Parameter
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Label>JSON Body</Label>
                            <Textarea placeholder='{"key": "{{ $json.value }}"}' className="font-mono text-xs h-24" value={typeof (selectedNode.data as any)?.body === "string" ? (selectedNode.data as any)?.body : JSON.stringify((selectedNode.data as any)?.body || {}, null, 2)} onChange={(e) => {
                              try { updateNodeData("body", JSON.parse(e.target.value)); } catch(err) { updateNodeData("body", e.target.value); }
                            }} />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* DB NODE CONFIG */}
                {selectedNode.type === "databaseNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Query Type</Label>
                      <Select value={(selectedNode.data as any)?.queryType || "structured"} onValueChange={(v) => updateNodeData("queryType", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="structured">Structured (No-Code)</SelectItem>
                          <SelectItem value="raw">Raw SQL (Advanced)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {((selectedNode.data as any)?.queryType || "structured") === "structured" ? (
                      <>
                        <div className="space-y-1">
                          <Label>Operation</Label>
                          <Select value={(selectedNode.data as any)?.operation || "select"} onValueChange={(v) => updateNodeData("operation", v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="select">Select Rows</SelectItem>
                              <SelectItem value="insert">Insert Row</SelectItem>
                              <SelectItem value="update">Update Rows</SelectItem>
                              <SelectItem value="delete">Delete Rows</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Table</Label>
                          <Select value={(selectedNode.data as any)?.tableName || "contacts"} onValueChange={(v) => updateNodeData("tableName", v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contacts">Contacts</SelectItem>
                              <SelectItem value="orders">Orders</SelectItem>
                              <SelectItem value="deals">Deals</SelectItem>
                              <SelectItem value="messages">Messages</SelectItem>
                              <SelectItem value="templates">Templates</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Column Values List (only for insert / update) */}
                        {["insert", "update"].includes((selectedNode.data as any)?.operation || "select") && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Column Values</Label>
                            {((selectedNode.data as any)?.fields || []).map((field: any, idx: number) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <Input placeholder="Column" className="h-8 text-xs font-mono w-28 shrink-0" value={field.column || ""} onChange={(e) => {
                                  const newFields = [...((selectedNode.data as any)?.fields || [])];
                                  newFields[idx] = { ...newFields[idx], column: e.target.value };
                                  updateNodeData("fields", newFields);
                                }} />
                                <Input placeholder="Value" className="h-8 text-xs flex-1" value={field.value || ""} onChange={(e) => {
                                  const newFields = [...((selectedNode.data as any)?.fields || [])];
                                  newFields[idx] = { ...newFields[idx], value: e.target.value };
                                  updateNodeData("fields", newFields);
                                }} />
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 animate-none" onClick={() => {
                                  const newFields = [...((selectedNode.data as any)?.fields || [])];
                                  newFields.splice(idx, 1);
                                  updateNodeData("fields", newFields);
                                }}>
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => {
                              const newFields = [...((selectedNode.data as any)?.fields || []), { column: "", value: "" }];
                              updateNodeData("fields", newFields);
                            }}>
                              + Add Column Value
                            </Button>
                          </div>
                        )}

                        {/* WHERE filters (for select / update / delete) */}
                        {["select", "update", "delete"].includes((selectedNode.data as any)?.operation || "select") && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Filters (WHERE)</Label>
                            {((selectedNode.data as any)?.whereConditions || []).map((cond: any, idx: number) => (
                              <div key={idx} className="flex gap-2 items-center bg-black/5 p-2 rounded-lg border border-black/10">
                                <Input placeholder="Column" className="h-8 text-xs font-mono w-20 shrink-0" value={cond.column || ""} onChange={(e) => {
                                  const newConds = [...((selectedNode.data as any)?.whereConditions || [])];
                                  newConds[idx] = { ...newConds[idx], column: e.target.value };
                                  updateNodeData("whereConditions", newConds);
                                }} />
                                <Select value={cond.operator || "="} onValueChange={(v) => {
                                  const newConds = [...((selectedNode.data as any)?.whereConditions || [])];
                                  newConds[idx] = { ...newConds[idx], operator: v };
                                  updateNodeData("whereConditions", newConds);
                                }}>
                                  <SelectTrigger className="h-8 text-xs w-14 shrink-0"><SelectValue/></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="=">=</SelectItem>
                                    <SelectItem value="!=">!=</SelectItem>
                                    <SelectItem value="<">&lt;</SelectItem>
                                    <SelectItem value=">">&gt;</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input placeholder="Value" className="h-8 text-xs flex-1" value={cond.value || ""} onChange={(e) => {
                                  const newConds = [...((selectedNode.data as any)?.whereConditions || [])];
                                  newConds[idx] = { ...newConds[idx], value: e.target.value };
                                  updateNodeData("whereConditions", newConds);
                                }} />
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 animate-none" onClick={() => {
                                  const newConds = [...((selectedNode.data as any)?.whereConditions || [])];
                                  newConds.splice(idx, 1);
                                  updateNodeData("whereConditions", newConds);
                                }}>
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => {
                              const newConds = [...((selectedNode.data as any)?.whereConditions || []), { column: "", operator: "=", value: "" }];
                              updateNodeData("whereConditions", newConds);
                            }}>
                              + Add Filter
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1">
                        <Label>Raw SQL Query</Label>
                        <Textarea placeholder="SELECT * FROM users WHERE id = $1" className="font-mono text-xs h-24" value={(selectedNode.data as any)?.rawQuery || ""} onChange={(e) => updateNodeData("rawQuery", e.target.value)} />
                      </div>
                    )}
                  </>
                )}

                {/* IF NODE CONFIG */}
                {selectedNode.type === "ifNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Value 1</Label>
                      <Input placeholder="{{ $json.status }}" value={(selectedNode.data as any)?.value1 || ""} onChange={(e) => updateNodeData("value1", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Operator</Label>
                      <Select value={(selectedNode.data as any)?.operator || "==="} onValueChange={(v) => updateNodeData("operator", v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="===">Equals</SelectItem><SelectItem value="!==">Not Equals</SelectItem><SelectItem value=">">Greater Than</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Value 2</Label>
                      <Input placeholder="active" value={(selectedNode.data as any)?.value2 || ""} onChange={(e) => updateNodeData("value2", e.target.value)} />
                    </div>
                  </>
                )}

                {/* PHASE 2 NODES */}
                {selectedNode.type === "codeNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>JavaScript Code</Label>
                      <Textarea 
                        placeholder="return { result: $json.value * 2 };" 
                        className="font-mono text-xs h-40" 
                        value={(selectedNode.data as any)?.code || ""} 
                        onChange={(e) => updateNodeData("code", e.target.value)} 
                      />
                      <p className="text-[10px] text-muted-foreground">Access previous node data via <code>$json</code> and <code>$node['Node Name'].json</code></p>
                    </div>
                  </>
                )}

                {selectedNode.type === "loopNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Array Source (e.g., {'{{ $json.items }}'})</Label>
                      <Input placeholder="{{ $json.items }}" value={(selectedNode.data as any)?.sourceArray || ""} onChange={(e) => updateNodeData("sourceArray", e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">Will emit each item out the "item" branch sequentially.</p>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Wiring Instructions:</p>
                      <p>1. Connect <strong>"item"</strong> output to the start of your loop branch.</p>
                      <p>2. Connect the output of the final node of your loop branch <strong>back to this Loop Node</strong> (creating a cycle).</p>
                      <p>3. Connect <strong>"done"</strong> output to nodes executing after completion.</p>
                    </div>
                  </>
                )}

                {selectedNode.type === "waitNode" && (
                  <>
                    <div className="space-y-1">
                      <Label>Wait Duration</Label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="5" value={(selectedNode.data as any)?.duration || ""} onChange={(e) => updateNodeData("duration", e.target.value)} />
                        <Select value={(selectedNode.data as any)?.unit || "seconds"} onValueChange={(v) => updateNodeData("unit", v)}>
                          <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                          <SelectContent><SelectItem value="seconds">Seconds</SelectItem><SelectItem value="minutes">Minutes</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {selectedNode.type === "setNode" && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-sm font-medium">Keep Only Set Values</Label>
                      <Switch checked={(selectedNode.data as any)?.keepOnlySet || false} onCheckedChange={(v) => updateNodeData("keepOnlySet", v)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Values JSON array `[{'{"key":"val"}'}]`</Label>
                      <Textarea 
                        placeholder='[{"key": "my_field", "value": "{{ $json.some_field }}"}]' 
                        className="font-mono text-xs h-32" 
                        value={typeof (selectedNode.data as any)?.values === "string" ? (selectedNode.data as any)?.values : JSON.stringify((selectedNode.data as any)?.values || [], null, 2)} 
                        onChange={(e) => {
                          try { updateNodeData("values", JSON.parse(e.target.value)); } catch(err) { updateNodeData("values", e.target.value); }
                        }} 
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t mt-auto space-y-2">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={testSingleNode}>
                    <Play className="w-4 h-4 mr-2" /> Test Step
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => { setNodes(nds => nds.filter(n => n.id !== selectedNode.id)); setSelectedNode(null); }}>
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
