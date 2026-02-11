/** Public targets that consent to scanning */
export const TARGETS = {
  /** nmap's official scan-me host */
  NMAP_SCANME: "scanme.nmap.org",
  /** Large domain with many subdomains */
  SUBDOMAIN_RICH: "tesla.com",
  /** Simple, stable public domain */
  EXAMPLE: "google.com",
  /** HTTPS variant */
  EXAMPLE_HTTPS: "https://google.com",
  /** For SSL/TLS tests */
  EXAMPLE_TLS: "google.com:443",
  /** Local httpbin for fuzzer/injection tests */
  HTTPBIN: "http://httpbin/",
  HTTPBIN_GET: "http://httpbin/get",
  HTTPBIN_STATUS_FUZZ: "http://httpbin/status/FUZZ",
  /** DVWA — accessible from inside Docker network */
  DVWA: "http://dvwa/",
  /** WordPress — accessible from inside Docker network */
  WORDPRESS: "http://wordpress/",
} as const;

/** Wordlist paths available inside Docker containers */
export const WORDLISTS = {
  COMMON_PATHS: "/wordlists/common-paths.txt",
  RESOLVERS: "/wordlists/resolvers.txt",
  SUBDOMAINS: "/wordlists/subdomains.txt",
} as const;
