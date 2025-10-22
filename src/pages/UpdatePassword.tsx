/**
 * Password Reset Flow
 * 
 * IMPORTANT: For faster testing, consider disabling "Confirm email" in Supabase:
 * 1. Go to Supabase Dashboard > Authentication > Settings
 * 2. Under Email Auth, toggle OFF "Confirm email"
 * 3. This allows immediate password resets without email verification
 * 
 * Production: Keep email confirmation ENABLED for security
 * Development: Can disable for faster testing iteration
 * 
 * See PASSWORD_RESET_SETUP.md for detailed configuration instructions
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from '@/lib/logger';
import { useToast } from "@/hooks/use-toast";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Eye, EyeOff, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has valid session from password reset link
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setValidSession(false);
        setError("Invalid or expired password reset link. Please request a new one.");
      } else {
        setValidSession(true);
      }
    };
    checkSession();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Password updated successfully",
        description: "You can now sign in with your new password.",
      });

      // Redirect to research page
      navigate("/research");
    } catch (err: any) {
      logger.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validSession === null) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (validSession === false) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Reset Link Invalid</h1>
            <p className="text-muted-foreground">
              This password reset link has expired or is invalid.
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button
            onClick={() => navigate("/auth/sign-in")}
            className="w-full"
          >
            Back to Sign In
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pl-10 pr-10"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pl-10 pr-10"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
              >
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                Updating Password...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </motion.div>
    </AuthLayout>
  );
}
