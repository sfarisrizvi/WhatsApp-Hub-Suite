import React from "react";
import { Link } from "wouter";
import { FileText, ArrowLeft, Mail, AlertTriangle, ShieldCheck } from "lucide-react";
import logoPath from "@assets/WA CRM favicon.webp";

export default function TermsOfService() {
  const lastUpdated = "October 2026";

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <FileText className="w-3.5 h-3.5" /> Agreement & Rules
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Please read these Terms of Service carefully before accessing or using Whatlify, operated by <strong className="text-white">AlQaim Digital</strong>.
          </p>
          <div className="mt-4 text-xs text-slate-500">
            Last Updated: {lastUpdated} &bull; Effective Immediately
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10 text-sm leading-relaxed">
        {/* 1. Acceptance & Ownership */}
        <section className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 md:p-8">
          <h2 className="text-base font-bold text-white mb-3">
            1. Acceptance of Terms & Legal Ownership
          </h2>
          <p className="text-slate-300">
            By creating an account, accessing, or using Whatlify (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). <strong>Whatlify is owned, managed, and operated by AlQaim Digital</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). If you are using the Service on behalf of an organization or business, you represent that you have legal authority to bind that entity to these Terms.
          </p>
        </section>

        {/* 2. Mandatory WhatsApp Compliance */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            2. Compliance with Meta WhatsApp Business Policies
          </div>
          <div className="bg-amber-500/[0.05] border border-amber-500/20 rounded-xl p-5">
            <h3 className="font-semibold text-amber-300 text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Crucial Requirement for All Users
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Whatlify integrates directly with the Meta WhatsApp Cloud API. As an express condition of using our platform, you agree to strictly comply with all applicable Meta policies, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 mt-2 pl-2">
              <li><a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="underline text-amber-400">WhatsApp Business Messaging Policy</a></li>
              <li><a href="https://www.whatsapp.com/legal/commerce-policy/" target="_blank" rel="noopener noreferrer" className="underline text-amber-400">WhatsApp Commerce Policy</a></li>
              <li><a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" className="underline text-amber-400">Meta Developer Platform Terms</a></li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            <strong>Explicit Opt-in Requirement:</strong> You must maintain valid, documented opt-in consent from all recipient contacts prior to sending proactive business templates or marketing broadcasts. Sending unsolicited messages, spam, phishing, deceptive materials, or prohibited goods (as outlined in the WhatsApp Commerce Policy) is strictly prohibited and results in immediate, non-refundable termination of your account.
          </p>
        </section>

        {/* 3. Account Responsibilities */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            3. Account Registration & Security
          </h2>
          <p>
            You must provide accurate, complete, and current information when registering an account. You are solely responsible for maintaining the confidentiality of your credentials and Meta access tokens. You must immediately notify AlQaim Digital of any unauthorized use or security compromise of your workspace.
          </p>
        </section>

        {/* 4. Service Description & API Limitations */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            4. Service Scope & Third-Party Limitations
          </h2>
          <p>
            Whatlify provides tools for message composition, workflow automation, contact management, and WhatsApp Cloud API dispatch. You acknowledge that message delivery, template approval, phone number verification, and throughput limits are governed and enforced independently by Meta Platforms, Inc. AlQaim Digital does not guarantee template approvals by Meta and is not liable for service interruptions caused by third-party API downtime.
          </p>
        </section>

        {/* 5. Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            5. Intellectual Property
          </h2>
          <p>
            The Whatlify platform, including source code, design, logos, trademarks, and documentation, is the exclusive intellectual property of AlQaim Digital. You retain full ownership of the customer data, contacts, and message content you upload or transmit through your workspace.
          </p>
        </section>

        {/* 6. Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            6. Disclaimer & Limitation of Liability
          </h2>
          <p className="text-xs text-slate-400">
            To the maximum extent permitted by applicable law, Whatlify is provided &ldquo;as is&rdquo; without warranties of any kind. In no event shall AlQaim Digital be liable for indirect, incidental, consequential, or punitive damages, including loss of business, profits, or data, arising from your use of or inability to use the Service.
          </p>
        </section>

        {/* 7. Termination */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-white/[0.08] pb-2">
            7. Termination & Account Deletion
          </h2>
          <p>
            You may terminate your account at any time by contacting our support team or deleting your workspace. We reserve the right to suspend or terminate access if you violate these Terms or Meta policies. Upon termination, data deletion will be handled according to our <Link href="/data-deletion" className="text-emerald-400 underline">Data Deletion Policy</Link>.
          </p>
        </section>

        {/* 8. Contact */}
        <section className="border-t border-white/[0.08] pt-8">
          <h2 className="text-lg font-bold text-white mb-2">8. Governing Law & Contact</h2>
          <p className="text-xs text-slate-400 mb-4">
            If you have questions regarding these Terms, contact our legal representatives:
          </p>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <div className="font-semibold text-white">AlQaim Digital &mdash; Legal Department</div>
              <div className="text-xs text-slate-400 mt-0.5">Email: support@whatlify.com | legal@whatlify.com</div>
            </div>
            <a href="mailto:support@whatlify.com" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Contact Legal Support
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-8 px-6 bg-[#04060e] text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Whatlify. Whatlify is a product owned and operated by AlQaim Digital. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-emerald-400 underline">Terms of Service</Link>
          <Link href="/data-deletion" className="hover:text-slate-400 transition-colors">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
