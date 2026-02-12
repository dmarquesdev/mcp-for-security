/** Read target from environment with fallback default */
const env = (key: string, fallback: string): string =>
  process.env[`E2E_TARGET_${key}`] || fallback;

/** Read wordlist path from environment with fallback default */
const wl = (key: string, fallback: string): string =>
  process.env[`E2E_WORDLIST_${key}`] || fallback;

// Base values used to derive HTTPS/TLS/sub-path variants
const example = env("EXAMPLE", "google.com");
const httpbin = env("HTTPBIN", "http://httpbin/");

/** Public targets that consent to scanning — override via E2E_TARGET_* env vars */
export const TARGETS = {
  /** nmap's official scan-me host */
  NMAP_SCANME: env("NMAP_SCANME", "scanme.nmap.org"),
  /** Large domain with many subdomains */
  SUBDOMAIN_RICH: env("SUBDOMAIN_RICH", "tesla.com"),
  /** Simple, stable public domain */
  EXAMPLE: example,
  /** HTTPS variant (derived from EXAMPLE unless overridden) */
  EXAMPLE_HTTPS: env("EXAMPLE_HTTPS", `https://${example}`),
  /** For SSL/TLS tests (derived from EXAMPLE unless overridden) */
  EXAMPLE_TLS: env("EXAMPLE_TLS", `${example}:443`),
  /** Domain for permutation testing (RFC-reserved) */
  PERMUTATION_DOMAIN: env("PERMUTATION_DOMAIN", "api.example.com"),
  /** Base domain for permutation assertion */
  PERMUTATION_BASE: env("PERMUTATION_BASE", "example.com"),
  /** Cloudflare ASN for ASN mapping tests */
  CLOUDFLARE_ASN: env("CLOUDFLARE_ASN", "AS13335"),
  /** Cloudflare IP for ASN mapping tests */
  CLOUDFLARE_IP: env("CLOUDFLARE_IP", "1.1.1.1"),
  /** Cloudflare domain for ASN mapping tests */
  CLOUDFLARE_DOMAIN: env("CLOUDFLARE_DOMAIN", "cloudflare.com"),
  /** Cloudflare org name for ASN mapping tests */
  CLOUDFLARE_ORG: env("CLOUDFLARE_ORG", "CLOUDFLARE"),
  /** Local httpbin for fuzzer/injection tests */
  HTTPBIN: httpbin,
  /** httpbin /get endpoint (derived from HTTPBIN unless overridden) */
  HTTPBIN_GET: env("HTTPBIN_GET", `${httpbin}get`),
  /** httpbin FUZZ endpoint (derived from HTTPBIN unless overridden) */
  HTTPBIN_STATUS_FUZZ: env("HTTPBIN_STATUS_FUZZ", `${httpbin}status/FUZZ`),
  /** DVWA — accessible from inside Docker network */
  DVWA: env("DVWA", "http://dvwa/"),
  /** WordPress — accessible from inside Docker network */
  WORDPRESS: env("WORDPRESS", "http://wordpress/"),
};

/** Wordlist paths available inside Docker containers — override via E2E_WORDLIST_* env vars */
export const WORDLISTS = {
  COMMON_PATHS: wl("COMMON_PATHS", "/wordlists/common-paths.txt"),
  RESOLVERS: wl("RESOLVERS", "/wordlists/resolvers.txt"),
  SUBDOMAINS: wl("SUBDOMAINS", "/wordlists/subdomains.txt"),
};
