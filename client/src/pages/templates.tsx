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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Trash2, Edit, FileText, Copy, Eye } from "lucide-react";
import type { Template } from "@shared/schema";

const premadeTemplates = [
  { name: "Welcome Message", category: "utility", body: "Hello {{1}}! Welcome to {{2}}. We're glad to have you. How can we help you today?", variables: ["customer_name", "business_name"] },
  { name: "Order Confirmation", category: "utility", body: "Hi {{1}}, your order #{{2}} has been confirmed! Total: ${{3}}. We'll notify you when it ships.", variables: ["customer_name", "order_number", "total"] },
  { name: "Payment Reminder", category: "utility", body: "Hi {{1}}, this is a friendly reminder that your payment of ${{2}} is due on {{3}}. Please make your payment to avoid late fees.", variables: ["customer_name", "amount", "due_date"] },
  { name: "Promotional Offer", category: "marketing", body: "Hey {{1}}! Great news - we're offering {{2}}% off on all products this week! Use code {{3}} at checkout. Shop now!", variables: ["customer_name", "discount", "code"] },
  { name: "Shipping Update", category: "utility", body: "Hi {{1}}, your order #{{2}} has been shipped! Track it here: {{3}}. Expected delivery: {{4}}.", variables: ["customer_name", "order_number", "tracking_link", "delivery_date"] },
  { name: "Appointment Reminder", category: "utility", body: "Hi {{1}}, reminder: You have an appointment on {{2}} at {{3}}. Reply YES to confirm or NO to reschedule.", variables: ["customer_name", "date", "time"] },
];

export default function Templates() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", category: "marketing", body: "", headerType: "", headerContent: "", footerText: "", variables: "" });

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/containers", cid, "templates"],
    enabled: !!cid,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/templates`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "Template created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      setEditTemplate(null);
      resetForm();
      toast({ title: "Template updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/templates/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const resetForm = () => setForm({ name: "", category: "marketing", body: "", headerType: "", headerContent: "", footerText: "", variables: "" });

  const handleSubmit = () => {
    const vars = form.variables ? form.variables.split(",").map(v => v.trim()).filter(Boolean) : [];
    const data = { ...form, variables: vars };
    if (editTemplate) {
      updateMutation.mutate({ id: editTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleUsePremade = (tpl: typeof premadeTemplates[0]) => {
    setForm({ name: tpl.name, category: tpl.category, body: tpl.body, headerType: "", headerContent: "", footerText: "", variables: tpl.variables.join(", ") });
    setShowCreate(true);
  };

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-templates-title">Templates</h1>
          <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        </div>
        <Dialog open={showCreate || !!editTemplate} onOpenChange={(v) => { if (!v) { setShowCreate(false); setEditTemplate(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }} data-testid="button-create-template">
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-template-name" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body</Label>
                <Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} rows={5} data-testid="input-template-body"
                  placeholder={'Use {{1}}, {{2}} etc. for variables'} />
              </div>
              <div>
                <Label>Variables (comma separated)</Label>
                <Input value={form.variables} onChange={(e) => setForm(f => ({ ...f, variables: e.target.value }))} data-testid="input-template-variables" placeholder="customer_name, order_number" />
              </div>
              <div>
                <Label>Footer Text (optional)</Label>
                <Input value={form.footerText} onChange={(e) => setForm(f => ({ ...f, footerText: e.target.value }))} data-testid="input-template-footer" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-template">
                {editTemplate ? "Update" : "Create"} Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-templates">
        <TabsList>
          <TabsTrigger value="my-templates" data-testid="tab-my-templates">My Templates</TabsTrigger>
          <TabsTrigger value="premade" data-testid="tab-premade">Premade Library</TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>
          ) : templates.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No templates yet. Create one or use a premade template.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="p-4 hover-elevate" data-testid={`card-template-${tpl.id}`}>
                  <div className="flex items-start justify-between gap-1 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{tpl.name}</h3>
                      <Badge variant="secondary" className="text-[10px] mt-1">{tpl.category}</Badge>
                    </div>
                    <Badge variant={tpl.status === "approved" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {tpl.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{tpl.body}</p>
                  {(tpl.variables || []).length > 0 && (
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                      {(tpl.variables || []).map((v, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <Button size="icon" variant="ghost" onClick={() => setPreviewTemplate(tpl)} data-testid={`button-preview-${tpl.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditTemplate(tpl); setForm({ name: tpl.name, category: tpl.category, body: tpl.body, headerType: tpl.headerType || "", headerContent: tpl.headerContent || "", footerText: tpl.footerText || "", variables: (tpl.variables || []).join(", ") }); }} data-testid={`button-edit-${tpl.id}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(tpl.id)} data-testid={`button-delete-${tpl.id}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="premade" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {premadeTemplates.map((tpl, i) => (
              <Card key={i} className="p-4 hover-elevate" data-testid={`card-premade-${i}`}>
                <div className="flex items-start justify-between gap-1 mb-3">
                  <h3 className="font-medium text-sm">{tpl.name}</h3>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{tpl.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{tpl.body}</p>
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {tpl.variables.map((v, vi) => (
                    <Badge key={vi} variant="outline" className="text-[10px]">{v}</Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleUsePremade(tpl)} data-testid={`button-use-premade-${i}`}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Use This Template
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 max-w-sm mx-auto">
                <div className="rounded-xl bg-primary text-primary-foreground p-4">
                  <p className="text-sm whitespace-pre-wrap">{previewTemplate.body}</p>
                  {previewTemplate.footerText && (
                    <p className="text-[10px] mt-2 text-primary-foreground/70">{previewTemplate.footerText}</p>
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Variables: {(previewTemplate.variables || []).join(", ") || "None"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
