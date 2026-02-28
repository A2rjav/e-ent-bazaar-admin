"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/ui/phone-input";
import { useUIStore } from "@/store/ui.store";
import { api } from "@/lib/api";
import { isValidPhone, normalizePhone, extractCountryCode, formatPhone, PHONE_ERROR } from "@/lib/phone";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type Step = "phone" | "otp" | "api-key";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUIStore();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+91 ");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-focus first OTP input when step changes
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // --- Send OTP ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }

    const normalized = normalizePhone(phone);
    const countryCode = extractCountryCode(normalized);
    setIsLoading(true);
    try {
      const result = await api.sendOtp(normalized, countryCode);
      if (result.code) setDevOtpCode(result.code);
      setStep("otp");
      setResendTimer(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("401")) {
        setError("No admin account found with this phone number.");
      } else if (message.includes("429")) {
        setError("Too many attempts. Please wait before trying again.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Verify OTP ---
  const handleVerifyOtp = useCallback(async (otpValue: string[]) => {
    const code = otpValue.join("");
    if (code.length !== 6) return;

    setError("");
    setIsLoading(true);

    const normalized = normalizePhone(phone);
    const countryCode = extractCountryCode(normalized);
    try {
      // api.verifyOtp stores the token internally and fetches user profile
      const response = await api.verifyOtp(normalized, code, countryCode);
      login(response.user);
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("429")) {
        setError("Too many attempts. Please wait before trying again.");
      } else {
        setError("Invalid OTP. Please try again.");
      }
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  }, [phone, login, router]);

  // --- OTP input handling ---
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newOtp.every((d) => d !== "")) {
      handleVerifyOtp(newOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    // Focus the next empty or the last filled
    const nextEmpty = newOtp.findIndex((d) => !d);
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (newOtp.every((d) => d !== "")) {
      handleVerifyOtp(newOtp);
    }
  };

  // --- Resend OTP ---
  const handleResend = async () => {
    setError("");
    const normalized = normalizePhone(phone);
    const countryCode = extractCountryCode(normalized);
    try {
      const result = await api.sendOtp(normalized, countryCode);
      if (result.code) setDevOtpCode(result.code);
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  // --- API Key Login ---
  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await api.loginWithApiKey(apiKey);
      login(response.user);
      router.push("/dashboard");
    } catch {
      setError("Invalid API key. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Google SSO (Demo bypass) ---
  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      // OTP auth is now live. Google SSO keeps working as a quick demo bypass.
      const demoUser = {
        id: "demo-admin-001",
        email: "admin@entbazaar.com",
        name: "Admin User",
        phone: "+919876543210",
        isActive: true,
        role: "super_admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginAttempts: 0,
        blockedUntil: null,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("ent-bazaar-auth", "demo-token");
        localStorage.setItem("ent-bazaar-demo-user", JSON.stringify(demoUser));
      }
      login(demoUser);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const anyLoading = isLoading || isGoogleLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
            <Package className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">e-ENT Bazaar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Admin Panel — Sign in to continue
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Demo Sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-3 h-11"
            onClick={handleGoogleSignIn}
            disabled={anyLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Sign in with Google (Demo)
          </Button>

          {/* Divider */}
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or continue with phone
            </span>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* ===== STEP 1: Phone Number ===== */}
          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium leading-none">
                  Phone Number
                </label>
                <PhoneInput
                  id="phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={anyLoading}
                  placeholder="Enter phone number"
                />
              </div>

              <Button type="submit" className="w-full" disabled={anyLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setError(""); setStep("api-key"); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  disabled={anyLoading}
                >
                  Use API key instead
                </button>
              </div>
            </form>
          )}

          {/* ===== STEP 2: OTP Verification ===== */}
          {step === "otp" && (
            <div className="space-y-5">
              {/* Back + info */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    setDevOtpCode(null);
                  }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={anyLoading}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change number
                </button>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-foreground">{formatPhone(phone)}</span>
                </p>
                {devOtpCode && (
                  <button
                    type="button"
                    onClick={() => setOtp(devOtpCode.split(""))}
                    className="inline-block rounded bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 font-mono tracking-widest hover:bg-amber-100 transition-colors"
                    title="Click to auto-fill"
                  >
                    Dev OTP: {devOtpCode}
                  </button>
                )}
              </div>

              {/* OTP Input Boxes */}
              <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={anyLoading}
                    className="h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-semibold shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  />
                ))}
              </div>

              {/* Verify button */}
              <Button
                className="w-full"
                disabled={anyLoading || otp.some((d) => !d)}
                onClick={() => handleVerifyOtp(otp)}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Sign In
              </Button>

              {/* Resend */}
              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Resend OTP in <span className="font-medium">{resendTimer}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs text-primary hover:underline font-medium"
                    disabled={anyLoading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}
          {/* ===== STEP 3: API Key ===== */}
          {step === "api-key" && (
            <form onSubmit={handleApiKeyLogin} className="space-y-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setError(""); setApiKey(""); }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={anyLoading}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to phone login
                </button>
                <label htmlFor="apiKey" className="block text-sm font-medium leading-none">
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                  disabled={anyLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>
              <Button type="submit" className="w-full" disabled={anyLoading || !apiKey}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In with API Key
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
