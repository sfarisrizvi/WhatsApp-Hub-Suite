import { useEffect } from "react";
import { 
  MessageSquare, Zap, Smartphone, Clock, Database, Users, 
  BrainCircuit, TrendingUp, Lock, CheckCircle2, ArrowRight, 
  ChevronDown, Sparkles, AlertTriangle, ShieldCheck, Mail,
  Instagram, Facebook, ShoppingBag, ShoppingCart, FileSpreadsheet,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/WA CRM favicon.webp";
import customerSupportImg from "@assets/Customer support.png";
import broadcastCampaignImg from "@assets/broadcast campaign.png";
import diagramFlowImg from "@assets/diagram flow.jpeg";
import postPurchasedImg from "@assets/post purchased.png";

export default function Landing() {
  // Dynamically load a premium geometric font for the landing page
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* HEADER / NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#060814]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <img src={logoPath} alt="Whatlify Logo" className="h-9 w-9 rounded-xl border border-white/10" />
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
              Whatlify
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("pain")} className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">Sound Familiar?</button>
            <button onClick={() => scrollToSection("features")} className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection("trust")} className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">Why Us</button>
            <button onClick={() => scrollToSection("pricing")} className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">Pricing</button>
          </nav>

          <div className="flex items-center gap-4">
            <a href="/auth" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">Log In</a>
            <a href="/auth">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 rounded-full shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5">
                Get Started
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-24 px-6 md:pt-44 md:pb-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
            
            {/* Left Content Column */}
            <div className="space-y-8 lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Enterprise WhatsApp CRM
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.1] md:max-w-2xl">
                Your Team Is <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">Losing Customers</span> on WhatsApp Right Now.
              </h1>

              <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
                Whatlify gives enterprise teams a shared inbox, AI automation, and built-in CRM — so every message gets answered, every lead gets tracked, and nothing falls through the cracks.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a href="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-8 py-6 rounded-full text-base shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all">
                    Get Started — $350 Setup, Then $70/mo
                  </Button>
                </a>
                <button 
                  onClick={() => scrollToSection("pain")}
                  className="inline-flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white font-semibold py-3 cursor-pointer group"
                >
                  See How It Works 
                  <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Hero Image Column */}
            <div className="lg:col-span-5 relative w-full">
              <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-2 hover:border-emerald-500/30 transition-colors duration-500 group shadow-2xl">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/5 to-indigo-500/5 opacity-50 pointer-events-none" />
                <img 
                  src={customerSupportImg} 
                  alt="Whatlify Customer Support Dashboard" 
                  className="w-full h-auto rounded-2xl object-cover border border-white/[0.04] group-hover:scale-[1.01] transition-transform duration-500"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PAIN SECTION */}
      <section id="pain" className="py-24 px-6 border-t border-white/[0.04] bg-[#080b1b]/30">
        <div className="mx-auto max-w-7xl text-center">
          
          <div className="max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">Sound Familiar?</span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              You're Already on WhatsApp.<br />Your Operations Aren't.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            
            {/* Pain Point 1 */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-left hover:border-rose-500/25 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                One agent. One phone. Zero scale.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your support team is juggling WhatsApp from a single device. Conversations get missed. Managers are blind. Customers get frustrated and leave.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-left hover:border-rose-500/25 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                Inquiries after hours = lost revenue.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No one's there at 11pm. The customer is. They move on to your competitor who actually responds.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-left hover:border-rose-500/25 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                WhatsApp on one side. CRM on the other.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your team copies order details by hand into spreadsheets. Errors pile up. Time disappears. Data stays stale.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* SOLUTION INTRO SECTION */}
      <section id="solution-intro" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
            The Solution
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-5xl leading-tight max-w-4xl mx-auto">
            One Platform. Every Part of Your Customer Journey — Handled.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Whatlify connects your entire team, your AI, and your database into a single, unified WhatsApp workspace. No code. No chaos. No missed customers.
          </p>

          <div className="pt-8 max-w-4xl mx-auto">
            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-2 hover:border-emerald-500/30 transition-colors duration-500 group shadow-2xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/5 to-indigo-500/5 opacity-50 pointer-events-none" />
              <img 
                src={diagramFlowImg} 
                alt="Unified Customer Journey Flow" 
                className="w-full h-auto rounded-2xl object-cover border border-white/[0.04] group-hover:scale-[1.005] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS SECTION */}
      <section id="integrations" className="py-24 px-6 border-t border-white/[0.04] bg-[#070916]/30">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Connect Your Ecosystem</span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Built-in Integration With</h2>
            <p className="text-sm text-slate-400">
              Whatlify connects directly with the models, channels, and commerce platforms your team already depends on.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* ChatGPT OpenAI */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-emerald-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/c/38/ChatGPT.svg" alt="ChatGPT Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">ChatGPT</h4>
                <p className="text-[10px] text-slate-500">Cognitive AI</p>
              </div>
            </div>

            {/* Claude AI */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-[#d97757]/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/c/63/claude-ai.svg" alt="Claude AI Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Claude</h4>
                <p className="text-[10px] text-slate-500">Anthropic Models</p>
              </div>
            </div>

            {/* Google Gemini */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-indigo-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/g/50/google-gemini.svg" alt="Google Gemini Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Gemini</h4>
                <p className="text-[10px] text-slate-500">Google AI</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-[#25D366]/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/w/15/whatsapp-business-bg.svg" alt="WhatsApp Business Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">WhatsApp Business</h4>
                <p className="text-[10px] text-slate-500">Meta Platform</p>
              </div>
            </div>

            {/* Instagram */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-pink-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0 group-hover:scale-110 transition-transform">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Instagram</h4>
                <p className="text-[10px] text-slate-500">Direct Messages</p>
              </div>
            </div>

            {/* Messenger */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-blue-400/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/f/6/facebook-messenger-2020.svg" alt="Facebook Messenger Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Facebook Messenger</h4>
                <p className="text-[10px] text-slate-500">Meta Chat</p>
              </div>
            </div>

            {/* Facebook */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-blue-600/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/f/28/facebook-2020-2_800.png" alt="Facebook Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Facebook</h4>
                <p className="text-[10px] text-slate-500">Meta Pages</p>
              </div>
            </div>

            {/* Shopify */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-lime-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/s/88/shopify.svg" alt="Shopify Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Shopify</h4>
                <p className="text-[10px] text-slate-500">Store Sync</p>
              </div>
            </div>

            {/* WooCommerce */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-purple-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/w/36/woocommerce.svg" alt="WooCommerce Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">WooCommerce</h4>
                <p className="text-[10px] text-slate-500">WordPress Cart</p>
              </div>
            </div>

            {/* Zapier */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-orange-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/z/75/zapier.svg" alt="Zapier Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Zapier</h4>
                <p className="text-[10px] text-slate-500">Automated Zaps</p>
              </div>
            </div>

            {/* Google Sheets */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-green-500/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform">
                <img src="https://static.cdnlogo.com/logos/g/71/google-sheets.svg" alt="Google Sheets Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">Google Sheets</h4>
                <p className="text-[10px] text-slate-500">Data Logging</p>
              </div>
            </div>

            {/* SMTP Emails */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-indigo-400/25 hover:bg-white/[0.03] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">SMTP Emails</h4>
                <p className="text-[10px] text-slate-500">Direct Mailers</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 border-t border-white/[0.04] bg-[#070916]/50">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Core Capabilities</span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Built for Teams That Drive Revenue</h2>
          </div>

          <div className="space-y-28">
            
            {/* Feature 1 */}
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="space-y-6 lg:col-span-7">
                <div className="inline-block px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  Feature 01
                </div>
                <h3 className="text-2xl font-extrabold text-white sm:text-3xl leading-tight">
                  Multi-Agent Shared Inbox
                </h3>
                <p className="text-base text-slate-300 font-medium">
                  Stop Putting Customers on Hold While Your Team Figures Out Who's Responding
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Bring your entire support and sales team onto one WhatsApp number. Assign conversations, leave internal notes, tag customers by type — all without the customer seeing the chaos behind the curtain.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    Dozens of agents. One number. Zero confusion.
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    Private internal threads inside every customer chat
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    VIP labels, billing tags, sales queues — organized instantly
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-5 relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 hover:border-emerald-500/30 transition-colors group shadow-lg">
                <img 
                  src={customerSupportImg} 
                  alt="Multi-Agent Shared Inbox for customer support" 
                  className="w-full h-auto rounded-xl object-cover border border-white/[0.04]"
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="space-y-6 lg:col-span-7 lg:order-2">
                <div className="inline-block px-3 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                  Feature 02
                </div>
                <h3 className="text-2xl font-extrabold text-white sm:text-3xl leading-tight">
                  Cognitive AI Workflow Builder
                </h3>
                <p className="text-base text-slate-300 font-medium">
                  Build a 24/7 Customer Service Agent — Without Writing a Single Line of Code
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Whatlify's LLM-powered engine reads your product catalog, your FAQs, your pricing — and holds real, intelligent conversations with your customers around the clock.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    Drag-and-drop AI flow builder — no developers needed
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    Trained on your own documents and guidelines
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    Live sandbox: test every reply before it reaches a real customer
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-5 lg:order-1 relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 hover:border-indigo-500/30 transition-colors group shadow-lg">
                <img 
                  src={diagramFlowImg} 
                  alt="Cognitive AI visual builder canvas" 
                  className="w-full h-auto rounded-xl object-cover border border-white/[0.04]"
                />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="space-y-6 lg:col-span-7">
                <div className="inline-block px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  Feature 03
                </div>
                <h3 className="text-2xl font-extrabold text-white sm:text-3xl leading-tight">
                  CRM Pipeline & E-Commerce Booking
                </h3>
                <p className="text-base text-slate-300 font-medium">
                  Turn Every WhatsApp Conversation Into a Logged, Tracked, Closed Deal
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The AI extracts order details, customer names, quantities, and delivery addresses straight from the chat. No copy-pasting. No spreadsheets. No errors.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    Auto-fills your CRM from the conversation itself
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    Real-time alerts to your admin dashboard
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    Kanban pipeline: Lead → Qualified → Closed Won — visualized
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-5 relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 hover:border-emerald-500/30 transition-colors group shadow-lg">
                <img 
                  src={postPurchasedImg} 
                  alt="Post Purchased restock and database automation flow" 
                  className="w-full h-auto rounded-xl object-cover border border-white/[0.04]"
                />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="space-y-6 lg:col-span-7 lg:order-2">
                <div className="inline-block px-3 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                  Feature 04
                </div>
                <h3 className="text-2xl font-extrabold text-white sm:text-3xl leading-tight">
                  Rich Media Campaigns & Analytics
                </h3>
                <p className="text-base text-slate-300 font-medium">
                  Broadcast to Thousands. Track What Actually Converts.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Send Meta-approved promotional templates to segmented customer lists — then measure every sent, delivered, read, and replied metric on one clean dashboard.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    Quick-reply templates with action buttons
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    Segment campaigns by customer tag or behavior
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    Full analytics — know exactly what's working
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-5 lg:order-1 relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 hover:border-indigo-500/30 transition-colors group shadow-lg">
                <img 
                  src={broadcastCampaignImg} 
                  alt="WhatsApp Broadcast Campaign and mobile preview" 
                  className="w-full h-auto rounded-xl object-cover border border-white/[0.04]"
                />
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section id="trust" className="py-24 px-6 border-t border-white/[0.04] bg-[#080b1b]/50">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Why Whatlify</span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Why Teams Switch to Whatlify</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Trust Column 1 */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 space-y-4 hover:border-emerald-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">"Zero IT involvement."</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                We handle everything — Meta verification, API configuration, bot setup, and personalized response training. Your IT team doesn't touch a thing.
              </p>
            </div>

            {/* Trust Column 2 */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 space-y-4 hover:border-emerald-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">"Live in days, not months."</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No lengthy onboarding sprints. No developer dependency. Whatlify gets you operational fast.
              </p>
            </div>

            {/* Trust Column 3 */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 space-y-4 hover:border-emerald-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">"Costs less than one support hire."</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                $70/month covers your infrastructure, LLM costs, WhatsApp API costs, and full CRM access. The ROI pays for itself the first week.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Predictable Pricing</span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Simple Pricing. Everything Included. No Surprises.</h2>
            <p className="text-base text-slate-400">
              Most platforms charge extra for API costs, CRM access, and bot setup. With Whatlify, it's all in.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Unified Pricing Card */}
            <div className="relative rounded-3xl border-2 border-emerald-500 bg-white/[0.02] p-8 md:p-12 shadow-2xl shadow-emerald-500/10 hover:shadow-emerald-500/15 transition-shadow">
              
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 px-6 py-1 text-xs font-extrabold text-slate-950 tracking-wider uppercase">
                All-In-One Plan
              </div>

              {/* Pricing Grid */}
              <div className="grid gap-8 md:grid-cols-2 text-center md:text-left items-center pb-8 border-b border-white/[0.06]">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">The Complete Whatlify Suite</h3>
                  <p className="text-sm text-slate-400">Everything you need to automate and scale your WhatsApp business. No hidden fees or API surprises.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-8 sm:gap-12">
                  <div className="space-y-1 text-center">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Step 1: Onboarding</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-white">$350</span>
                      <span className="text-xs text-slate-400 font-semibold">one-time</span>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block h-10 w-px bg-white/[0.08]" />

                  <div className="space-y-1 text-center">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Step 2: Operations</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-white">$70</span>
                      <span className="text-xs text-slate-400 font-semibold">/ month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Side-by-Side */}
              <div className="grid gap-8 md:grid-cols-2 pt-8">
                {/* Column 1: One-Time Setup */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
                    1. Onboarding & Setup
                  </h4>
                  <ul className="space-y-3">
                    {[
                      "Meta WhatsApp Business API configuration",
                      "Official WhatsApp Business verification support",
                      "Personalized AI chat response bot setup",
                      "Custom workflow training on your content & FAQs",
                      "Full onboarding — zero work from your team"
                    ].map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Ongoing Maintenance */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
                    2. Maintenance & Support
                  </h4>
                  <ul className="space-y-3">
                    {[
                      "WhatsApp Business API costs — included",
                      "LLM API processing costs — included",
                      "CRM access — free, no add-on fee",
                      "Real-time team inbox & campaign dashboard",
                      "Ongoing bot maintenance and support"
                    ].map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 text-center">
                <a href="/auth" className="inline-block w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-12 py-6 rounded-full text-base shadow-lg shadow-emerald-500/20">
                    Get Whatlify Setup — Start for $350
                  </Button>
                </a>
              </div>

            </div>
          </div>

          {/* Pricing Callout Box */}
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-2">
            <p className="text-sm text-slate-300 font-medium">
              💡 <span className="font-bold text-white">Year 1 total: $1,190</span> — That's less than 2 weeks of a single customer support hire — and Whatlify works 24 hours a day, 7 days a week, without sick days.
            </p>
            <p className="text-xs text-slate-500">
              No contracts. No hidden API charges. Cancel anytime.
            </p>
          </div>

        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-24 px-6 border-t border-white/[0.04] relative">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.02] to-transparent p-12 md:p-16 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <h2 className="text-3xl font-extrabold text-white sm:text-5xl leading-tight max-w-3xl mx-auto">
            Your Competitors Are Automating WhatsApp. Are You?
          </h2>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
            Every day without Whatlify is another day of missed messages, manual data entry, and customers slipping away to whoever responds faster.
          </p>

          <div className="pt-4 flex flex-col items-center gap-4">
            <a href="/auth">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-10 py-6 rounded-full text-base shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all">
                → Get Whatlify Set Up — Start for $350
              </Button>
            </a>
            <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">
              Full configuration. Personalized bot. Live in days.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-12 px-6 bg-[#04060e]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logoPath} alt="Whatlify Logo" className="h-8 w-8 rounded-lg opacity-70" />
            <span className="text-lg font-bold tracking-tight text-slate-400">
              Whatlify
            </span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Whatlify. Built with WhatsApp Business API.
          </p>
          <div className="flex gap-4">
            <a href="/auth" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="/auth" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
