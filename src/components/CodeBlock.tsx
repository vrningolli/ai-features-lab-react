import { useState } from "react";
import type { CodeSample } from "../data/curriculum";

export function CodeBlock({ sample }: { sample?: CodeSample }) {
  const [copied, setCopied] = useState(false);
  if (!sample) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(sample!.body);
    } catch {
      // Fallback for non-secure contexts (e.g. opened as file://)
      const ta = document.createElement("textarea");
      ta.value = sample!.body;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="code-wrap">
      <div className="code-head">
        <span>{sample.file}</span>
        <button className={"copy-btn" + (copied ? " copied" : "")} onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{sample.body}</code>
      </pre>
    </div>
  );
}
