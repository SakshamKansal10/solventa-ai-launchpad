import { useRouterState } from "@tanstack/react-router";

import { useTranslator } from "@/lib/i18n/LocaleProvider";
import { sanitizeNextPath } from "@/lib/safe-redirect";

/**
 * Never raw HTML (owner, 2026-11-17: an email link opened in the Gmail app on an iPhone showed the
 * page unstyled — "Skip to content", plain blue links, "Opening your workspace…" — because the
 * site's CSS and JS files were refused, a Vercel firewall challenge the in-app browser could not
 * pass). Three layers, all in the server HTML so they work with no file loaded:
 *
 * 1. FALLBACK_CSS (inline, low specificity) hides the page and shows #sol-fallback. The main
 *    stylesheet undoes both with higher specificity (styles.css, end) — so the page shows when the
 *    stylesheet loads, wherever React places it in <head>, and only the styled panel shows when it
 *    does not.
 * 2. BOOT_SCRIPT (inline ES5) marks the page "stuck" if the app's JavaScript has not started
 *    within 12 s (blocked files, or a browser too old to run them); the panel then shows over the
 *    styled page. The app clears the mark once it runs (RootComponent).
 * 3. POLYFILLS (inline ES5): the few newer built-ins the bundle calls that iOS 15 lacks.
 */
export const FALLBACK_CSS = `body{visibility:hidden}#sol-fallback{visibility:visible;display:flex;position:fixed;inset:0;z-index:2147483647;align-items:center;justify-content:center;padding:24px;background:#F7F7F4;color:#101C32;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans Devanagari',sans-serif;text-align:left}#sol-fallback .b{max-width:420px;width:100%;background:#fff;border:1px solid #E4E8F1;border-radius:20px;padding:28px 24px}#sol-fallback .w{font-weight:600;letter-spacing:4px;font-size:14px;margin:0 0 18px;color:#101C32}#sol-fallback .t{font-size:22px;line-height:1.3;margin:0 0 10px;font-weight:600;color:#101C32}#sol-fallback p{margin:0 0 14px;color:#3B4666}#sol-fallback .a{display:block;text-align:center;background:#101C32;color:#fff;text-decoration:none;font-weight:600;border-radius:999px;padding:14px 20px;margin:20px 0 12px;min-height:20px}#sol-fallback .s{display:block;text-align:center;color:#315EDB;font-weight:500;padding:8px;text-decoration:underline}html[data-sol-stuck] body #sol-fallback.sol-fallback{display:flex!important;visibility:visible!important}`;

export const BOOT_SCRIPT = `(function(){try{var d=document.documentElement;setTimeout(function(){if(!d.hasAttribute("data-sol-booted"))d.setAttribute("data-sol-stuck","")},12000)}catch(e){}})();`;

export const POLYFILLS = `(function(){function at(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;if(n<0||n>=this.length)return undefined;return this[n]}var P=[Array.prototype,String.prototype];for(var i=0;i<P.length;i++)if(!P[i].at)Object.defineProperty(P[i],"at",{value:at,writable:true,configurable:true});if(!Object.hasOwn)Object.defineProperty(Object,"hasOwn",{value:function(o,k){return Object.prototype.hasOwnProperty.call(o,k)},writable:true,configurable:true});var A=Array.prototype;if(!A.toSorted)Object.defineProperty(A,"toSorted",{value:function(f){return this.slice().sort(f)},writable:true,configurable:true});if(!A.toReversed)Object.defineProperty(A,"toReversed",{value:function(){return this.slice().reverse()},writable:true,configurable:true});if(!A.findLast)Object.defineProperty(A,"findLast",{value:function(f,t){for(var i=this.length-1;i>=0;i--)if(f.call(t,this[i],i,this))return this[i]},writable:true,configurable:true});if(!A.findLastIndex)Object.defineProperty(A,"findLastIndex",{value:function(f,t){for(var i=this.length-1;i>=0;i--)if(f.call(t,this[i],i,this))return i;return -1},writable:true,configurable:true});if(typeof structuredClone!=="function")window.structuredClone=function(v){return JSON.parse(JSON.stringify(v))}})();`;

/** The styled panel the layers above show. Plain links: it must work with no JavaScript. */
export function LoadFallback() {
  const t = useTranslator();
  const href = useRouterState({ select: (s) => s.location.href });
  const here = sanitizeNextPath(href) ?? "/";
  const signIn = here.startsWith("/sign-in") ? here : `/sign-in?next=${encodeURIComponent(here)}`;
  return (
    <div id="sol-fallback" className="sol-fallback" role="alert" data-testid="load-fallback">
      <div className="b">
        <p className="w">SOLVENTIA</p>
        {/* Not an <h1>: the panel is in every page's HTML (hidden when the page loads), and a
            page has one main heading. */}
        <p className="t">{t("shell.fallback.title")}</p>
        <p>{t("shell.fallback.body")}</p>
        <a className="a" href={here}>
          {t("shell.fallback.retry")}
        </a>
        <p>{t("shell.fallback.safari")}</p>
        <a className="s" href={signIn}>
          {t("shell.fallback.signIn")}
        </a>
      </div>
    </div>
  );
}
