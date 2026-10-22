import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

/** A shell command with a button that copies it. */
export function CopyCommand({ command, className = "" }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const reset = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(reset);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Without clipboard access the command stays on screen to select by hand.
    }
  };

  return (
    <div className={`command ${className}`}>
      <code>
        <span className="command-prompt" aria-hidden="true">
          ${" "}
        </span>
        {command}
      </code>
      <button type="button" className="command-copy" onClick={copy} aria-label={`Copy ${command}`} data-copied={copied}>
        <span className="swap swap-copy">
          <CopyIcon />
        </span>
        <span className="swap swap-check">
          <CheckIcon />
        </span>
      </button>
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
