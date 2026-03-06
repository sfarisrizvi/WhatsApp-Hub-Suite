import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContainer } from "@/lib/container-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Send, Trash2, Edit, FileText, Copy, Eye, ArrowLeft,
  LayoutGrid, Timer, Layers, AlertCircle, CheckCircle, Clock, X, RefreshCw,
  ExternalLink, Phone, Globe, MessageSquare, Smartphone, Mic, Camera,
  Smile, Paperclip, ChevronRight, Loader2,
} from "lucide-react";
import type { Template } from "@shared/schema";

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "en_US", name: "English (US)" },
  { code: "ar", name: "Arabic" }, { code: "es", name: "Spanish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "hi", name: "Hindi" }, { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" }, { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" }, { code: "pt_BR", name: "Portuguese (BR)" },
  { code: "ru", name: "Russian" }, { code: "tr", name: "Turkish" },
  { code: "ur", name: "Urdu" }, { code: "zh_CN", name: "Chinese (CN)" },
];

const premadeTemplates = [
  { name: "Welcome Message", category: "utility", body: "Hello {{1}}! Welcome to {{2}}. We're glad to have you. How can we help you today?", variables: ["customer_name", "business_name"] },
  { name: "Order Confirmation", category: "utility", body: "Hi {{1}}, your order #{{2}} has been confirmed! Total: ${{3}}. We'll notify you when it ships.", variables: ["customer_name", "order_number", "total"] },
  { name: "Payment Reminder", category: "utility", body: "Hi {{1}}, this is a friendly reminder that your payment of ${{2}} is due on {{3}}. Please make your payment to avoid late fees.", variables: ["customer_name", "amount", "due_date"] },
  { name: "Promotional Offer", category: "marketing", body: "Hey {{1}}! Great news - we're offering {{2}}% off on all products this week! Use code {{3}} at checkout. Shop now!", variables: ["customer_name", "discount", "code"] },
  { name: "Shipping Update", category: "utility", body: "Hi {{1}}, your order #{{2}} has been shipped! Track it here: {{3}}. Expected delivery: {{4}}.", variables: ["customer_name", "order_number", "tracking_link", "delivery_date"] },
  { name: "Appointment Reminder", category: "utility", body: "Hi {{1}}, reminder: You have an appointment on {{2}} at {{3}}. Reply YES to confirm or NO to reschedule.", variables: ["customer_name", "date", "time"] },
];

type ButtonItem = { type: string; text: string; url?: string; phoneNumber?: string; example?: string };
type CarouselCard = { body: string; imageUrl?: string; buttons: ButtonItem[] };

interface TemplateForm {
  name: string;
  category: string;
  templateType: string;
  language: string;
  body: string;
  headerType: string;
  headerContent: string;
  footerText: string;
  variables: string;
  buttons: ButtonItem[];
  offerText: string;
  offerExpiry: string;
  carouselCards: CarouselCard[];
}

const emptyForm: TemplateForm = {
  name: "", category: "marketing", templateType: "standard", language: "en",
  body: "", headerType: "none", headerContent: "", footerText: "", variables: "",
  buttons: [], offerText: "", offerExpiry: "",
  carouselCards: [],
};

