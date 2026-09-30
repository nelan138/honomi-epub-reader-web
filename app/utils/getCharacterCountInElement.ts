export function getCharacterCOuntInElement(element: Element): number {
   // Drop noise tags
   for (const el of element.querySelectorAll("rt, rp, style, script")) {
      el.remove();
   }
   
   const rawText = element.textContent;

   // * only letters and numbers
   return rawText.match(UNICODE_GLYPH_REGEX)?.length ?? 0;
}
