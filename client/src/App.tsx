import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ContainerProvider } from "@/lib/container-context";
import { WSProvider } from "@/lib/ws-context";
import { useAuth } from "@/hooks/use-auth";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@shared/schema";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Contacts from "@/pages/contacts";
import Templates from "@/pages/templates";
import Campaigns from "@/pages/campaigns";
import Automations from "@/pages/automations";
import Pipeline from "@/pages/pipeline";
import Orders from "@/pages/orders";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";

function NotificationBell() {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unread = notifications.filter(n => !n.isRead).length;

  const markAllMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/notifications/read-all"); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }); },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center justify-between gap-1 p-2 border-b">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => markAllMutation.mutate()} data-testid="button-mark-all-read">
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
              <span className={`text-sm ${n.isRead ? "text-muted-foreground" : "font-medium"}`}>{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.body}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ContainerProvider>
      <WSProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-1 h-14 px-4 border-b shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <NotificationBell />
              </header>
              <main className="flex-1 overflow-hidden">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/inbox" component={Inbox} />
                  <Route path="/contacts" component={Contacts} />
                  <Route path="/templates" component={Templates} />
                  <Route path="/campaigns" component={Campaigns} />
                  <Route path="/automations" component={Automations} />
                  <Route path="/pipeline" component={Pipeline} />
                  <Route path="/orders" component={Orders} />
                  <Route path="/analytics" component={Analytics} />
                  <Route path="/settings" component={Settings} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </WSProvider>
    </ContainerProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route><Landing /></Route>
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
