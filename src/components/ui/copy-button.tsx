import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, CopyCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  content: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  successMessage?: string;
  className?: string;
}

export const CopyButton = ({
  content,
  variant = "outline",
  size = "sm",
  label = "Copy",
  successMessage = "Copied to clipboard",
  className,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      toast({
        description: successMessage,
        duration: 2000,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("gap-2", className)}
      disabled={copied}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          {size !== "icon" && "Copied"}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {size !== "icon" && label}
        </>
      )}
    </Button>
  );
};

interface CopyAllButtonProps {
  containerId?: string;
  selector?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  successMessage?: string;
  className?: string;
}

export const CopyAllButton = ({
  containerId,
  selector = "*",
  variant = "outline",
  size = "sm",
  label = "Copy All",
  successMessage = "All content copied to clipboard",
  className,
}: CopyAllButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyAll = async () => {
    try {
      let content = '';

      if (containerId) {
        // Copy from specific container
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error(`Container with id "${containerId}" not found`);
        }
        
        if (selector === "*") {
          content = container.innerText || container.textContent || '';
        } else {
          const elements = container.querySelectorAll(selector);
          content = Array.from(elements)
            .map(el => el.textContent || '')
            .filter(text => text.trim())
            .join('\n');
        }
      } else {
        // Copy entire page text
        content = document.body.innerText || document.body.textContent || '';
      }

      if (!content.trim()) {
        throw new Error('No content found to copy');
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      toast({
        description: successMessage,
        duration: 2000,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy all:', error);
      toast({
        description: "Failed to copy content to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopyAll}
      className={cn("gap-2", className)}
      disabled={copied}
    >
      {copied ? (
        <>
          <CopyCheck className="h-4 w-4" />
          {size !== "icon" && "Copied"}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {size !== "icon" && label}
        </>
      )}
    </Button>
  );
};
