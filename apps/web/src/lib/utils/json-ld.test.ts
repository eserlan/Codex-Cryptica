import { describe, it, expect } from "vitest";
import { safeJsonLd } from "./json-ld";

describe("safeJsonLd", () => {
  it("produces valid, round-trippable JSON", () => {
    const data = {
      "@type": "Person",
      name: "Bob",
      url: "https://x.test?a=1&b=2",
    };
    expect(JSON.parse(safeJsonLd(data))).toEqual(data);
  });

  it("escapes < so a </script> breakout is impossible", () => {
    const out = safeJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c");
    // still parses back to the original, dangerous-looking string
    expect(JSON.parse(out).name).toBe("</script><img src=x onerror=alert(1)>");
  });

  it("escapes every occurrence of <", () => {
    const out = safeJsonLd({ a: "<<<", b: "x<y<z" });
    expect(out.match(/\\u003c/g)).toHaveLength(5);
  });
});
