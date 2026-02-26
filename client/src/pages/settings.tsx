import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useContainer } from "@/lib/container-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon, User, Box, Users, Plus, Trash2, Shield,
  Phone, Globe, Key, CheckCircle, AlertCircle, ArrowRight, HelpCircle,
} from "lucide-react";
import type { Container, ContainerMember } from "@shared/schema";

export default function Settings() {
  const { user } = useAuth();
  const { activeContainer, setActiveContainer } = useContainer();
  const { toast } = useToast();
  const [showCreateContainer, setShowCreateContainer] = useState(false);
  const [containerForm, setContainerForm] = useState({ name: "", phoneNumber: "", businessName: "" });
  const [apiForm, setApiForm] = useState({ apiKey: "", apiEndpoint: "" });
  const [setupStep, setSetupStep] = useState(0);

  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get("tab") || "profile";

  const { data: containers = [], isLoading } = useQuery<Container[]>({
    queryKey: ["/api/containers"],
    enabled: !!user,
  });

  const { data: members = [] } = useQuery<ContainerMember[]>({
    queryKey: ["/api/containers", activeContainer?.id, "members"],
    enabled: !!activeContainer?.id,
  });

  const createContainerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/containers", data);
      return res.json();
    },
    onSuccess: (container) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      setActiveContainer(container);
      setShowCreateContainer(false);
      setContainerForm({ name: "", phoneNumber: "", businessName: "" });
      toast({ title: "Workspace created" });
    },
  });

  const updateContainerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/containers/${id}`, data);
      return res.json();
    },
    onSuccess: (container) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      setActiveContainer(container);
      toast({ title: "Workspace updated" });
    },
  });

  const deleteContainerMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/containers/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      setActiveContainer(null);
      toast({ title: "Workspace deleted" });
    },
  });

  useEffect(() => {
    if (activeContainer) {
      setApiForm({
        apiKey: activeContainer.apiKey || "",
        apiEndpoint: activeContainer.apiEndpoint || "",
      });
    }
  }, [activeContainer]);

  const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U" : "U";

  const setupSteps = [
    { title: "Create WhatsApp Business Account", desc: "Go to Meta Business Suite and create a Business Account if you don't have one." },
    { title: "Set Up WhatsApp Business API", desc: "Navigate to Meta for Developers and create a WhatsApp Business app." },
    { title: "Generate API Token", desc: "In your app dashboard, generate a permanent access token for the WhatsApp Business API." },
    { title: "Configure Webhook", desc: "Set up a webhook URL to receive incoming messages. Use your server's webhook endpoint." },
    { title: "Connect to WA CRM", desc: "Enter your API key and endpoint below to connect your WhatsApp Business account." },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, workspaces, and integrations</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-3.5 w-3.5 mr-1" /> Profile
          </TabsTrigger>
          <TabsTrigger value="containers" data-testid="tab-containers">
            <Box className="h-3.5 w-3.5 mr-1" /> Workspaces
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="h-3.5 w-3.5 mr-1" /> Team
          </TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">
            <Key className="h-3.5 w-3.5 mr-1" /> API Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Profile Information</h3>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.profileImageUrl || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold" data-testid="text-user-name">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>First Name</Label>
                <Input value={user?.firstName || ""} disabled />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={user?.lastName || ""} disabled />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Profile information is managed through your Replit account.</p>
          </Card>
        </TabsContent>

        <TabsContent value="containers" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold">Your Workspaces</h3>
            <Dialog open={showCreateContainer} onOpenChange={setShowCreateContainer}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-workspace">
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Workspace</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Workspace Name</Label>
                    <Input value={containerForm.name} onChange={(e) => setContainerForm(f => ({ ...f, name: e.target.value }))} data-testid="input-workspace-name" placeholder="My Business" />
                  </div>
                  <div>
                    <Label>Business Name</Label>
                    <Input value={containerForm.businessName} onChange={(e) => setContainerForm(f => ({ ...f, businessName: e.target.value }))} data-testid="input-business-name" />
                  </div>
                  <div>
                    <Label>WhatsApp Phone Number</Label>
                    <Input value={containerForm.phoneNumber} onChange={(e) => setContainerForm(f => ({ ...f, phoneNumber: e.target.value }))} data-testid="input-phone-number" placeholder="+1234567890" />
                  </div>
                  <Button className="w-full" onClick={() => createContainerMutation.mutate(containerForm)} disabled={createContainerMutation.isPending} data-testid="button-save-workspace">
                    Create Workspace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : containers.length === 0 ? (
            <Card className="p-8 text-center">
              <Box className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No workspaces yet. Create your first workspace to get started.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {containers.map((container) => (
                <Card key={container.id} className="p-4" data-testid={`card-workspace-${container.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Box className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{container.name}</p>
                          {activeContainer?.id === container.id && <Badge variant="default" className="text-[10px]">Active</Badge>}
                          {container.isConfigured ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Not configured
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {container.phoneNumber && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {container.phoneNumber}</span>}
                          {container.businessName && <span className="text-xs text-muted-foreground">{container.businessName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveContainer(container)} data-testid={`button-activate-${container.id}`}>
                        Switch
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteContainerMutation.mutate(container.id)} data-testid={`button-delete-workspace-${container.id}`}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Team Members</h3>
            {!activeContainer ? (
              <p className="text-sm text-muted-foreground">Select a workspace to manage team members.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Manage who has access to the "{activeContainer.name}" workspace.
                </p>
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.userId}</p>
                        <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-2">Role Permissions</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><strong>Admin:</strong> Full access - manage workspace, team, contacts, campaigns, and settings</p>
                    <p><strong>Agent:</strong> Can manage contacts, conversations, and campaigns. Cannot modify workspace settings.</p>
                    <p><strong>Viewer:</strong> Read-only access to all data. Cannot create or modify anything.</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold">WhatsApp Business API Setup Guide</h3>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {setupSteps.map((step, i) => (
                <div key={i} className="flex gap-3" data-testid={`setup-step-${i}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                    i <= setupStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {i < setupStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${i <= setupStep ? "" : "text-muted-foreground"}`}>{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    {i === setupStep && i < setupSteps.length - 1 && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => setSetupStep(i + 1)} data-testid={`button-next-step-${i}`}>
                        Next <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {activeContainer && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">API Configuration - {activeContainer.name}</h3>
              <div className="space-y-4">
                <div>
                  <Label>API Key / Access Token</Label>
                  <Input
                    type="password"
                    value={apiForm.apiKey}
                    onChange={(e) => setApiForm(f => ({ ...f, apiKey: e.target.value }))}
                    data-testid="input-api-key"
                    placeholder="Enter your WhatsApp Business API token"
                  />
                </div>
                <div>
                  <Label>API Endpoint</Label>
                  <Input
                    value={apiForm.apiEndpoint}
                    onChange={(e) => setApiForm(f => ({ ...f, apiEndpoint: e.target.value }))}
                    data-testid="input-api-endpoint"
                    placeholder="https://graph.facebook.com/v18.0/"
                  />
                </div>
                <Button onClick={() => {
                  updateContainerMutation.mutate({
                    id: activeContainer.id,
                    data: { ...apiForm, isConfigured: !!(apiForm.apiKey && apiForm.apiEndpoint) },
                  });
                  setSetupStep(5);
                }} disabled={updateContainerMutation.isPending} data-testid="button-save-api">
                  <Key className="h-3.5 w-3.5 mr-1" /> Save Configuration
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
