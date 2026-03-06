import { useQuery } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare, Megaphone, ShoppingCart, TrendingUp, Clock, Send, Zap } from "lucide-react";
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
        <h2 className="text-xl font-semibold" data-testid="text-no-workspace">Welcome to WA CRM</h2>
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
