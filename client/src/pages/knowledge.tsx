import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useContainer } from "@/lib/container-context";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Book, FileText, Upload, Trash2, Loader2 } from "lucide-react";
import type { KnowledgeBase, KnowledgeDocument } from "@shared/schema";

export default function Knowledge() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [newBaseName, setNewBaseName] = useState("");
  const [newBaseDesc, setNewBaseDesc] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const { data: bases = [], isLoading: basesLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/containers", activeContainer?.id, "knowledge-bases"],
    enabled: !!activeContainer?.id,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<KnowledgeDocument[]>({
    queryKey: ["/api/knowledge-bases", selectedBaseId, "documents"],
    enabled: !!selectedBaseId,
  });

  const createBaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/containers/${activeContainer?.id}/knowledge-bases`, {
        name: newBaseName,
        description: newBaseDesc,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", activeContainer?.id, "knowledge-bases"] });
      setIsDialogOpen(false);
      setNewBaseName("");
      setNewBaseDesc("");
      toast({ title: "Knowledge base created" });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/knowledge-bases/${selectedBaseId}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-bases", selectedBaseId, "documents"] });
      setFileToUpload(null);
      toast({ title: "Document uploaded. Processing in background..." });
    },
  });

  const deleteBaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-bases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", activeContainer?.id, "knowledge-bases"] });
      setSelectedBaseId(null);
      toast({ title: "Knowledge base deleted" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-bases", selectedBaseId, "documents"] });
      toast({ title: "Document deleted" });
    },
  });

  if (!activeContainer) return <div className="p-8 text-center text-muted-foreground">Select a workspace first.</div>;

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">Upload instruction manuals and context for AI retrieval.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Base</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
              <DialogDescription>Group related documents together for specific AI tasks.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newBaseName} onChange={e => setNewBaseName(e.target.value)} placeholder="e.g. Customer Support FAQs" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newBaseDesc} onChange={e => setNewBaseDesc(e.target.value)} placeholder="What kind of documents will this hold?" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createBaseMutation.mutate()} disabled={!newBaseName || createBaseMutation.isPending}>
                {createBaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Base
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 h-[calc(100vh-200px)]">
        {/* Knowledge Bases List */}
        <Card className="col-span-1 h-full overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Your Bases</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {basesLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : bases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No knowledge bases yet.</p>
            ) : (
              bases.map(base => (
                <div 
                  key={base.id} 
                  className={`p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors flex items-center justify-between ${selectedBaseId === base.id ? 'bg-primary/5 border-primary' : ''}`}
                  onClick={() => setSelectedBaseId(base.id)}
                >
                  <div className="flex items-center gap-3">
                    <Book className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{base.name}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteBaseMutation.mutate(base.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="col-span-1 md:col-span-2 h-full overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedBaseId ? bases.find(b => b.id === selectedBaseId)?.name : 'Select a base to view documents'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {!selectedBaseId ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                <Book className="h-8 w-8 opacity-20" />
                <p>Select or create a Knowledge Base</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept=".pdf,.txt" 
                    onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                  />
                  <Button 
                    onClick={() => fileToUpload && uploadDocMutation.mutate(fileToUpload)}
                    disabled={!fileToUpload || uploadDocMutation.isPending}
                  >
                    {uploadDocMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload
                  </Button>
                </div>

                <div className="space-y-3">
                  {docsLoading ? (
                    <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">No documents uploaded to this base yet.</p>
                  ) : (
                    documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground capitalize">Status: {doc.status}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteDocMutation.mutate(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
