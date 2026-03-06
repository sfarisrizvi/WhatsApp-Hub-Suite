import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, CircleDot, Trash2, DollarSign, GripVertical, User } from "lucide-react";
import type { Deal, Contact } from "@shared/schema";

const stages = [
  { value: "lead", label: "Lead", color: "bg-blue-500" },
  { value: "qualified", label: "Qualified", color: "bg-cyan-500" },
  { value: "proposal", label: "Proposal", color: "bg-yellow-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { value: "closed_won", label: "Closed Won", color: "bg-green-500" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

export default function Pipeline() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", stage: "lead", contactId: "" });
  const [dragDeal, setDragDeal] = useState<string | null>(null);

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/containers", cid, "deals"],
    enabled: !!cid,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/deals`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "deals"] });
      setShowCreate(false);
      setForm({ title: "", value: "", stage: "lead", contactId: "" });
      toast({ title: "Deal created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/deals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "deals"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/deals/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "deals"] });
      toast({ title: "Deal deleted" });
    },
  });

  const handleDrop = (stage: string) => {
    if (dragDeal) {
      updateMutation.mutate({ id: dragDeal, data: { stage } });
      setDragDeal(null);
    }
  };

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="p-6 space-y-4 overflow-hidden h-full flex flex-col relative">
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]" data-testid="overlay-coming-soon">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto">
            <CircleDot className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-xs">Sales Pipeline is under development and will be available shortly.</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pipeline-title">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deals &middot; ${totalValue.toLocaleString()} total value</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-deal">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} data-testid="input-deal-title" />
              </div>
              <div>
                <Label>Value ($)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} data-testid="input-deal-value" />
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger data-testid="select-deal-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact (optional)</Label>
                <Select value={form.contactId} onValueChange={(v) => setForm(f => ({ ...f, contactId: v }))}>
                  <SelectTrigger data-testid="select-deal-contact"><SelectValue placeholder="Link to contact" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate({ ...form, value: parseInt(form.value) || 0, contactId: form.contactId || null })} disabled={createMutation.isPending} data-testid="button-save-deal">
                Create Deal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex gap-4 flex-1 overflow-x-auto">{[1,2,3,4].map(i => <Skeleton key={i} className="w-64 h-full shrink-0" />)}</div>
      ) : (
        <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const stageDeals = deals.filter(d => d.stage === stage.value);
            const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

            return (
              <div
                key={stage.value}
                className="w-64 shrink-0 flex flex-col rounded-lg bg-accent/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.value)}
                data-testid={`column-${stage.value}`}
              >
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                      <span className="text-sm font-medium">{stage.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{stageDeals.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">${stageTotal.toLocaleString()}</p>
                </div>

                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {stageDeals.map((deal) => {
                      const contact = contacts.find(c => c.id === deal.contactId);
                      return (
                        <Card
                          key={deal.id}
                          draggable
                          onDragStart={() => setDragDeal(deal.id)}
                          className="p-3 cursor-grab active:cursor-grabbing hover-elevate"
                          data-testid={`card-deal-${deal.id}`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="text-sm font-medium leading-tight">{deal.title}</p>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => deleteMutation.mutate(deal.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1 text-xs font-medium text-primary">
                              <DollarSign className="h-3 w-3" /> {(deal.value || 0).toLocaleString()}
                            </span>
                            {contact && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                <User className="h-3 w-3" /> {contact.name}
                              </span>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
