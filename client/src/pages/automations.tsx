import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Zap, Trash2, Edit, MessageSquare, Clock, Hash } from "lucide-react";
import type { AutomationRule } from "@shared/schema";

const typeOptions = [
  { value: "welcome", label: "Welcome Message", icon: MessageSquare, desc: "Sent automatically when a new contact messages you" },
  { value: "keyword", label: "Keyword Auto-Reply", icon: Hash, desc: "Triggered when a message contains specific keywords" },
  { value: "away", label: "Away Message", icon: Clock, desc: "Sent when you're unavailable or outside business hours" },
];

export default function Automations() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState({ name: "", type: "welcome", trigger: "", responseText: "" });

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/containers", cid, "automations"],
    enabled: !!cid,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/automations`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "automations"] });
      setShowCreate(false);
      setForm({ name: "", type: "welcome", trigger: "", responseText: "" });
      toast({ title: "Automation created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/automations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "automations"] });
      setEditRule(null);
      toast({ title: "Automation updated" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/automations/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "automations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/automations/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  const handleSubmit = () => {
    if (editRule) {
      updateMutation.mutate({ id: editRule.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getTypeInfo = (type: string) => typeOptions.find(t => t.value === type) || typeOptions[0];

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-automations-title">Automations</h1>
          <p className="text-sm text-muted-foreground">{rules.length} automation rules</p>
        </div>
        <Dialog open={showCreate || !!editRule} onOpenChange={(v) => { if (!v) { setShowCreate(false); setEditRule(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm({ name: "", type: "welcome", trigger: "", responseText: "" }); setShowCreate(true); }} data-testid="button-create-automation">
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editRule ? "Edit Automation" : "Create Automation"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-automation-name" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger data-testid="select-automation-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.type === "keyword" && (
                <div>
                  <Label>Trigger Keywords (comma separated)</Label>
                  <Input value={form.trigger} onChange={(e) => setForm(f => ({ ...f, trigger: e.target.value }))} data-testid="input-automation-trigger" placeholder="hello, hi, hey" />
                </div>
              )}
              <div>
                <Label>Response Message</Label>
                <Textarea value={form.responseText} onChange={(e) => setForm(f => ({ ...f, responseText: e.target.value }))} rows={4} data-testid="input-automation-response" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-automation">
                {editRule ? "Update" : "Create"} Automation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {typeOptions.map((opt) => {
          const count = rules.filter(r => r.type === opt.value).length;
          return (
            <Card key={opt.value} className="p-4 hover-elevate" data-testid={`card-type-${opt.value}`}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <opt.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{count} active</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : rules.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No automation rules yet. Create welcome messages, keyword replies, or away messages.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const typeInfo = getTypeInfo(rule.type);
            return (
              <Card key={rule.id} className="p-4" data-testid={`card-rule-${rule.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <typeInfo.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{rule.name}</p>
                        <Badge variant="secondary" className="text-[10px]">{typeInfo.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{rule.responseText}</p>
                      {rule.type === "keyword" && rule.trigger && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {rule.trigger.split(",").map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{kw.trim()}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={rule.isActive ?? true}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                      data-testid={`switch-rule-${rule.id}`}
                    />
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditRule(rule);
                      setForm({ name: rule.name, type: rule.type, trigger: rule.trigger || "", responseText: rule.responseText });
                    }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
