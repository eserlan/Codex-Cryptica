import { describe, expect, it } from "vitest";
import {
  isIpInCidr,
  isIpInCidrs,
  isIpv4InCidr,
  isIpv6InCidr,
  normalizeIp,
  parseIpv4,
  parseIpv6,
} from "./cidr-matcher";

describe("cidr-matcher", () => {
  describe("normalizeIp", () => {
    it("trims and lowercases", () => {
      expect(normalizeIp("  192.168.1.1  ")).toBe("192.168.1.1");
      expect(normalizeIp(" 2001:0DB8::1 ")).toBe("2001:0db8::1");
    });

    it("extracts IPv4 from IPv4-mapped IPv6 address", () => {
      expect(normalizeIp("::ffff:192.0.2.1")).toBe("192.0.2.1");
      expect(normalizeIp("::FFFF:10.0.0.1")).toBe("10.0.0.1");
    });

    it("returns null for empty or invalid input", () => {
      expect(normalizeIp("")).toBeNull();
      expect(normalizeIp(null)).toBeNull();
      expect(normalizeIp(undefined)).toBeNull();
    });
  });

  describe("parseIpv4", () => {
    it("correctly parses valid IPv4 strings into 32-bit bigints", () => {
      expect(parseIpv4("0.0.0.0")).toBe(0n);
      expect(parseIpv4("255.255.255.255")).toBe(4294967295n);
      expect(parseIpv4("192.168.1.1")).toBe(3232235777n);
    });

    it("returns null for malformed IPv4 strings", () => {
      expect(parseIpv4("192.168.1")).toBeNull();
      expect(parseIpv4("192.168.1.1.1")).toBeNull();
      expect(parseIpv4("192.168.1.256")).toBeNull();
      expect(parseIpv4("192.168.1.-1")).toBeNull();
      expect(parseIpv4("192.168.1.foo")).toBeNull();
    });
  });

  describe("parseIpv6", () => {
    it("correctly parses standard full 8-segment IPv6", () => {
      const val = parseIpv6("2001:0db8:0000:0000:0000:0000:0000:0001");
      expect(val).not.toBeNull();
    });

    it("correctly parses compressed IPv6 addresses", () => {
      expect(parseIpv6("::1")).toBe(1n);
      expect(parseIpv6("::")).toBe(0n);
      expect(parseIpv6("2001:db8::1")).not.toBeNull();
      expect(parseIpv6("fe80::")).not.toBeNull();
    });

    it("returns null for invalid IPv6 notation", () => {
      expect(parseIpv6("2001::db8::1")).toBeNull(); // multiple ::
      expect(parseIpv6("2001:xyz::1")).toBeNull(); // non-hex
      expect(parseIpv6("1:2:3:4:5:6:7:8:9")).toBeNull(); // too many parts
    });
  });

  describe("isIpv4InCidr", () => {
    it("matches IP within subnet", () => {
      // 104.210.140.128/28 spans 104.210.140.128 - 104.210.140.143
      expect(isIpv4InCidr("104.210.140.128", "104.210.140.128/28")).toBe(true);
      expect(isIpv4InCidr("104.210.140.135", "104.210.140.128/28")).toBe(true);
      expect(isIpv4InCidr("104.210.140.143", "104.210.140.128/28")).toBe(true);
    });

    it("rejects IP outside subnet", () => {
      expect(isIpv4InCidr("104.210.140.127", "104.210.140.128/28")).toBe(false);
      expect(isIpv4InCidr("104.210.140.144", "104.210.140.128/28")).toBe(false);
      expect(isIpv4InCidr("1.1.1.1", "104.210.140.128/28")).toBe(false);
    });

    it("handles edge prefixes /32 and /0", () => {
      expect(isIpv4InCidr("192.168.1.1", "192.168.1.1/32")).toBe(true);
      expect(isIpv4InCidr("192.168.1.2", "192.168.1.1/32")).toBe(false);
      expect(isIpv4InCidr("8.8.8.8", "0.0.0.0/0")).toBe(true);
    });

    it("returns false for invalid arguments", () => {
      expect(isIpv4InCidr("invalid-ip", "10.0.0.0/8")).toBe(false);
      expect(isIpv4InCidr("10.0.0.1", "invalid-cidr")).toBe(false);
      expect(isIpv4InCidr("10.0.0.1", "10.0.0.0/33")).toBe(false);
    });
  });

  describe("isIpv6InCidr", () => {
    it("matches IPv6 within subnet", () => {
      expect(
        isIpv6InCidr("2001:4860:4801:10::1", "2001:4860:4801:10::/64"),
      ).toBe(true);
      expect(
        isIpv6InCidr(
          "2001:4860:4801:10:ffff:ffff:ffff:ffff",
          "2001:4860:4801:10::/64",
        ),
      ).toBe(true);
    });

    it("rejects IPv6 outside subnet", () => {
      expect(
        isIpv6InCidr("2001:4860:4801:11::1", "2001:4860:4801:10::/64"),
      ).toBe(false);
      expect(isIpv6InCidr("2600::1", "2001:4860:4801:10::/64")).toBe(false);
    });

    it("handles /128 and /0 edge prefixes", () => {
      expect(isIpv6InCidr("2001:db8::1", "2001:db8::1/128")).toBe(true);
      expect(isIpv6InCidr("2001:db8::2", "2001:db8::1/128")).toBe(false);
      expect(isIpv6InCidr("2001:db8::1", "::/0")).toBe(true);
    });
  });

  describe("isIpInCidr & isIpInCidrs", () => {
    it("checks across mixed IPv4 and IPv6 lists safely", () => {
      const cidrs = [
        "104.210.140.128/28",
        "2001:4860:4801:10::/64",
        "157.55.39.0/24",
      ];

      expect(isIpInCidrs("104.210.140.130", cidrs)).toBe(true);
      expect(isIpInCidrs("2001:4860:4801:10::55", cidrs)).toBe(true);
      expect(isIpInCidrs("157.55.39.5", cidrs)).toBe(true);

      // Outside
      expect(isIpInCidrs("1.1.1.1", cidrs)).toBe(false);
      expect(isIpInCidrs("2600::", cidrs)).toBe(false);
      expect(isIpInCidrs("", cidrs)).toBe(false);
      expect(isIpInCidrs(null, cidrs)).toBe(false);
      expect(isIpInCidrs("104.210.140.130", [])).toBe(false);
    });

    it("supports IPv4-mapped IPv6 addresses", () => {
      expect(isIpInCidr("::ffff:104.210.140.130", "104.210.140.128/28")).toBe(
        true,
      );
      expect(isIpInCidr("::ffff:1.1.1.1", "104.210.140.128/28")).toBe(false);
    });
  });
});
