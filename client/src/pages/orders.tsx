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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, Package, DollarSign, Truck, Calendar, User, MapPin, CreditCard, Hash, Activity, Trash2, Search } from "lucide-react";
import type { Order, Contact } from "@shared/schema";

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "confirmed", label: "Confirmed", color: "bg-blue-500" },
  { value: "shipped", label: "Shipped", color: "bg-purple-500" },
  { value: "delivered", label: "Delivered", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
];

export default function Orders() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ orderNumber: "", totalAmount: "", contactId: "", items: "" });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Bulk Action Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/containers", cid, "orders"],
    enabled: !!cid,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/orders`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "orders"] });
      setShowCreate(false);
      setForm({ orderNumber: "", totalAmount: "", contactId: "", items: "" });
      toast({ title: "Order created" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "orders"] });
      setSelectedOrder(null);
      toast({ title: "Order deleted" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/orders/bulk-delete", { ids: selectedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "orders"] });
      setSelectedIds([]);
      toast({ title: "Selected orders deleted" });
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("POST", "/api/orders/bulk-update-status", { ids: selectedIds, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "orders"] });
      setSelectedIds([]);
      toast({ title: "Selected orders updated" });
    },
  });

  const getStatusBadge = (status: string) => {
    const opt = statusOptions.find(s => s.value === status);
    return opt ? (
      <Badge variant={status === "delivered" ? "default" : status === "cancelled" ? "destructive" : "secondary"}>
        {opt.label}
      </Badge>
    ) : <Badge variant="secondary">{status}</Badge>;
  };

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  // Calculate Date Bounds & Search
  const filteredOrders = orders.filter(order => {
    // 1. Date Filter
    if (order.createdAt) {
      const orderDate = new Date(order.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }

    // 2. Status Filter
    if (statusFilter) {
      if (statusFilter === "pending") {
        if (order.status !== "pending" && order.status !== "confirmed") return false;
      } else if (order.status !== statusFilter) {
        return false;
      }
    }

    // 3. Search Filter (Order Number / ID, customer name, customer phone number)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const contact = contacts.find(c => c.id === order.contactId);
      
      const matchOrderNum = order.orderNumber?.toLowerCase().includes(q) || order.id?.toLowerCase().includes(q);
      const matchName = contact?.name?.toLowerCase().includes(q);
      const matchPhone = contact?.phone?.toLowerCase().includes(q);

      if (!matchOrderNum && !matchName && !matchPhone) return false;
    }

    return true;
  });

  // Calculate totals based on active date range filters
  const ordersInDateRange = orders.filter(order => {
    if (order.createdAt) {
      const orderDate = new Date(order.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }
    return true;
  });

  const totalRevenue = filteredOrders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrdersCount = ordersInDateRange.length;
  const pendingOrdersCount = ordersInDateRange.filter(o => o.status === "pending" || o.status === "confirmed").length;
  const deliveredOrdersCount = ordersInDateRange.filter(o => o.status === "delivered").length;
  const cancelledOrdersCount = ordersInDateRange.filter(o => o.status === "cancelled").length;

  // Bulk actions checkbox helper
  const isAllSelected = filteredOrders.length > 0 && selectedIds.length === filteredOrders.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map(o => o.id));
    }
  };

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full relative">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-orders-title">Orders</h1>
          <p className="text-sm text-muted-foreground">{filteredOrders.length} filtered orders &middot; PKR {(totalRevenue / 100).toLocaleString()} revenue</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-order">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Order</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Order Number</Label>
                <Input value={form.orderNumber} onChange={(e) => setForm(f => ({ ...f, orderNumber: e.target.value }))} data-testid="input-order-number" placeholder="ORD-001" />
              </div>
              <div>
                <Label>Total Amount (PKR)</Label>
                <Input type="number" value={form.totalAmount} onChange={(e) => setForm(f => ({ ...f, totalAmount: e.target.value }))} data-testid="input-order-amount" placeholder="e.g. 1500" />
              </div>
              <div>
                <Label>Contact</Label>
                <Select value={form.contactId} onValueChange={(v) => setForm(f => ({ ...f, contactId: v }))}>
                  <SelectTrigger data-testid="select-order-contact"><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Items (comma separated)</Label>
                <Input value={form.items} onChange={(e) => setForm(f => ({ ...f, items: e.target.value }))} data-testid="input-order-items" placeholder="Product A, Product B" />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate({
                orderNumber: form.orderNumber,
                totalAmount: (parseFloat(form.totalAmount) || 0) * 100, // convert PKR to cents representation
                contactId: form.contactId || null,
                items: form.items ? form.items.split(",").map(i => ({ name: i.trim() })) : [],
              })} disabled={createMutation.isPending} data-testid="button-save-order">
                Create Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Range & Search Filters Bar */}
      <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Date Range:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => {
              setStartDate(e.target.value);
              setSelectedIds([]);
            }} 
            className="h-8 w-36 text-xs bg-white" 
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => {
              setEndDate(e.target.value);
              setSelectedIds([]);
            }} 
            className="h-8 w-36 text-xs bg-white" 
          />
          
          {/* Search Toggle Button */}
          <Button
            variant={showSearch || searchQuery ? "secondary" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery(""); // clear search query on close
            }}
            title="Search Orders"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Inline Search Input */}
          {(showSearch || searchQuery) && (
            <Input
              type="text"
              placeholder="Search ID, name, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIds([]);
              }}
              className="h-8 w-48 md:w-60 text-xs bg-white animate-in slide-in-from-left-2 duration-150"
            />
          )}

          {(startDate || endDate || statusFilter || searchQuery) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setStatusFilter(null);
                setSearchQuery("");
                setShowSearch(false);
                setSelectedIds([]);
              }}
              className="h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Dashboard Grid */}
      <div className="space-y-4">
        {/* Row 1 (2 Cards) */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card 
            className={`p-5 hover-elevate transition-all border cursor-pointer ${!statusFilter ? "ring-2 ring-primary/20 bg-primary/5 border-primary/50" : ""}`}
            onClick={() => setStatusFilter(null)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">Rs. {(totalRevenue / 100).toLocaleString()}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold">PKR</Badge>
            </div>
          </Card>
          <Card 
            className={`p-5 hover-elevate transition-all border cursor-pointer ${!statusFilter ? "ring-2 ring-primary/20 bg-primary/5 border-primary/50" : ""}`}
            onClick={() => setStatusFilter(null)}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrdersCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Row 2 (3 Cards) */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card 
            className={`p-4 cursor-pointer hover-elevate transition-all border ${statusFilter === "pending" ? "ring-2 ring-yellow-500/20 bg-yellow-500/5 border-yellow-500/50" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "pending" ? null : "pending")}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-yellow-500/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending Orders</p>
                <p className="text-xl font-bold">{pendingOrdersCount}</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer hover-elevate transition-all border ${statusFilter === "delivered" ? "ring-2 ring-green-500/20 bg-green-500/5 border-green-500/50" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "delivered" ? null : "delivered")}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-green-500/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold">{deliveredOrdersCount}</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer hover-elevate transition-all border ${statusFilter === "cancelled" ? "ring-2 ring-red-500/20 bg-red-500/5 border-red-500/50" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "cancelled" ? null : "cancelled")}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Cancelled</p>
                <p className="text-xl font-bold">{cancelledOrdersCount}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bulk Action Controls Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-semibold text-primary">{selectedIds.length} orders selected</span>
          <div className="flex gap-2 items-center flex-wrap">
            <Select onValueChange={(val) => bulkUpdateStatusMutation.mutate(val)}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                if (confirm("Are you sure you want to delete the selected orders?")) {
                  bulkDeleteMutation.mutate();
                }
              }}
              className="h-8 text-xs gap-1.5"
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table List */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No orders matching your filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input 
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const contact = contacts.find(c => c.id === order.contactId);
                return (
                  <TableRow 
                    key={order.id} 
                    data-testid={`row-order-${order.id}`}
                    onClick={() => setSelectedOrder(order)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (selectedIds.includes(order.id)) {
                            setSelectedIds(selectedIds.filter(id => id !== order.id));
                          } else {
                            setSelectedIds([...selectedIds, order.id]);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contact?.name || "-"}</TableCell>
                    <TableCell className="text-sm">Rs. {((order.totalAmount || 0) / 100).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(order.status || "pending")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={order.status || "pending"} onValueChange={(v) => updateStatusMutation.mutate({ id: order.id, status: v })}>
                        <SelectTrigger className="h-8 w-28" data-testid={`select-order-status-${order.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Slideout details sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-6 pt-4">
              <SheetHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-bold tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Order Details</span>
                </div>
                <SheetTitle className="text-xl font-bold flex items-center justify-between mt-1">
                  <span>{selectedOrder.orderNumber}</span>
                  {getStatusBadge(selectedOrder.status || "pending")}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Created on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "-"}
                </SheetDescription>
              </SheetHeader>

              <hr className="border-border" />

              {/* Customer details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Customer Information
                </h3>
                {(() => {
                  const contact = contacts.find(c => c.id === selectedOrder.contactId);
                  if (!contact) return <p className="text-xs text-muted-foreground">No customer information attached</p>;
                  return (
                    <div className="bg-muted/40 rounded-lg p-3 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Name</span>
                        <span className="font-medium">{contact.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Phone</span>
                        <span className="font-medium">{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Email</span>
                          <span className="font-medium truncate max-w-[180px]">{contact.email}</span>
                        </div>
                      )}
                      {(contact.customFields as any)?.address && (
                        <div className="pt-1 border-t border-border/50">
                          <span className="text-xs text-muted-foreground block mb-1">Delivery Address</span>
                          <span className="font-medium text-xs flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{(contact.customFields as any).address}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <hr className="border-border" />

              {/* Order Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Items
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="h-9 text-xs">Item</TableHead>
                        <TableHead className="h-9 text-xs text-right w-16">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        (selectedOrder.items as any[]).map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="py-2 text-xs font-medium">{item.name || "Unknown item"}</TableCell>
                            <TableCell className="py-2 text-xs text-right font-medium">{item.quantity || 1}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="py-3 text-center text-xs text-muted-foreground">
                            No items found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <hr className="border-border" />

              {/* Order Total / Summary */}
              <div className="bg-primary/5 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Payment Method
                  </span>
                  <span className="font-medium text-xs">Cash on Delivery</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                  <span className="font-semibold text-foreground">Total Amount</span>
                  <span className="font-bold text-base text-primary">
                    Rs. {((selectedOrder.totalAmount || 0) / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-2">
                <Button 
                  variant="destructive" 
                  className="w-full gap-1.5"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this order?")) {
                      deleteMutation.mutate(selectedOrder.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete Order
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
