import { useQuery } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { BarChart3, Send, Eye, MessageSquare, TrendingUp } from "lucide-react";
import type { Campaign, Contact, Conversation } from "@shared/schema";

const COLORS = ["hsl(142, 76%, 36%)", "hsl(173, 70%, 35%)", "hsl(197, 71%, 35%)", "hsl(221, 83%, 35%)", "hsl(280, 68%, 35%)"];

export default function Analytics() {
  const { activeContainer } = useContainer();
  const cid = activeContainer?.id;

  const { data: campaigns = [], isLoading: lc } = useQuery<Campaign[]>({
    queryKey: ["/api/containers", cid, "campaigns"],
    enabled: !!cid,
  });

  const { data: contacts = [], isLoading: lco } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const { data: conversations = [] } = useQuery<(Conversation & { contact: Contact | null })[]>({
    queryKey: ["/api/containers", cid, "conversations"],
    enabled: !!cid,
  });

  const isLoading = lc || lco;

  const sentCampaigns = campaigns.filter(c => c.status === "sent");
  const totalDelivered = sentCampaigns.reduce((s, c) => s + (c.delivered || 0), 0);
  const totalRead = sentCampaigns.reduce((s, c) => s + (c.read || 0), 0);
  const totalReplied = sentCampaigns.reduce((s, c) => s + (c.replied || 0), 0);
  const totalRecipients = sentCampaigns.reduce((s, c) => s + (c.totalRecipients || 0), 0);

  const campaignChartData = sentCampaigns.map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "..." : c.name,
    delivered: c.delivered || 0,
    read: c.read || 0,
    replied: c.replied || 0,
  }));

  const statusData = [
    { name: "Open", value: conversations.filter(c => c.status === "open").length },
    { name: "Pending", value: conversations.filter(c => c.status === "pending").length },
    { name: "Closed", value: conversations.filter(c => c.status === "closed").length },
  ].filter(d => d.value > 0);

  const tagDistribution = (() => {
    const tagCounts: Record<string, number> = {};
    contacts.forEach(c => (c.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    return Object.entries(tagCounts).map(([name, value]) => ({ name, value })).slice(0, 8);
  })();

  const engagementData = sentCampaigns.map(c => {
    const total = c.totalRecipients || 1;
    return {
      name: c.name.length > 10 ? c.name.slice(0, 10) + "..." : c.name,
      delivery: Math.round(((c.delivered || 0) / total) * 100),
      read: Math.round(((c.read || 0) / total) * 100),
      reply: Math.round(((c.replied || 0) / total) * 100),
    };
  });

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Analytics</h1>
        <p className="text-sm text-muted-foreground">Campaign performance and engagement metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Sent", value: totalRecipients, icon: Send, color: "text-primary" },
          { label: "Delivered", value: totalDelivered, icon: TrendingUp, color: "text-blue-500" },
          { label: "Read", value: totalRead, icon: Eye, color: "text-purple-500" },
          { label: "Replied", value: totalReplied, icon: MessageSquare, color: "text-orange-500" },
        ].map((stat, i) => (
          <Card key={i} className="p-4 hover-elevate" data-testid={`card-metric-${i}`}>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                {totalRecipients > 0 && stat.label !== "Total Sent" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((stat.value / totalRecipients) * 100)}% rate
                  </p>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" data-testid="chart-campaign-performance">
          <h3 className="font-semibold mb-4">Campaign Performance</h3>
          {campaignChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No campaign data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="delivered" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="read" fill="hsl(197, 71%, 35%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="replied" fill="hsl(280, 68%, 35%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5" data-testid="chart-engagement-rates">
          <h3 className="font-semibold mb-4">Engagement Rates (%)</h3>
          {engagementData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No engagement data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="delivery" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ fill: "hsl(142, 76%, 36%)" }} />
                <Line type="monotone" dataKey="read" stroke="hsl(197, 71%, 35%)" strokeWidth={2} dot={{ fill: "hsl(197, 71%, 35%)" }} />
                <Line type="monotone" dataKey="reply" stroke="hsl(280, 68%, 35%)" strokeWidth={2} dot={{ fill: "hsl(280, 68%, 35%)" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" data-testid="chart-conversation-status">
          <h3 className="font-semibold mb-4">Conversation Status</h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No conversation data</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5" data-testid="chart-tag-distribution">
          <h3 className="font-semibold mb-4">Contact Tags Distribution</h3>
          {tagDistribution.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No tag data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tagDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
