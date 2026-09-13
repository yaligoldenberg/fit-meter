/**
 * The name sits on a signal baseline — the zero line every reading on the site is
 * measured from, so the mark states what the product does before any copy does.
 */
export default function Wordmark({
  size = "text-3xl",
  tone = "dark",
}: {
  size?: string;
  /** `light` for the mark sitting on the signal field. */
  tone?: "dark" | "light";
}) {
  const line = tone === "light" ? "border-paper" : "border-signal";
  const text = tone === "light" ? "text-paper" : "text-ink";
  return (
    <span className={`inline-block border-b-[3px] pb-0.5 ${line}`} dir="ltr">
      <span className={`block font-display leading-none ${text} ${size}`}>FITMETER</span>
    </span>
  );
}
