import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, Zap, BarChart3, Send, ShoppingCart } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "Team Inbox", desc: "Real-time shared inbox with assignments, statuses, and internal notes for seamless collaboration." },
  { icon: Users, title: "Contact Management", desc: "Organize contacts with tags, custom fields, segments, and CSV import/export capabilities." },
  { icon: Send, title: "Campaign Broadcasts", desc: "Send targeted WhatsApp campaigns with templates, scheduling, and audience segmentation." },
  { icon: Zap, title: "Smart Automations", desc: "Set up welcome messages, keyword auto-replies, and away messages that work 24/7." },
  { icon: BarChart3, title: "Rich Analytics", desc: "Track delivery rates, read receipts, reply rates, and engagement with beautiful charts." },
  { icon: ShoppingCart, title: "E-Commerce Ready", desc: "Order tracking, payment reminders, and automated notifications for your online store." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold" data-testid="text-brand-name">WA CRM</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <a href="#features" className="text-sm text-muted-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="/api/login" data-testid="button-login">
              <Button size="sm">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
                  WhatsApp Business CRM
                </span>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-serif" data-testid="text-hero-title">
                  Automate Your <span className="text-primary">WhatsApp</span> Business
                </h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-xl">
                The all-in-one platform to manage contacts, automate messages, run campaigns, 
                and grow your business through WhatsApp. Built for teams of all sizes.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <a href="/api/login" data-testid="button-hero-cta">
                  <Button size="lg" className="text-base">
                    Start Free Today
                  </Button>
                </a>
                <a href="#features">
                  <Button variant="outline" size="lg" className="text-base">
                    View Features
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-4 pt-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Free forever plan</span>
                <span className="text-xs text-muted-foreground">No credit card required</span>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                <div className="space-y-3">
                  {[
                    { from: "Sarah K.", msg: "Hi! I'd like to know about your products", time: "2:30 PM", incoming: true },
                    { from: "You", msg: "Hello Sarah! Here's our latest catalog. Which category interests you?", time: "2:31 PM", incoming: false },
                    { from: "Sarah K.", msg: "I'm looking for the premium package", time: "2:32 PM", incoming: true },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.incoming ? "justify-start" : "justify-end"}`}>
                      <div className={`rounded-xl px-4 py-2.5 max-w-[280px] ${m.incoming ? "bg-card border" : "bg-primary text-primary-foreground"}`}>
                        <p className="text-sm">{m.msg}</p>
                        <p className={`text-[10px] mt-1 ${m.incoming ? "text-muted-foreground" : "text-primary-foreground/70"}`}>{m.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-card/50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-serif" data-testid="text-features-title">Everything You Need</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              From contact management to campaign analytics, we've got every tool your WhatsApp business needs.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Card key={i} className="p-6 hover-elevate" data-testid={`card-feature-${i}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-1">
          <p className="text-sm text-muted-foreground">WA CRM Platform</p>
          <p className="text-xs text-muted-foreground">Built with WhatsApp Business API</p>
        </div>
      </footer>
    </div>
  );
}
