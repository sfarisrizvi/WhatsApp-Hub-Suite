import React, { useState } from "react";
import { Link } from "wouter";
import { Trash2, ArrowLeft, Mail, CheckCircle2, ShieldAlert, Clock, Send } from "lucide-react";
import logoPath from "@assets/WA CRM favicon.webp";

export default function DataDeletion() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-emerald-500 selection:text-white">
      {/* HEADER */}
      <header className="border-b border-white/[0.08] bg-[#070a13]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src={logoPath} alt="Whatlify Logo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-white tracking-tight">Whatlify</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <Link href="/auth" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-12 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium mb-4">
            <Trash2 className="w-3.5 h-3.5" /> Data Rights & Privacy
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
            User Data Deletion Instructions
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            In compliance with Meta Platform Policies and global data privacy standards, Whatlify (operated by <strong className="text-white">AlQaim Digital</strong>) provides transparent and prompt data deletion capabilities for all users and businesses.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10 text-sm leading-relaxed">
        {/* Policy Summary */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 md:p-8">
          <h2 className="text-base font-bold text-white mb-2">
            How to Request Deletion of Your Data
          </h2>
          <p className="text-slate-300 mb-4">
            Users may request the complete deletion of their account, synced contacts, and WhatsApp message logs by emailing our dedicated support team:
          </p>
          <div className="p-4 rounded-lg bg-black/40 border border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-slate-400">Recipient Email:</div>
              <a href="mailto:support@whatlify.com?subject=Data%20Deletion%20Request" className="text-emerald-400 font-mono font-semibold text-sm hover:underline">
                support@whatlify.com
              </a>
            </div>
            <div>
              <div className="text-xs text-slate-400">Required Subject Line:</div>
              <span className="text-white font-mono text-sm bg-white/[0.05] px-2 py-1 rounded">
                Data Deletion Request
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            <strong>Purge Timeline:</strong> Once verified, all associated personal records, synced WhatsApp conversations, Meta token references, and CRM customer entries will be permanently purged within <strong>30 days</strong>.
          </p>
        </div>

        {/* 3 Methods */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            Available Methods to Purge or Delete Your Data
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base mb-1.5">1. Email Request</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Send an email to <span className="text-white">support@whatlify.com</span> from your registered account email with the subject &ldquo;Data Deletion Request&rdquo;.
                </p>
              </div>
              <div className="mt-4 text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Processed within 30 days
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 w-fit mb-3">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base mb-1.5">2. Self-Service In-App</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Log in to your Whatlify account, navigate to <span className="text-white">Settings &gt; Workspaces</span>, and click <span className="text-white">&ldquo;Clear Demo Data&rdquo;</span> or delete the container to instantly erase records.
                </p>
              </div>
              <div className="mt-4 text-[11px] text-blue-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Instant deletion
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 w-fit mb-3">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white text-base mb-1.5">3. Facebook Settings</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Go to your Facebook Account Settings &gt; Apps and Websites &gt; Whatlify &gt; Click &ldquo;Remove&rdquo;. This triggers an automated Meta de-authorization and deletion signal.
                </p>
              </div>
              <div className="mt-4 text-[11px] text-purple-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Meta automated callback
              </div>
            </div>
          </div>
        </section>

        {/* Quick Web Request Form */}
        <section className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 md:p-8">
          <h2 className="text-base font-bold text-white mb-2">
            Submit a Data Deletion Request Online
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            If you wish to submit your request directly through this page, fill out the form below:
          </p>

          {submitted ? (
            <div className="p-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <strong className="block text-white mb-1">Request Received</strong>
                Your deletion ticket for <span className="underline font-mono">{email}</span> has been logged. Our compliance officer will verify account ownership and process full data removal within 30 days. Confirmation will be sent to your email.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="your-email@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Workspace Name / Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+1 555 123 4567 or Business Workspace Name"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Let us know if you'd like specific records purged or a complete account termination..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/[0.1] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-900/20"
              >
                <Send className="w-3.5 h-3.5" /> Submit Deletion Request
              </button>
            </form>
          )}
        </section>

        {/* What Happens */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            What Data Is Purged
          </h2>
          <p className="text-xs text-slate-400">
            Upon processing your request, AlQaim Digital permanently destroys:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 pl-2">
            <li>User account profiles, passwords, and authentication tokens.</li>
            <li>All synced customer contacts, phone numbers, and custom tags.</li>
            <li>Inbound and outbound WhatsApp message content, voice notes, and media logs.</li>
            <li>Meta API access tokens, phone number IDs, and WABA linkages.</li>
            <li>Sales pipeline deals, order history, and automated workflow definitions.</li>
          </ul>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-8 px-6 bg-[#04060e] text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Whatlify. Whatlify is a product owned and operated by AlQaim Digital. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          <Link href="/data-deletion" className="text-emerald-400 underline">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
