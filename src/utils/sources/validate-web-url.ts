import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError, toUserFacingError } from "@/lib/app-error";

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0.0.0.0") {
    return true;
  }

  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.")
  ) {
    return true;
  }

  if (ip.startsWith("172.")) {
    const secondOctet = Number(ip.split(".")[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }

  return false;
}

export async function assertSafeWebUrl(urlString: string): Promise<URL> {
  let url: URL;

  const normalized = urlString.trim();

  if (!normalized) {
    throw new AppError("Please enter a URL.");
  }

  const withProtocol = /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new AppError("Please enter a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError("Only HTTP and HTTPS URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new AppError("This URL is not allowed.");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new AppError("This URL is not allowed.");
    }
    return url;
  }

  try {
    const resolved = await lookup(hostname, { verbatim: true });

    if (isPrivateIp(resolved.address)) {
      throw new AppError("This URL is not allowed.");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw toUserFacingError(
      error,
      "This website could not be found. Check the URL and try again.",
    );
  }

  return url;
}
