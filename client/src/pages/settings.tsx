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
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Settings as SettingsIcon, User, Box, Users, Plus, Trash2, Shield,
  Phone, Globe, Key, CheckCircle, AlertCircle, ArrowRight, HelpCircle,
  Copy, ExternalLink, Loader2, Wifi, WifiOff, MessageSquare, ChevronDown, Unplug,
} from "lucide-react";
import { SiFacebook } from "react-icons/si";
import type { Container, ContainerMember } from "@shared/schema";
import { loadFacebookSDK, launchWhatsAppSignup } from "@/lib/facebook-sdk";

export default function Settings() {
  const { user } = useAuth();
  const { activeContainer, setActiveContainer } = useContainer();
  const { toast } = useToast();
  const [showCreateContainer, setShowCreateContainer] = useState(false);
  const [containerForm, setContainerForm] = useState({ name: "", phoneNumber: "", businessName: "" });
  const [apiForm, setApiForm] = useState({
    apiKey: "", apiEndpoint: "", phoneNumberId: "", wabaId: "", appSecret: "", webhookVerifyToken: "",
  });
  const [setupStep, setSetupStep] = useState(0);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; verifiedName?: string; phoneNumber?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [embeddedSignupResult, setEmbeddedSignupResult] = useState<{ success: boolean; phoneNumber?: string; verifiedName?: string; error?: string } | null>(null);

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
        apiEndpoint: activeContainer.apiEndpoint || "https://graph.facebook.com/v18.0/",
        phoneNumberId: activeContainer.phoneNumberId || "",
        wabaId: activeContainer.wabaId || "",
        appSecret: activeContainer.appSecret || "",
        webhookVerifyToken: activeContainer.webhookVerifyToken || crypto.randomUUID().replace(/-/g, "").slice(0, 24),
      });
      setTestResult(null);
    }
  }, [activeContainer]);

  const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U" : "U";

  const webhookUrl = `${window.location.origin}/api/webhook`;

  const testConnection = async () => {
    if (!activeContainer) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiRequest("POST", `/api/containers/${activeContainer.id}/test-connection`);
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    }
    setIsTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleEmbeddedSignup = async () => {
    setIsConnecting(true);
    setEmbeddedSignupResult(null);
    try {
      const configRes = await fetch("/api/whatsapp/app-config");
      if (!configRes.ok) {
        throw new Error("WhatsApp Embedded Signup is not configured on this server");
      }
      const { appId, configId } = await configRes.json();

      await loadFacebookSDK(appId);
      const result = await launchWhatsAppSignup(configId);

      const res = await apiRequest("POST", "/api/whatsapp/embedded-signup", {
        code: result.code,
        phoneNumberId: result.phoneNumberId,
        wabaId: result.wabaId,
        containerId: activeContainer?.id,
      });
      const data = await res.json();

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
        setActiveContainer(data.container);
        setEmbeddedSignupResult({
          success: true,
          phoneNumber: data.phoneNumber,
          verifiedName: data.verifiedName,
        });
        toast({ title: "WhatsApp Business connected successfully!" });
      } else {
        setEmbeddedSignupResult({ success: false, error: data.message || "Setup failed" });
      }
    } catch (e: any) {
      if (e.message !== "Login cancelled or not fully authorized") {
        setEmbeddedSignupResult({ success: false, error: e.message });
      }
    }
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    if (!activeContainer) return;
    updateContainerMutation.mutate({
      id: activeContainer.id,
      data: {
        apiKey: null, apiEndpoint: null, phoneNumberId: null, wabaId: null,
        appSecret: null, webhookVerifyToken: null, isConfigured: false,
        phoneNumber: null, businessName: null,
      },
    });
    setEmbeddedSignupResult(null);
    setTestResult(null);
    toast({ title: "WhatsApp Business disconnected" });
  };

  const setupSteps = [
    {
      title: "Create Meta Business Account",
      desc: "Go to business.facebook.com and create a Business Account. This is required to access the WhatsApp Business Platform.",
      link: "https://business.facebook.com/",
    },
    {
      title: "Create WhatsApp Business App",
      desc: "In Meta for Developers, create a new app and select 'Business' type. Then add the 'WhatsApp' product to your app.",
      link: "https://developers.facebook.com/apps/",
    },
    {
      title: "Get API Credentials",
      desc: "In your app dashboard under WhatsApp > API Setup, find your Phone Number ID and generate a permanent System User Access Token. Under Settings > Basic, copy your App Secret.",
      link: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    },
    {
      title: "Configure Webhook in Meta",
      desc: `In your app's WhatsApp > Configuration, set the Callback URL and Verify Token. Subscribe to 'messages' and 'message_status' webhook fields.`,
      webhookUrl,
    },
    {
      title: "Enter Credentials Below",
      desc: "Fill in all the fields in the API Configuration form below and save. Then use 'Test Connection' to verify everything works.",
    },
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
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#25D366]" />
              </div>
              <div>
                <h3 className="font-semibold">Connect WhatsApp Business</h3>
                <p className="text-xs text-muted-foreground">Connect your WhatsApp Business account in just a few clicks</p>
              </div>
            </div>

            {activeContainer?.isConfigured ? (
              <div className="mt-4">
                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" data-testid="text-connected-status">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">WhatsApp Business Connected</p>
                        {activeContainer.businessName && (
                          <p className="text-sm text-green-700 dark:text-green-300">{activeContainer.businessName}</p>
                        )}
                        {activeContainer.phoneNumber && (
                          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {activeContainer.phoneNumber}
                          </p>
                        )}
                        {activeContainer.phoneNumberId && (
                          <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-mono">
                            Phone ID: {activeContainer.phoneNumberId}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleDisconnect} className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10" data-testid="button-disconnect">
                      <Unplug className="h-3.5 w-3.5 mr-1" /> Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm mb-3">The fastest way to get started. Click below to sign in with Facebook, choose your Business Manager, and connect your WhatsApp number — all in one step.</p>
                  <Button
                    onClick={handleEmbeddedSignup}
                    disabled={isConnecting}
                    className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
                    size="lg"
                    data-testid="button-connect-whatsapp"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <SiFacebook className="h-4 w-4 mr-2" />
                    )}
                    Connect with Facebook
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-2">You'll be asked to select a Business Portfolio, WhatsApp Business Account, and phone number.</p>
                </div>

                {embeddedSignupResult && (
                  <div className={`p-3 rounded-lg border text-sm ${embeddedSignupResult.success ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`} data-testid="text-signup-result">
                    {embeddedSignupResult.success ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Connected Successfully!</p>
                          {embeddedSignupResult.verifiedName && <p className="text-xs text-green-700 dark:text-green-300">Business: {embeddedSignupResult.verifiedName}</p>}
                          {embeddedSignupResult.phoneNumber && <p className="text-xs text-green-700 dark:text-green-300">Phone: {embeddedSignupResult.phoneNumber}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-200">Setup Failed</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{embeddedSignupResult.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Collapsible open={showManualSetup} onOpenChange={setShowManualSetup}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground" data-testid="button-toggle-manual-setup">
                <span className="flex items-center gap-2 text-sm">
                  <Key className="h-3.5 w-3.5" />
                  Manual Setup (Advanced)
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showManualSetup ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 mt-4">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Step-by-Step Setup Guide</h3>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  {setupSteps.map((step: any, i: number) => (
                    <div key={i} className="flex gap-3" data-testid={`setup-step-${i}`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                        i <= setupStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {i < setupStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${i <= setupStep ? "" : "text-muted-foreground"}`}>{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                        {step.link && (
                          <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1" data-testid={`link-step-${i}`}>
                            <ExternalLink className="h-3 w-3" /> Open Documentation
                          </a>
                        )}
                        {step.webhookUrl && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate" data-testid="text-webhook-url">{step.webhookUrl}</code>
                              <Button size="sm" variant="outline" onClick={() => copyToClipboard(step.webhookUrl)} data-testid="button-copy-webhook">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Verify Token:</span>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono" data-testid="text-verify-token">{apiForm.webhookVerifyToken || "Save config first"}</code>
                              {apiForm.webhookVerifyToken && (
                                <Button size="sm" variant="outline" onClick={() => copyToClipboard(apiForm.webhookVerifyToken)} data-testid="button-copy-verify-token">
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Subscribe to: <strong>messages</strong>, <strong>message_status</strong></p>
                          </div>
                        )}
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Phone Number ID</Label>
                        <Input
                          value={apiForm.phoneNumberId}
                          onChange={(e) => setApiForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                          data-testid="input-phone-number-id"
                          placeholder="e.g. 110123456789012345"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Found in WhatsApp &gt; API Setup in your Meta app dashboard</p>
                      </div>
                      <div>
                        <Label>WhatsApp Business Account ID (WABA ID)</Label>
                        <Input
                          value={apiForm.wabaId}
                          onChange={(e) => setApiForm(f => ({ ...f, wabaId: e.target.value }))}
                          data-testid="input-waba-id"
                          placeholder="e.g. 123456789012345"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Found in Business Manager &gt; WhatsApp Accounts</p>
                      </div>
                    </div>
                    <div>
                      <Label>Permanent Access Token</Label>
                      <Input
                        type="password"
                        value={apiForm.apiKey}
                        onChange={(e) => setApiForm(f => ({ ...f, apiKey: e.target.value }))}
                        data-testid="input-api-key"
                        placeholder="System User Access Token from Meta Business Settings"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Generate a System User token with whatsapp_business_messaging permission</p>
                    </div>
                    <div>
                      <Label>App Secret</Label>
                      <Input
                        type="password"
                        value={apiForm.appSecret}
                        onChange={(e) => setApiForm(f => ({ ...f, appSecret: e.target.value }))}
                        data-testid="input-app-secret"
                        placeholder="Found in App Settings > Basic"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Used to verify incoming webhook payloads for security</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>API Endpoint</Label>
                        <Input
                          value={apiForm.apiEndpoint}
                          onChange={(e) => setApiForm(f => ({ ...f, apiEndpoint: e.target.value }))}
                          data-testid="input-api-endpoint"
                          placeholder="https://graph.facebook.com/v18.0/"
                        />
                      </div>
                      <div>
                        <Label>Webhook Verify Token</Label>
                        <Input
                          value={apiForm.webhookVerifyToken}
                          onChange={(e) => setApiForm(f => ({ ...f, webhookVerifyToken: e.target.value }))}
                          data-testid="input-webhook-verify-token"
                          placeholder="Auto-generated token"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Use this value in Meta's webhook configuration</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3 flex-wrap">
                      <Button onClick={() => {
                        const isConfigured = !!(apiForm.apiKey && apiForm.phoneNumberId && apiForm.wabaId);
                        updateContainerMutation.mutate({
                          id: activeContainer.id,
                          data: { ...apiForm, isConfigured },
                        });
                        if (isConfigured) setSetupStep(5);
                      }} disabled={updateContainerMutation.isPending} data-testid="button-save-api">
                        <Key className="h-3.5 w-3.5 mr-1" /> Save Configuration
                      </Button>
                      <Button variant="outline" onClick={testConnection} disabled={isTesting || !apiForm.phoneNumberId || !apiForm.apiKey} data-testid="button-test-connection">
                        {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wifi className="h-3.5 w-3.5 mr-1" />}
                        Test Connection
                      </Button>
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-lg border text-sm ${testResult.success ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`} data-testid="text-test-result">
                        {testResult.success ? (
                          <div className="flex items-start gap-2">
                            <Wifi className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-200">Connection Successful</p>
                              {testResult.verifiedName && <p className="text-xs text-green-700 dark:text-green-300">Business: {testResult.verifiedName}</p>}
                              {testResult.phoneNumber && <p className="text-xs text-green-700 dark:text-green-300">Phone: {testResult.phoneNumber}</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <WifiOff className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-200">Connection Failed</p>
                              <p className="text-xs text-red-700 dark:text-red-300">{testResult.error}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>
      </Tabs>
    </div>
  );
}
