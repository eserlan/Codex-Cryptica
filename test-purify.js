import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const purify = DOMPurify(window);

const html = '<img src="blob:http://localhost:5173/1234" />';
const sanitized = purify.sanitize(html, {
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
});

console.log("With custom regex:", sanitized);

const sanitized2 = purify.sanitize(html);
console.log("Without custom regex:", sanitized2);
