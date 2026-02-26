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
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, Package, DollarSign, Truck } from "lucide-react";
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

  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-orders-title">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} orders &middot; ${(totalRevenue / 100).toLocaleString()} revenue</p>
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
                <Label>Total Amount (cents)</Label>
                <Input type="number" value={form.totalAmount} onChange={(e) => setForm(f => ({ ...f, totalAmount: e.target.value }))} data-testid="input-order-amount" />
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
                totalAmount: parseInt(form.totalAmount) || 0,
                contactId: form.contactId || null,
                items: form.items ? form.items.split(",").map(i => ({ name: i.trim() })) : [],
              })} disabled={createMutation.isPending} data-testid="button-save-order">
                Create Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 hover-elevate">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-xl font-bold">{orders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-elevate">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold">${(totalRevenue / 100).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-elevate">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{orders.filter(o => o.status === "pending" || o.status === "confirmed").length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const contact = contacts.find(c => c.id === order.contactId);
                return (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contact?.name || "-"}</TableCell>
                    <TableCell className="text-sm">${((order.totalAmount || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status || "pending")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
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
    </div>
  );
}
