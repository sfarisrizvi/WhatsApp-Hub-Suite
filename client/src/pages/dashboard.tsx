import { useQuery } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Megaphone, ShoppingCart, TrendingUp, Clock, Send, Zap, AlertTriangle, CreditCard, RefreshCw, ExternalLink } from "lucide-react";
import type { Contact, Campaign, Conversation, Order } from "@shared/schema";

export default function Dashboard() {
  const { activeContainer } = useContainer();
  const [, navigate] = useLocation();
  const cid = activeContainer?.id;

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/containers", cid, "campaigns"],
    enabled: !!cid,
  });

  const { data: conversations = [], isLoading: loadingConvos } = useQuery<(Conversation & { contact: Contact | null })[]>({
    queryKey: ["/api/containers", cid, "conversations"],
    enabled: !!cid,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/containers", cid, "orders"],
    enabled: !!cid,
  });

  const { data: billingStatus, refetch: refetchBilling, isFetching: fetchingBilling } = useQuery<{
    isConfigured: boolean;
    hasPaymentMethod: boolean;
    primaryFundingId: string | null;
    purchaseOrderNumber: string | null;
    accountReviewStatus: string | null;
    qualityRating: string | null;
    phoneStatus: string | null;
    billingDirectUrl: string;
    message: string;
  }>({
    queryKey: ["/api/containers", cid, "billing-status"],
    enabled: !!cid && !!activeContainer?.isConfigured,
    staleTime: 60 * 1000,
  });

  const isLoading = loadingContacts || loadingCampaigns || loadingConvos;
  const openConvos = conversations.filter(c => c.status === "open").length;
  const activeCampaigns = campaigns.filter(c => c.status === "sent" || c.status === "sending").length;

  const stats = [
    { label: "Total Contacts", value: contacts.length, icon: Users, color: "text-primary" },
    { label: "Open Conversations", value: openConvos, icon: MessageSquare, color: "text-blue-500" },
    { label: "Active Campaigns", value: activeCampaigns, icon: Megaphone, color: "text-orange-500" },
    { label: "Total Orders", value: orders.length, icon: ShoppingCart, color: "text-purple-500" },
  ];

  if (!activeContainer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold" data-testid="text-no-workspace">Welcome to Whatlify</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Create your first workspace to start managing your WhatsApp Business communications.
        </p>
        <a href="/settings?tab=containers">
          <Badge variant="default" className="cursor-pointer">Create Workspace</Badge>
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{activeContainer.businessName || activeContainer.name} overview</p>
      </div>

      {activeContainer?.isConfigured && billingStatus && !billingStatus.hasPaymentMethod && (
        <Card className="border-amber-400 bg-amber-50/80 dark:bg-amber-950/30 p-4 shadow-sm" data-testid="banner-billing-warning">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                    Action Required: Add Payment Method in Meta
                  </h3>
                  <Badge variant="outline" className="text-amber-700 border-amber-300 dark:border-amber-700 dark:text-amber-300 text-[10px] font-normal">
                    Meta Requirement
                  </Badge>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 max-w-2xl leading-relaxed">
                  Your WhatsApp Business Account does not have a credit/debit card attached. Meta will block outbound messages, campaigns, and broadcasts (Error #131031) until a payment method is linked.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBilling()}
                disabled={fetchingBilling}
                className="text-xs h-8 bg-white/90 dark:bg-background border-amber-300 dark:border-amber-800"
                data-testid="button-refresh-billing"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetchingBilling ? "animate-spin" : ""}`} />
                Check Status
              </Button>
              <a
                href={billingStatus.billingDirectUrl || "https://business.facebook.com/billing_hub/accounts"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                  data-testid="button-attach-card"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Attach Card in Meta
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5 hover-elevate" data-testid={`card-stat-${i}`}>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-1 mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" data-testid="card-recent-conversations">
          <div className="flex items-center justify-between gap-1 mb-4">
            <h3 className="font-semibold">Recent Conversations</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No conversations yet</p>
          ) : (
            <div className="space-y-3">
              {conversations.slice(0, 5).map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between gap-2 py-2 border-b last:border-0 cursor-pointer hover-elevate rounded-md px-2"
                  data-testid={`link-conversation-${conv.id}`}
                  onClick={() => navigate(`/inbox?conversation=${conv.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {conv.contact?.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{conv.contact?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{conv.contact?.phone}</p>
                    </div>
                  </div>
                  <Badge variant={conv.status === "open" ? "default" : "secondary"} className="shrink-0">
                    {conv.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5" data-testid="card-recent-campaigns">
          <div className="flex items-center justify-between gap-1 mb-4">
            <h3 className="font-semibold">Campaign Performance</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No campaigns yet</p>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => {
                const total = campaign.totalRecipients || 1;
                const deliveryRate = Math.round(((campaign.delivered || 0) / total) * 100);
                return (
                  <div
                    key={campaign.id}
                    className="py-2 border-b last:border-0 cursor-pointer hover-elevate rounded-md px-2"
                    data-testid={`link-campaign-${campaign.id}`}
                    onClick={() => navigate("/campaigns")}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-sm font-medium truncate">{campaign.name}</p>
                      <Badge variant="secondary" className="shrink-0">{campaign.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Send className="h-3 w-3" /> {campaign.delivered || 0} delivered
                      </span>
                      <span>{deliveryRate}% rate</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
