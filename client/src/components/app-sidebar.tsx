import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useContainer } from "@/lib/container-context";
import { useQuery } from "@tanstack/react-query";
import type { Container } from "@shared/schema";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, MessageSquare, Send, Megaphone, Zap,
  ShoppingCart, BarChart3, Settings, LogOut, ChevronDown, Box,
  Plus, Check, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/WA CRM favicon.webp";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Templates", url: "/templates", icon: Send },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Automations", url: "/automations", icon: Zap },
  { title: "Pipeline", url: "/pipeline", icon: CircleDot },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { activeContainer, setActiveContainer } = useContainer();

  const { data: containers = [] } = useQuery<Container[]>({
    queryKey: ["/api/containers"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!activeContainer && containers.length > 0) {
      const saved = localStorage.getItem("activeContainerId");
      const found = saved ? containers.find(c => c.id === saved) : null;
      setActiveContainer(found || containers[0]);
    }
  }, [containers, activeContainer, setActiveContainer]);

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logoPath} alt="WA CRM" className="h-8 w-8 rounded-md" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold" data-testid="text-app-name">WA CRM</span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]" data-testid="text-business-name">
              {activeContainer?.businessName || activeContainer?.name || "Automation Platform"}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="mt-3 w-full justify-between" data-testid="button-container-switcher">
              <span className="flex items-center gap-2 truncate">
                <Box className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate text-xs">
                  {activeContainer?.name || "Select Workspace"}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
            {containers.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => setActiveContainer(c)}
                data-testid={`menu-container-${c.id}`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="truncate text-sm">{c.name}</span>
                  {activeContainer?.id === c.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings?tab=containers&create=true" className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm">New Workspace</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2" data-testid="button-user-menu">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.profileImageUrl || ""} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {user?.firstName || user?.email || "User"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
