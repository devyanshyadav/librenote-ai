"use client";

import type React from "react";
import { useState } from "react";

export function ClipboardButton({
  text,
  beforeCopy,
  afterCopy,
  className,
}: {
  text: string;
  beforeCopy: React.ReactNode;
  afterCopy: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className={className} type="button">
      {copied ? afterCopy : beforeCopy}
    </button>
  );
}
