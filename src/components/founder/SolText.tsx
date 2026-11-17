import { Fragment } from "react";

/**
 * Text with the assistant's name kept as "Sol" (owner, 2026-11-17: on an iPhone in the Google app
 * the fixed line "Sol is thinking…" showed as "Soul is thinking…" — the page was rewritten on the
 * phone). Every "Sol" is marked untranslatable (translate="no", the "notranslate" class Google's
 * translator honours, lang="en"), so no browser translation or correction can change the name.
 * Words like "Solventia" are left alone.
 */
export function SolText({ text }: { text: string }) {
  const parts = text.split(/\b(Sol)\b/);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p === "Sol" && i % 2 === 1 ? (
          <span key={i} translate="no" className="notranslate" lang="en" data-sol-name="">
            Sol
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
