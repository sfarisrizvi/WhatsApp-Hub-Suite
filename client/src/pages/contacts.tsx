import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Upload, Download, Trash2, Edit, Users, Phone, Mail, Tag } from "lucide-react";
import type { Contact } from "@shared/schema";

export default function Contacts() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", tags: "" });
  const [filterTag, setFilterTag] = useState("");

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/containers", cid, "contacts"],
    enabled: !!cid,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/contacts`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "contacts"] });
      setShowAdd(false);
      setForm({ name: "", phone: "", email: "", tags: "" });
      toast({ title: "Contact created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "contacts"] });
      setEditContact(null);
      toast({ title: "Contact updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "contacts"] });
      toast({ title: "Contact deleted" });
    },
  });

  const handleSubmit = () => {
    const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    if (editContact) {
      updateMutation.mutate({ id: editContact.id, data: { ...form, tags } });
    } else {
      createMutation.mutate({ ...form, tags });
    }
  };

  const handleExportCSV = () => {
    const csv = ["Name,Phone,Email,Tags", ...contacts.map(c =>
      `"${c.name}","${c.phone}","${c.email || ""}","${(c.tags || []).join(";")}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contacts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").slice(1);
      const newContacts = lines.filter(l => l.trim()).map(line => {
        const parts = line.split(",").map(p => p.replace(/"/g, "").trim());
        return { name: parts[0] || "", phone: parts[1] || "", email: parts[2] || "", tags: parts[3] ? parts[3].split(";") : [] };
      });
      try {
        await apiRequest("POST", `/api/containers/${cid}/contacts/bulk`, { contacts: newContacts });
        queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "contacts"] });
        toast({ title: `${newContacts.length} contacts imported` });
      } catch {
        toast({ title: "Import failed", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];
  const filtered = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (filterTag && !(c.tags || []).includes(filterTag)) return false;
    return true;
  });

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-contacts-title">Contacts</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contacts total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} data-testid="input-import-csv" />
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="h-3.5 w-3.5 mr-1" /> Import</span>
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
          <Dialog open={showAdd || !!editContact} onOpenChange={(v) => { if (!v) { setShowAdd(false); setEditContact(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setShowAdd(true); setForm({ name: "", phone: "", email: "", tags: "" }); }} data-testid="button-add-contact">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-contact-name" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-contact-phone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} data-testid="input-contact-email" />
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} data-testid="input-contact-tags" placeholder="vip, new, wholesale" />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-contact"
                >
                  {editContact ? "Update" : "Create"} Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-contacts" />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant={!filterTag ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilterTag("")}
            >All</Badge>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={filterTag === tag ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                data-testid={`tag-filter-${tag}`}
              >{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">{search || filterTag ? "No contacts match your filters" : "No contacts yet"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {contact.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{contact.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" /> {contact.phone}
                    </span>
                  </TableCell>
                  <TableCell>
                    {contact.email && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" /> {contact.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(contact.tags || []).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditContact(contact);
                          setForm({
                            name: contact.name,
                            phone: contact.phone,
                            email: contact.email || "",
                            tags: (contact.tags || []).join(", "),
                          });
                        }}
                        data-testid={`button-edit-contact-${contact.id}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(contact.id)} data-testid={`button-delete-contact-${contact.id}`}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
