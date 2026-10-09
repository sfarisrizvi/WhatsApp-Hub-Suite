import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import logoPath from "@assets/WA CRM favicon.webp";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        if (!username.trim()) {
          toast({ title: "Username is required", variant: "destructive" });
          return;
        }
        await register({ email, username: username.trim(), password, firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined });
      }
      setLocation("/");
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      let parsed = msg;
      try {
        const body = JSON.parse(msg);
        parsed = body.message || msg;
      } catch {}
      toast({ title: parsed, variant: "destructive" });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <a href="/" className="flex items-center gap-2 group" data-testid="link-home">
            <img src={logoPath} alt="Whatlify" className="h-10 w-10 rounded-lg shadow-md" />
            <span className="text-xl font-bold">Whatlify</span>
          </a>
        </div>

        <Card className="shadow-lg border-white/[0.08]">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl" data-testid="text-auth-title">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your Whatlify account by AlQaim Digital"
                : "Get started with Whatlify for free"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Meta Reviewer Quick-Fill Banner */}
            {mode === "login" && (
              <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-emerald-400 block">Meta App Reviewer?</span>
                  <span className="text-muted-foreground text-[11px]">One-click test credentials</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  onClick={() => {
                    setEmail("meta-reviewer@whatlify.com");
                    setPassword("ReviewPass2026!");
                    toast({ title: "Meta Reviewer credentials filled!" });
                  }}
                >
                  Fill Demo Login
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              {mode === "register" && (
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    required
                    data-testid="input-username"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
                size="lg"
                disabled={isPending}
                data-testid="button-submit-auth"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              {mode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-[#25D366] hover:underline font-medium"
                    data-testid="button-switch-to-register"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-[#25D366] hover:underline font-medium"
                    data-testid="button-switch-to-login"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-3">
          <a href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-home">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </a>
          <div className="flex justify-center gap-3 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <span>&bull;</span>
            <a href="/terms" className="hover:underline">Terms of Service</a>
            <span>&bull;</span>
            <a href="/data-deletion" className="hover:underline">Data Deletion</a>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            &copy; {new Date().getFullYear()} Whatlify by AlQaim Digital. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
