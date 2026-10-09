import React from "react";
import { Link } from "wouter";
import { Shield, ArrowLeft, Mail, Building2, Lock, CheckCircle2 } from "lucide-react";
import logoPath from "@assets/WA CRM favicon.webp";

export default function PrivacyPolicy() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-emerald-500 selection:text-white">
      {/* TOP HEADER */}
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

      {/* HERO SECTION */}
      <section className="py-12 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <Shield className="w-3.5 h-3.5" /> Legal & Compliance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            This Privacy Policy describes how Whatlify, owned and operated by <strong className="text-white">AlQaim Digital</strong>, collects, uses, processes, and protects your information when you use our platform and Meta WhatsApp Cloud API integration.
          </p>
          <div className="mt-4 text-xs text-slate-500">
            Last Updated: {lastUpdated} &bull; Effective Immediately
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10 text-sm leading-relaxed">
        {/* 1. Entity Ownership */}
        <section className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 md:p-8">
          <div className="flex items-center gap-2.5 text-base font-bold text-white mb-3">
            <Building2 className="w-5 h-5 text-emerald-400" />
            1. Legal Entity & Ownership
          </div>
          <p className="text-slate-300">
            <strong>Whatlify is a proprietary software product owned, developed, and operated by AlQaim Digital</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). AlQaim Digital provides an omnichannel WhatsApp automation platform, CRM system, and marketing suite for businesses globally.
          </p>
          <p className="mt-3 text-slate-400">
            If you have questions regarding this Privacy Policy or our data protection practices, you can contact us at <a href="mailto:privacy@whatlify.com" className="text-emerald-400 underline">privacy@whatlify.com</a> or <a href="mailto:support@whatlify.com" className="text-emerald-400 underline">support@whatlify.com</a>.
          </p>
        </section>

        {/* 2. WhatsApp Data Processing */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            2. Data We Collect via WhatsApp Cloud API
          </h2>
          <p>
            When you connect your WhatsApp Business Account (WABA) or interact with Whatlify automated workspaces, we process information necessary to facilitate business messaging, automation, and customer relationship management:
          </p>
          <ul className="grid md:grid-cols-2 gap-3 mt-3">
            <li className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-white block mb-0.5">Contact Identifiers</strong>
                <span className="text-xs text-slate-400">Customer telephone numbers, WhatsApp User IDs (WAID), and public profile names provided by Meta.</span>
              </div>
            </li>
            <li className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-white block mb-0.5">Message Content & Media</strong>
                <span className="text-xs text-slate-400">Inbound and outbound text messages, multimedia attachments (images, voice notes, documents, location shares), and interactive button responses.</span>
              </div>
            </li>
            <li className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-white block mb-0.5">Status & Delivery Receipts</strong>
                <span className="text-xs text-slate-400">Timestamps, message statuses (sent, delivered, read, failed), error codes, and template approval statuses.</span>
              </div>
            </li>
            <li className="bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-white block mb-0.5">CRM & Transaction Metadata</strong>
                <span className="text-xs text-slate-400">Custom contact tags, order numbers, shipping details, internal agent notes, and automation pipeline stages.</span>
              </div>
            </li>
          </ul>
        </section>

        {/* 3. Third-Party Processing & Meta Cloud API */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            3. Third-Party Service Providers & Meta Platforms Infrastructure
          </h2>
          <p>
            Whatlify leverages official Meta APIs to transmit and receive WhatsApp messages:
          </p>
          <div className="bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-emerald-300 text-sm mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Meta WhatsApp Cloud API Processing
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All messages, media, and interactive flows transmitted through Whatlify are routed via Meta Platforms, Inc.&rsquo;s official WhatsApp Cloud API infrastructure. Data handled by Meta is governed by the <a href="https://www.whatsapp.com/legal/business-terms/" target="_blank" rel="noopener noreferrer" className="underline text-emerald-400">WhatsApp Business Terms of Service</a> and <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="underline text-emerald-400">Meta Privacy Policy</a>. We do not sell customer data to any third parties.
            </p>
          </div>
        </section>

        {/* 4. Purpose of Processing */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            4. Purpose of Data Processing
          </h2>
          <p>We process collected data solely for the following legitimate business purposes:</p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-xs md:text-sm pl-2">
            <li>Delivering, operating, and improving Whatlify omnichannel inbox and automation services.</li>
            <li>Enabling automated conversational AI workflows and instant chatbot customer service responses.</li>
            <li>Broadcasting permitted marketing, utility, and authentication message templates to opted-in users.</li>
            <li>Tracking sales pipelines, managing e-commerce customer orders, and recording customer service notes.</li>
            <li>Preventing abuse, verifying webhook integrity (<code className="text-emerald-400 bg-white/[0.05] px-1 py-0.5 rounded">x-hub-signature-256</code>), and ensuring adherence to Meta policies.</li>
          </ul>
        </section>

        {/* 5. Data Retention & Security */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            5. Data Retention & Security Safeguards
          </h2>
          <p>
            AlQaim Digital implements industry-standard technical, operational, and organizational security measures to protect your data against unauthorized access, loss, or disclosure:
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <strong className="text-white block mb-1 text-sm">Security Controls</strong>
              Encrypted transmission via TLS 1.3, encrypted database storage for sensitive credentials, tenant-level data isolation, and constant-time HMAC signature checks for all incoming webhooks.
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <strong className="text-white block mb-1 text-sm">Retention Period</strong>
              Chat records and CRM logs are retained during your active subscription period. You may request manual or automated data purging at any time.
            </div>
          </div>
        </section>

        {/* 6. User Rights & Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            6. Your Rights & Data Deletion
          </h2>
          <p>
            In accordance with GDPR, CCPA, and Meta Platform Policies, you have the right to access, rectify, or permanently delete your personal information stored in Whatlify.
          </p>
          <p className="text-xs text-slate-400">
            To view detailed instructions on submitting a deletion request or triggering automated data purging, visit our dedicated <Link href="/data-deletion" className="text-emerald-400 underline font-medium">Data Deletion Instructions Page</Link>.
          </p>
        </section>

        {/* 7. Contact Information */}
        <section className="border-t border-white/[0.08] pt-8">
          <h2 className="text-lg font-bold text-white mb-2">7. Contact Us</h2>
          <p className="text-xs text-slate-400 mb-4">
            For privacy inquiries, legal notices, or data subject requests, please reach out directly:
          </p>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <div className="font-semibold text-white">AlQaim Digital &mdash; Whatlify Compliance Team</div>
              <div className="text-xs text-slate-400 mt-0.5">Email: privacy@whatlify.com | support@whatlify.com</div>
            </div>
            <a href="mailto:privacy@whatlify.com" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Email Privacy Officer
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-8 px-6 bg-[#04060e] text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Whatlify. Whatlify is a product owned and operated by AlQaim Digital. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <Link href="/privacy" className="text-emerald-400 underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          <Link href="/data-deletion" className="hover:text-slate-400 transition-colors">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