function WhatsAppPreview({ form }: { form: TemplateForm }) {
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="sticky top-0" data-testid="template-preview">
      <p className="text-sm font-medium text-center mb-3 text-muted-foreground">Preview</p>
      <div className="mx-auto w-[280px] rounded-[2rem] border-[3px] border-gray-800 dark:border-gray-600 bg-gray-800 overflow-hidden shadow-xl">
        <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <div className="h-7 w-7 rounded-full bg-gray-400 flex items-center justify-center text-[10px]">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Business</p>
            <p className="text-[9px] opacity-70">online</p>
          </div>
        </div>

        <div className="bg-[#ECE5DD] dark:bg-[#0B141A] min-h-[360px] p-3 space-y-1.5 relative"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>

          <div className="text-center">
            <span className="inline-block bg-[#E1F3FB] dark:bg-[#1D3A3A] rounded px-2 py-0.5 text-[8px] text-gray-600 dark:text-gray-300">
              This business uses a secure service from Meta to manage this chat
            </span>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg max-w-[230px] shadow-sm overflow-hidden">
              {form.headerType === "image" && (
                <div className="bg-gray-300 dark:bg-gray-700 h-28 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-gray-500" />
                </div>
              )}
              {form.headerType === "video" && (
                <div className="bg-gray-300 dark:bg-gray-700 h-28 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-white/80 flex items-center justify-center"><ChevronRight className="h-4 w-4" /></div>
                </div>
              )}
              {form.headerType === "document" && (
                <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 flex items-center gap-2 border-b border-gray-300 dark:border-gray-600">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span className="text-[10px]">document.pdf</span>
                </div>
              )}
              {form.headerType === "text" && form.headerContent && (
                <div className="px-2.5 pt-2">
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white">{form.headerContent}</p>
                </div>
              )}

              <div className="px-2.5 py-1.5">
                <p className="text-[11px] text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {form.body || "Template message will appear here..."}
                </p>
                {form.footerText && (
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-1">{form.footerText}</p>
                )}
                <p className="text-[8px] text-gray-500 dark:text-gray-400 text-right mt-0.5">{time}</p>
              </div>

              {form.templateType === "limited_offer" && form.offerText && (
                <div className="border-t border-gray-300/50 dark:border-gray-600/50 px-2.5 py-1.5 bg-[#d4f0c0] dark:bg-[#004D40]">
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3 text-[#25D366]" />
                    <span className="text-[10px] font-medium">{form.offerText}</span>
                  </div>
                  {form.offerExpiry && (
                    <p className="text-[8px] text-gray-500 mt-0.5">Expires: {new Date(form.offerExpiry).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {form.buttons.length > 0 && (
                <div className="border-t border-gray-300/50 dark:border-gray-600/50">
                  {form.buttons.map((btn, i) => (
                    <div key={i} className="text-center py-1.5 border-b border-gray-300/30 dark:border-gray-600/30 last:border-0">
                      <span className="text-[10px] text-[#53BDEB] flex items-center justify-center gap-1">
                        {btn.type === "URL" && <ExternalLink className="h-2.5 w-2.5" />}
                        {btn.type === "PHONE_NUMBER" && <Phone className="h-2.5 w-2.5" />}
                        {btn.type === "COPY_CODE" && <Copy className="h-2.5 w-2.5" />}
                        {btn.text || "Button"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {form.templateType === "carousel" && form.carouselCards.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {form.carouselCards.map((card, i) => (
                <div key={i} className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg min-w-[160px] max-w-[160px] shadow-sm overflow-hidden shrink-0">
                  <div className="bg-gray-300 dark:bg-gray-700 h-20 flex items-center justify-center">
                    <Camera className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[9px] text-gray-900 dark:text-white line-clamp-2">{card.body || `Card ${i + 1}`}</p>
                  </div>
                  {card.buttons?.length > 0 && (
                    <div className="border-t border-gray-300/50 dark:border-gray-600/50">
                      {card.buttons.map((btn, bi) => (
                        <div key={bi} className="text-center py-1">
                          <span className="text-[9px] text-[#53BDEB]">{btn.text || "Button"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#F0F0F0] dark:bg-[#1F2C34] px-2 py-1.5 flex items-center gap-1.5">
          <Smile className="h-4 w-4 text-gray-500" />
          <div className="flex-1 bg-white dark:bg-[#2A3942] rounded-full px-3 py-1">
            <span className="text-[9px] text-gray-400">Type a message</span>
          </div>
          <Paperclip className="h-3.5 w-3.5 text-gray-500" />
          <Camera className="h-3.5 w-3.5 text-gray-500" />
          <Mic className="h-3.5 w-3.5 text-gray-500" />
        </div>
      </div>
    </div>
  );
}

function TemplateCreator({
  initialForm, editTemplate, onClose,
}: {
  initialForm?: TemplateForm;
  editTemplate?: Template | null;
  onClose: () => void;
}) {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [form, setForm] = useState<TemplateForm>(initialForm || emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [showButtons, setShowButtons] = useState((initialForm?.buttons?.length || 0) > 0);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/containers/${cid}/templates`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: "Template saved as draft" });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: "Template updated" });
      onClose();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", `/api/templates/${templateId}/submit-to-meta`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: "Template submitted to Meta for approval!" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const validate = (): string[] => {
    const e: string[] = [];
    if (!form.name.trim()) e.push("Template name is required");
    if (!/^[a-zA-Z0-9_ ]+$/.test(form.name)) e.push("Template name can only contain letters, numbers, underscores, and spaces");
    if (!form.body.trim()) e.push("Body message is required");
    if (form.body.length > 1024) e.push("Body must be 1024 characters or less");
    if (!form.language) e.push("Language is required");
    if (form.footerText && form.footerText.length > 60) e.push("Footer must be 60 characters or less");
    if (form.templateType === "limited_offer" && !form.offerText.trim()) e.push("Offer text is required for limited time offers");
    if (form.templateType === "limited_offer" && form.offerText.length > 16) e.push("Offer text must be 16 characters or less");
    if (form.templateType === "carousel" && form.carouselCards.length === 0) e.push("At least one carousel card is required");
    if (form.templateType === "carousel" && form.carouselCards.length > 5) e.push("Maximum 5 carousel cards allowed");
    form.buttons.forEach((btn, i) => {
      if (!btn.text.trim()) e.push(`Button ${i + 1} text is required`);
      if (btn.text.length > 25) e.push(`Button ${i + 1} text must be 25 characters or less`);
      if (btn.type === "URL" && !btn.url?.trim()) e.push(`Button ${i + 1} URL is required`);
    });
    return e;
  };

  const handleSaveDraft = () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setErrors([]);
    const vars = form.variables ? form.variables.split(",").map(v => v.trim()).filter(Boolean) : [];
    const data = {
      name: form.name, category: form.category, templateType: form.templateType,
      language: form.language, body: form.body, headerType: form.headerType,
      headerContent: form.headerContent, footerText: form.footerText,
      variables: vars, buttons: form.buttons, offerText: form.offerText,
      offerExpiry: form.offerExpiry ? new Date(form.offerExpiry).toISOString() : null,
      carouselCards: form.carouselCards,
    };
    if (editTemplate) {
      updateMutation.mutate({ id: editTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSaveAndSubmit = async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setErrors([]);
    const vars = form.variables ? form.variables.split(",").map(v => v.trim()).filter(Boolean) : [];
    const data = {
      name: form.name, category: form.category, templateType: form.templateType,
      language: form.language, body: form.body, headerType: form.headerType,
      headerContent: form.headerContent, footerText: form.footerText,
      variables: vars, buttons: form.buttons, offerText: form.offerText,
      offerExpiry: form.offerExpiry ? new Date(form.offerExpiry).toISOString() : null,
      carouselCards: form.carouselCards,
    };
    try {
      let templateId = editTemplate?.id;
      if (editTemplate) {
        const res = await apiRequest("PATCH", `/api/templates/${editTemplate.id}`, data);
        const updated = await res.json();
        templateId = updated.id;
      } else {
        const res = await apiRequest("POST", `/api/containers/${cid}/templates`, data);
        const created = await res.json();
        templateId = created.id;
      }
      if (templateId) submitMutation.mutate(templateId);
    } catch (err: any) {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  const addButton = (type: string) => {
    if (form.buttons.length >= 3) return;
    setForm(f => ({ ...f, buttons: [...f.buttons, { type, text: "", url: "", phoneNumber: "", example: "" }] }));
  };

  const updateButton = (index: number, updates: Partial<ButtonItem>) => {
    setForm(f => ({ ...f, buttons: f.buttons.map((b, i) => i === index ? { ...b, ...updates } : b) }));
  };

  const removeButton = (index: number) => {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, i) => i !== index) }));
  };

  const addCarouselCard = () => {
    if (form.carouselCards.length >= 5) return;
    setForm(f => ({ ...f, carouselCards: [...f.carouselCards, { body: "", buttons: [] }] }));
  };

  const updateCarouselCard = (index: number, updates: Partial<CarouselCard>) => {
    setForm(f => ({ ...f, carouselCards: f.carouselCards.map((c, i) => i === index ? { ...c, ...updates } : c) }));
  };

  const removeCarouselCard = (index: number) => {
    setForm(f => ({ ...f, carouselCards: f.carouselCards.filter((_, i) => i !== index) }));
  };

  const addVariable = () => {
    const varCount = (form.variables ? form.variables.split(",").filter(Boolean).length : 0) + 1;
    const newVar = `{{${varCount}}}`;
    setForm(f => ({ ...f, body: f.body + newVar }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending || submitMutation.isPending;

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-back-templates">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">{editTemplate ? "Edit Template" : "New Template"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isPending} data-testid="button-save-draft">
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Save as draft
          </Button>
          <Button onClick={handleSaveAndSubmit} disabled={isPending} className="bg-[#25D366] hover:bg-[#1da851] text-white" data-testid="button-save-submit">
            {submitMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            <Send className="h-3.5 w-3.5 mr-1" /> Save and submit
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30" data-testid="text-validation-errors">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 mt-1 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 p-4">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Template Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Template Name" data-testid="input-template-name" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                <SelectTrigger data-testid="select-template-language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Select Marketing template</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "standard", label: "Standard", icon: LayoutGrid },
                { value: "carousel", label: "Carousel", icon: Layers },
                { value: "limited_offer", label: "Limited time offers", icon: Timer },
              ].map(t => (
                <Button key={t.value} variant={form.templateType === t.value ? "default" : "outline"} size="sm"
                  onClick={() => setForm(f => ({ ...f, templateType: t.value }))} data-testid={`button-type-${t.value}`}>
                  <t.icon className="h-3.5 w-3.5 mr-1" /> {t.label}
                </Button>
              ))}
            </div>
          </div>

          {form.templateType === "standard" && (
            <div>
              <Label>Campaign title <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <p className="text-xs text-muted-foreground mb-2">Highlight your brand here, use images or videos, to stand out</p>
              <div className="flex gap-3 flex-wrap">
                {["none", "text", "image", "video", "document"].map(h => (
                  <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="headerType" checked={form.headerType === h}
                      onChange={() => setForm(f => ({ ...f, headerType: h, headerContent: "" }))}
                      className="accent-[#25D366]" />
                    <span className="text-sm capitalize">{h === "none" ? "None" : h}</span>
                  </label>
                ))}
              </div>
              {form.headerType === "text" && (
                <Input className="mt-2" value={form.headerContent} onChange={e => setForm(f => ({ ...f, headerContent: e.target.value }))}
                  placeholder="Header text" maxLength={60} data-testid="input-header-text" />
              )}
            </div>
          )}

          {form.templateType === "limited_offer" && (
            <div>
              <Label>Media header <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <p className="text-xs text-muted-foreground mb-2">Highlight your brand here, use images or videos, to stand out</p>
              <div className="flex gap-3 flex-wrap">
                {["none", "image", "video"].map(h => (
                  <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="headerType" checked={form.headerType === h}
                      onChange={() => setForm(f => ({ ...f, headerType: h }))} className="accent-[#25D366]" />
                    <span className="text-sm capitalize">{h === "none" ? "None" : h}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <Label>Body</Label>
                <p className="text-xs text-muted-foreground">
                  {form.templateType === "standard"
                    ? "Make your messages personal using variables like {{name}} and get more replies!"
                    : "Let users know how and what they will be able to redeem below"}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-[#25D366]" onClick={addVariable} data-testid="button-add-variable">
                <Plus className="h-3 w-3 mr-1" /> Add Variable
              </Button>
            </div>
            <div className="relative">
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={5} placeholder="Template Message..." maxLength={1024} className="resize-none"
                data-testid="input-template-body" />
              <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">{form.body.length}/1024</span>
            </div>
          </div>

          {form.templateType === "limited_offer" && (
            <>
              <Separator />
              <div>
                <Label className="text-base font-semibold">Promotional time frame</Label>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Offer text</Label>
                    <div className="relative">
                      <Input value={form.offerText} onChange={e => setForm(f => ({ ...f, offerText: e.target.value }))}
                        placeholder="Buy 2 get 1 free" maxLength={16} data-testid="input-offer-text" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.offerText.length}/16</span>
                    </div>
                  </div>
                  <div>
                    <Label>Offer expiry <span className="text-muted-foreground font-normal">(Recommended)</span></Label>
                    <Input type="datetime-local" value={form.offerExpiry}
                      onChange={e => setForm(f => ({ ...f, offerExpiry: e.target.value }))}
                      data-testid="input-offer-expiry" />
                    <p className="text-[10px] text-muted-foreground mt-1">Timezone will update dynamically for your users</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {form.templateType !== "limited_offer" && (
            <div>
              <Label>Footer <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <p className="text-xs text-muted-foreground mb-1">Footers are great to add any disclaimers or to add a thoughtful PS</p>
              <div className="relative">
                <Input value={form.footerText} onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))}
                  placeholder="Enter Text" maxLength={60} data-testid="input-template-footer" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{form.footerText.length}/60</span>
              </div>
            </div>
          )}

          {form.templateType !== "carousel" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Buttons <span className="text-muted-foreground font-normal text-sm">(Recommended)</span></Label>
                  <p className="text-xs text-muted-foreground">Insert buttons so your customers can take action and engage with your message!</p>
                </div>
                <Switch checked={showButtons} onCheckedChange={v => { setShowButtons(v); if (!v) setForm(f => ({ ...f, buttons: [] })); }}
                  data-testid="switch-buttons" />
              </div>
              {showButtons && (
                <div className="mt-3 space-y-2">
                  {form.buttons.map((btn, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 border rounded-lg" data-testid={`button-config-${i}`}>
                      <Select value={btn.type} onValueChange={v => updateButton(i, { type: v })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="URL">Visit Website</SelectItem>
                          <SelectItem value="PHONE_NUMBER">Call Phone</SelectItem>
                          <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                          <SelectItem value="COPY_CODE">Copy offer code</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={btn.text} onChange={e => updateButton(i, { text: e.target.value })}
                        placeholder="Button text" maxLength={25} className="flex-1" />
                      {btn.type === "URL" && (
                        <Input value={btn.url || ""} onChange={e => updateButton(i, { url: e.target.value })}
                          placeholder="https://example.com" className="flex-1" />
                      )}
                      {btn.type === "PHONE_NUMBER" && (
                        <Input value={btn.phoneNumber || ""} onChange={e => updateButton(i, { phoneNumber: e.target.value })}
                          placeholder="+1234567890" className="w-[150px]" />
                      )}
                      {btn.type === "COPY_CODE" && (
                        <Input value={btn.example || ""} onChange={e => updateButton(i, { example: e.target.value })}
                          placeholder="Enter coupon code" className="flex-1" />
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeButton(i)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {form.buttons.length < 3 && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => addButton("URL")} data-testid="button-add-url">
                        <Globe className="h-3 w-3 mr-1" /> Visit Website
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => addButton("COPY_CODE")} data-testid="button-add-copy-code">
                        <Copy className="h-3 w-3 mr-1" /> Copy offer code
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => addButton("QUICK_REPLY")} data-testid="button-add-quick-reply">
                        <MessageSquare className="h-3 w-3 mr-1" /> Quick reply
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {form.templateType === "carousel" && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label className="text-base font-semibold">Carousel cards ({form.carouselCards.length}/5)</Label>
                    <p className="text-xs text-muted-foreground">Display your products - create a carousel of images & buttons for up to 5 cards</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {form.carouselCards.map((card, i) => (
                    <Card key={i} className="p-3" data-testid={`carousel-card-${i}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Card {i + 1}</span>
                        <Button size="icon" variant="ghost" onClick={() => removeCarouselCard(i)}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <Textarea value={card.body} onChange={e => updateCarouselCard(i, { body: e.target.value })}
                        rows={2} placeholder="Card body text..." className="mb-2 resize-none" />
                      <div className="space-y-1">
                        {card.buttons.map((btn, bi) => (
                          <div key={bi} className="flex gap-1 items-center">
                            <Select value={btn.type} onValueChange={v => {
                              const newBtns = [...card.buttons];
                              newBtns[bi] = { ...newBtns[bi], type: v };
                              updateCarouselCard(i, { buttons: newBtns });
                            }}>
                              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="URL">URL</SelectItem>
                                <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input value={btn.text} className="h-8 text-xs" placeholder="Button text"
                              onChange={e => {
                                const newBtns = [...card.buttons];
                                newBtns[bi] = { ...newBtns[bi], text: e.target.value };
                                updateCarouselCard(i, { buttons: newBtns });
                              }} />
                            {btn.type === "URL" && (
                              <Input value={btn.url || ""} className="h-8 text-xs" placeholder="URL"
                                onChange={e => {
                                  const newBtns = [...card.buttons];
                                  newBtns[bi] = { ...newBtns[bi], url: e.target.value };
                                  updateCarouselCard(i, { buttons: newBtns });
                                }} />
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => {
                              const newBtns = card.buttons.filter((_, j) => j !== bi);
                              updateCarouselCard(i, { buttons: newBtns });
                            }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {card.buttons.length < 2 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            updateCarouselCard(i, { buttons: [...card.buttons, { type: "URL", text: "", url: "" }] });
                          }}>
                            <Plus className="h-3 w-3 mr-1" /> Add button
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  {form.carouselCards.length < 5 && (
                    <button onClick={addCarouselCard} data-testid="button-add-carousel-card"
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-[#25D366] flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/5 transition-colors">
                      <Plus className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Variables <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
            <Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))}
              placeholder="customer_name, order_number" data-testid="input-template-variables" />
          </div>
        </div>

        <div className="hidden lg:block w-[310px] shrink-0">
          <WhatsAppPreview form={form} />
        </div>
      </div>
    </div>
  );
}

export default function Templates() {
  const { activeContainer } = useContainer();
  const { toast } = useToast();
  const cid = activeContainer?.id;
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/containers", cid, "templates"],
    enabled: !!cid,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/templates/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/templates/${id}/submit-to-meta`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: "Template submitted to Meta!" });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/containers/${cid}/templates/sync-all`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", cid, "templates"] });
      toast({ title: data.synced > 0 ? `Synced ${data.synced} template(s)` : "All templates up to date" });
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const handleUsePremade = (tpl: typeof premadeTemplates[0]) => {
    setEditTemplate(null);
    setShowCreate(true);
  };

  const handleEdit = (tpl: Template) => {
    setEditTemplate(tpl);
    setShowCreate(true);
  };

  if (!activeContainer) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select a workspace</p></div>;
  }

  if (showCreate || editTemplate) {
    const initialForm: TemplateForm = editTemplate ? {
      name: editTemplate.name, category: editTemplate.category,
      templateType: (editTemplate as any).templateType || "standard",
      language: (editTemplate as any).language || "en",
      body: editTemplate.body, headerType: editTemplate.headerType || "none",
      headerContent: editTemplate.headerContent || "", footerText: editTemplate.footerText || "",
      variables: (editTemplate.variables || []).join(", "),
      buttons: ((editTemplate as any).buttons as ButtonItem[]) || [],
      offerText: (editTemplate as any).offerText || "",
      offerExpiry: (editTemplate as any).offerExpiry ? new Date((editTemplate as any).offerExpiry).toISOString().slice(0, 16) : "",
      carouselCards: ((editTemplate as any).carouselCards as CarouselCard[]) || [],
    } : emptyForm;

    return (
      <TemplateCreator
        initialForm={initialForm}
        editTemplate={editTemplate}
        onClose={() => { setShowCreate(false); setEditTemplate(null); }}
      />
    );
  }

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle className="h-3 w-3 text-green-600" />;
    if (s === "pending") return <Clock className="h-3 w-3 text-yellow-600" />;
    if (s === "rejected") return <AlertCircle className="h-3 w-3 text-red-600" />;
    return <FileText className="h-3 w-3 text-muted-foreground" />;
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (s === "pending") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    if (s === "rejected") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    return "";
  };

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-templates-title">Templates</h1>
          <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending} data-testid="button-sync-templates">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncAllMutation.isPending ? "animate-spin" : ""}`} /> Sync Status
          </Button>
          <Button size="sm" onClick={() => { setEditTemplate(null); setShowCreate(true); }} data-testid="button-create-template">
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="my-templates">
        <TabsList>
          <TabsTrigger value="my-templates" data-testid="tab-my-templates">My Templates</TabsTrigger>
          <TabsTrigger value="premade" data-testid="tab-premade">Premade Library</TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>
          ) : templates.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No templates yet. Create one or use a premade template.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="p-4 hover-elevate" data-testid={`card-template-${tpl.id}`}>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{tpl.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{tpl.category}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{(tpl as any).templateType || "standard"}</Badge>
                      </div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 flex items-center gap-1 ${statusColor(tpl.status || "draft")}`}>
                      {statusIcon(tpl.status || "draft")} {tpl.status || "draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{tpl.body}</p>
                  {(tpl.variables || []).length > 0 && (
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                      {(tpl.variables || []).map((v, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <Button size="icon" variant="ghost" onClick={() => setPreviewTemplate(tpl)} data-testid={`button-preview-${tpl.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(tpl)} data-testid={`button-edit-${tpl.id}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {tpl.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => submitMutation.mutate(tpl.id)} disabled={submitMutation.isPending}
                        data-testid={`button-submit-${tpl.id}`} className="text-xs">
                        <Send className="h-3 w-3 mr-1" /> Submit
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(tpl.id)} data-testid={`button-delete-${tpl.id}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="premade" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {premadeTemplates.map((tpl, i) => (
              <Card key={i} className="p-4 hover-elevate" data-testid={`card-premade-${i}`}>
                <div className="flex items-start justify-between gap-1 mb-3">
                  <h3 className="font-medium text-sm">{tpl.name}</h3>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{tpl.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{tpl.body}</p>
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {tpl.variables.map((v, vi) => (
                    <Badge key={vi} variant="outline" className="text-[10px]">{v}</Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleUsePremade(tpl)} data-testid={`button-use-premade-${i}`}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Use This Template
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <WhatsAppPreview form={{
              ...emptyForm,
              name: previewTemplate.name,
              body: previewTemplate.body,
              headerType: previewTemplate.headerType || "none",
              headerContent: previewTemplate.headerContent || "",
              footerText: previewTemplate.footerText || "",
              templateType: (previewTemplate as any).templateType || "standard",
              buttons: ((previewTemplate as any).buttons as ButtonItem[]) || [],
              offerText: (previewTemplate as any).offerText || "",
              offerExpiry: (previewTemplate as any).offerExpiry || "",
              carouselCards: ((previewTemplate as any).carouselCards as CarouselCard[]) || [],
            }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
