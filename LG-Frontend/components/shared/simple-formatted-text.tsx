"use client";

export function SimpleFormattedText({ text }: { text: string }) {
  const sanitize = (html: string) =>
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');

  const format = (t: string) =>
    sanitize(
      t
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-text-heading">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
        .replace(
          /`(.+?)`/g,
          '<code class="bg-primary/5 px-1.5 py-0.5 rounded text-xs font-mono text-primary border border-primary/10">$1</code>'
        )
        .replace(/₹(\d+(?:\.\d+)?)/g, '<span class="font-semibold text-primary">₹$1</span>')
    );

  return (
    <div className="text-[14px] text-text-body/90 leading-relaxed">
      <p dangerouslySetInnerHTML={{ __html: format(text) }} />
    </div>
  );
}
