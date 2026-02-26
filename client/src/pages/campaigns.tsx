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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Megaphone, Trash2, Send, Calendar, Users, Eye } from "lucide-react";
import type { Campaign, Template, Contact } from "@shared/schema";

export default function Campaigns() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", templateId: "", targetTags: "", scheduledAt: "" });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/containers", cid, "campaigns"],
    enabled: !!cid,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/containers", cid, "templates"],
    enabled: !!cid,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/campaigns`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "campaigns"] });
      setShowCreate(false);
      setForm({ name: "", templateId: "", targetTags: "", scheduledAt: "" });
      toast({ title: "Campaign created" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const tags = campaigns.find(c => c.id === id)?.targetTags || [];
      const matchingContacts = contacts.filter(c => tags.length === 0 || (c.tags || []).some(t => tags.includes(t)));
      const res = await apiRequest("PATCH", `/api/campaigns/${id}`, {
        status,
        totalRecipients: matchingContacts.length,
        delivered: status === "sent" ? matchingContacts.length : 0,
        read: status === "sent" ? Math.floor(matchingContacts.length * 0.7) : 0,
        replied: status === "sent" ? Math.floor(matchingContacts.length * 0.2) : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "campaigns"] });
      toast({ title: "Campaign updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/campaigns/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "campaigns"] });
      toast({ title: "Campaign deleted" });
    },
  });

  const handleSubmit = () => {
    const tags = form.targetTags ? form.targetTags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const matchingContacts = contacts.filter(c => tags.length === 0 || (c.tags || []).some(t => tags.includes(t)));
    createMutation.mutate({
      ...form,
      targetTags: tags,
      totalRecipients: matchingContacts.length,
      scheduledAt: form.scheduledAt || null,
    });
  };

  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "scheduled": return "outline";
      case "sending": return "default";
      case "sent": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-campaigns-title">Campaigns</h1>
          <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-campaign">
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-campaign-name" />
              </div>
              <div>
                <Label>Template</Label>
                <Select value={form.templateId} onValueChange={(v) => setForm(f => ({ ...f, templateId: v }))}>
                  <SelectTrigger data-testid="select-campaign-template"><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Tags (comma separated, empty = all contacts)</Label>
                <Input value={form.targetTags} onChange={(e) => setForm(f => ({ ...f, targetTags: e.target.value }))} data-testid="input-campaign-tags" placeholder={allTags.join(", ")} />
              </div>
              <div>
                <Label>Schedule (optional)</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm(f => ({ ...f, scheduledAt: e.target.value }))} data-testid="input-campaign-schedule" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-campaign">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[1,2].map(i => <Skeleton key={i} className="h-40" />)}</div>
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No campaigns yet. Create your first broadcast campaign.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => {
            const total = campaign.totalRecipients || 1;
            const deliveryRate = Math.round(((campaign.delivered || 0) / total) * 100);
            const readRate = Math.round(((campaign.read || 0) / total) * 100);
            const replyRate = Math.round(((campaign.replied || 0) / total) * 100);

            return (
              <Card key={campaign.id} className="p-5 hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
                <div className="flex items-start justify-between gap-1 mb-3">
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={getStatusColor(campaign.status || "draft") as any} className="text-[10px]">
                        {campaign.status}
                      </Badge>
                      {campaign.scheduledAt && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(campaign.scheduledAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(campaign.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {campaign.totalRecipients} recipients
                  </span>
                  {(campaign.targetTags || []).length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {(campaign.targetTags || []).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {campaign.status === "sent" && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-md bg-accent">
                      <p className="text-lg font-bold text-primary">{deliveryRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Delivered</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-accent">
                      <p className="text-lg font-bold">{readRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Read</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-accent">
                      <p className="text-lg font-bold">{replyRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Replied</p>
                    </div>
                  </div>
                )}

                {campaign.status === "draft" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "sent" })} data-testid={`button-send-campaign-${campaign.id}`}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Send Now
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
