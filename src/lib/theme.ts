export type Theme = "light" | "dark";

export const THEME_COOKIE = "fm_theme";
export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Runs before first paint, so a returning visitor never sees a light flash before the
 * dark class lands. The server already applies the cookie; this only has to cover the
 * first visit, where the choice comes from the OS and the server cannot know it.
 */
export const THEME_BOOTSTRAP = `(function(){try{
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);
var t=m?m[1]:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.classList.toggle('dark',t==='dark');
}catch(e){}})()`;
