import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useContainer } from "@/lib/container-context";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadFacebookSDK, launchWhatsAppSignup } from "@/lib/facebook-sdk";
import type { Container } from "@shared/schema";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2, ArrowRight, ShieldCheck, Zap, MessageSquare, CreditCard,
  Copy, ExternalLink, RefreshCw, AlertTriangle, Sparkles, Building2, PhoneCall
} from "lucide-react";
import { SiFacebook, SiWhatsapp } from "react-icons/si";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { activeContainer, setActiveContainer } = useContainer();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("Initializing Facebook SDK...");
  const [progressPercent, setProgressPercent] = useState<number>(10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [connectionResult, setConnectionResult] = useState<{
    phoneNumber?: string;
    verifiedName?: string;
    hasPaymentMethod?: boolean;
    primaryFundingId?: string | null;
    billingDirectUrl?: string;
    isPermanentToken?: boolean;
  } | null>(null);

  const [inviteLinks, setInviteLinks] = useState<{
    onboardingUrl?: string;
    metaHostedUrl?: string | null;
  } | null>(null);

  // If container is already configured, default to step 3
  useEffect(() => {
    if (activeContainer?.isConfigured && step === 1 && !connectionResult) {
      setConnectionResult({
        phoneNumber: activeContainer.phoneNumber || undefined,
        verifiedName: activeContainer.businessName || activeContainer.name,
      });
      setStep(3);
    }
  }, [activeContainer]);

  // Fetch shareable invite links for this container
  const fetchInviteLinkMutation = useMutation({
    mutationFn: async (cid: string) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/generate-invite-link`);
      return res.json();
    },
    onSuccess: (data) => {
      setInviteLinks(data);
    },
  });

  useEffect(() => {
    if (activeContainer?.id) {
      fetchInviteLinkMutation.mutate(activeContainer.id);
    }
  }, [activeContainer?.id]);

  const handleLaunchSignup = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    setStep(2);
    setProgressPercent(20);
    setProgressStage("Connecting to Meta Platform...");

    try {
      const configRes = await fetch("/api/whatsapp/app-config");
      if (!configRes.ok) {
        throw new Error("Meta App configuration is missing on the server. Please check META_APP_ID & META_CONFIG_ID.");
      }
      const { appId, configId } = await configRes.json();

      setProgressPercent(35);
      setProgressStage("Loading Meta Embedded Signup Dialog...");
      await loadFacebookSDK(appId);

      setProgressPercent(50);
      setProgressStage("Waiting for WhatsApp account approval...");
      const result = await launchWhatsAppSignup(configId);

      setProgressPercent(75);
      setProgressStage("Registering Cloud API Phone & Attaching Webhooks...");

      const res = await apiRequest("POST", "/api/whatsapp/embedded-signup", {
        code: result.code,
        phoneNumberId: result.phoneNumberId,
        wabaId: result.wabaId,
        containerId: activeContainer?.id,
      });

      const data = await res.json();

      if (data.success) {
        setProgressPercent(100);
        setProgressStage("Ready! WhatsApp connection verified.");

        queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
        if (data.container) {
          setActiveContainer(data.container);
        }

        setConnectionResult({
          phoneNumber: data.phoneNumber || result.phoneNumberId,
          verifiedName: data.verifiedName,
          hasPaymentMethod: data.hasPaymentMethod,
          primaryFundingId: data.primaryFundingId,
          billingDirectUrl: data.billingDirectUrl,
          isPermanentToken: data.isPermanentToken,
        });

        toast({
          title: "WhatsApp Connected!",
          description: `${data.verifiedName || "Your business"} is now live on WhatsApp Cloud API.`,
        });

        setTimeout(() => {
          setStep(3);
          setIsConnecting(false);
        }, 800);
      } else {
        throw new Error(data.message || "Failed to configure WhatsApp container");
      }
    } catch (err: any) {
      setIsConnecting(false);
      if (err.message === "Login cancelled or not fully authorized") {
        setErrorMsg("Meta signup was closed before completing. You can try again anytime.");
      } else {
        setErrorMsg(err.message || "An unexpected error occurred during signup.");
      }
      setStep(1);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard!` });
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Zero-Friction Client Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Connect Your WhatsApp Business
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Get your brand live on the official Meta WhatsApp Cloud API in under 3 minutes with zero technical setup.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${step >= 1 ? "bg-card border-primary/40 shadow-sm" : "opacity-40"}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step > 1 ? "bg-emerald-500 text-white" : step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <span className="text-xs font-medium">1. Grant Access</span>
          </div>

          <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${step >= 2 ? "bg-card border-primary/40 shadow-sm" : "opacity-40"}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step > 2 ? "bg-emerald-500 text-white" : step === 2 ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`}>
              {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </div>
            <span className="text-xs font-medium">2. Auto-Config</span>
          </div>

          <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${step === 3 ? "bg-card border-emerald-500/40 shadow-sm" : "opacity-40"}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? "bg-emerald-500 text-white" : "bg-muted"}`}>
              {step === 3 ? <CheckCircle2 className="h-4 w-4" /> : "3"}
            </div>
            <span className="text-xs font-medium">3. Live Inbox</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Incomplete</AlertTitle>
            <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: Launch Facebook Signup */}
        {step === 1 && (
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2">
                <SiWhatsapp className="h-8 w-8 text-emerald-500" />
              </div>
              <CardTitle className="text-xl">Authorize Whatlify on Meta</CardTitle>
              <CardDescription>
                Workspace: <span className="font-semibold text-foreground">{activeContainer?.name || "Default Workspace"}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30 flex flex-col items-center text-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-semibold">Official Cloud API</span>
                  <span className="text-[11px] text-muted-foreground">Direct connection to Meta's secure infrastructure.</span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 flex flex-col items-center text-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-semibold">Instant Webhooks</span>
                  <span className="text-[11px] text-muted-foreground">Inbound & outbound messages synced in real-time.</span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 flex flex-col items-center text-center gap-2">
                  <CreditCard className="h-5 w-5 text-sky-500" />
                  <span className="text-xs font-semibold">Direct Billing</span>
                  <span className="text-[11px] text-muted-foreground">Pay Meta directly at official rates with zero markups.</span>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What you will need in the Meta popup:
                </h4>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    A phone number that can receive an SMS OTP (cannot be currently registered to personal WhatsApp app).
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    Your Business Name (e.g., XYZ Clothing) and Category.
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    A payment card attached in Meta Business Suite to unlock outbound template broadcasts.
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-md flex items-center justify-center gap-3"
                  onClick={handleLaunchSignup}
                  disabled={isConnecting}
                >
                  <SiFacebook className="h-5 w-5" />
                  Connect WhatsApp with Facebook
                </Button>
              </div>

              {/* Shareable Direct Link Option */}
              {inviteLinks?.onboardingUrl && (
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Onboarding a client brand remotely?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs text-primary underline underline-offset-2 hover:bg-transparent"
                      onClick={() => copyToClipboard(inviteLinks.onboardingUrl!, "Client Onboarding Link")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Shareable Onboarding Link
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Connecting & Real-time Progress */}
        {step === 2 && (
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 animate-spin">
                <RefreshCw className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Configuring Your Business Hub</CardTitle>
              <CardDescription>
                Please follow the prompts in the Meta popup window.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 py-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">{progressStage}</span>
                  <span className="text-primary font-bold">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2.5 w-2.5 rounded-full ${progressPercent >= 35 ? "bg-emerald-500" : "bg-muted-foreground/30 animate-pulse"}`} />
                  <span className={progressPercent >= 35 ? "font-medium text-foreground" : "text-muted-foreground"}>
                    Meta SDK Initialized
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2.5 w-2.5 rounded-full ${progressPercent >= 50 ? "bg-emerald-500" : "bg-muted-foreground/30 animate-pulse"}`} />
                  <span className={progressPercent >= 50 ? "font-medium text-foreground" : "text-muted-foreground"}>
                    WhatsApp Account & Permissions Approved
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2.5 w-2.5 rounded-full ${progressPercent >= 75 ? "bg-emerald-500" : "bg-muted-foreground/30 animate-pulse"}`} />
                  <span className={progressPercent >= 75 ? "font-medium text-foreground" : "text-muted-foreground"}>
                    Cloud API Phone & Real-Time Webhooks Configured
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2.5 w-2.5 rounded-full ${progressPercent === 100 ? "bg-emerald-500" : "bg-muted-foreground/30 animate-pulse"}`} />
                  <span className={progressPercent === 100 ? "font-medium text-foreground" : "text-muted-foreground"}>
                    Permanent Tech Provider Routing Active
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Don't see the popup? Ensure your browser pop-up blocker is disabled for this site.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Success & Next Actions */}
        {step === 3 && (
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl text-foreground font-bold">
                WhatsApp Business is Live!
              </CardTitle>
              <CardDescription>
                Your workspace is fully connected and ready to send and receive messages.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Account Details Badge Card */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {connectionResult?.verifiedName || activeContainer?.businessName || activeContainer?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <PhoneCall className="h-3 w-3" />
                        {connectionResult?.phoneNumber || activeContainer?.phoneNumber || "Phone Active"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium self-start sm:self-auto">
                    ● Connected & Online
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">Quality Rating</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">High (Green)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <span className="text-muted-foreground block text-[11px]">Webhooks</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Auto-Subscribed</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[11px]">Token Longevity</span>
                    <span className="font-semibold text-foreground">Permanent (Tech Provider)</span>
                  </div>
                </div>
              </div>

              {/* Billing Alert if no payment method attached */}
              {connectionResult?.hasPaymentMethod === false && (
                <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-sm font-semibold">Payment Method Notice</AlertTitle>
                  <AlertDescription className="text-xs mt-1 space-y-2">
                    <p>
                      Meta requires an active payment card attached to your WhatsApp account before outbound broadcast templates can be sent.
                    </p>
                    <a
                      href={connectionResult?.billingDirectUrl || "https://business.facebook.com/billing_hub/accounts"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                    >
                      Attach Payment Card in Meta Business Suite <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {/* Next Action CTAs */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <Button
                  size="lg"
                  className="w-full gap-2 font-semibold"
                  onClick={() => setLocation("/inbox")}
                >
                  <MessageSquare className="h-4 w-4" />
                  Open Team Inbox
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 font-semibold"
                  onClick={() => setLocation("/")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>

            <CardFooter className="justify-center border-t py-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/settings")}
              >
                Advanced WhatsApp Settings
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
