export interface ShodanRequestOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}

export class ShodanClient {
    private readonly baseUrl = "https://api.shodan.io";
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private buildFetchOptions(options?: ShodanRequestOptions): RequestInit {
        const signals: AbortSignal[] = [];
        if (options?.signal) signals.push(options.signal);
        if (options?.timeoutMs) signals.push(AbortSignal.timeout(options.timeoutMs));
        return signals.length > 0 ? { signal: AbortSignal.any(signals) } : {};
    }

    private async get<T>(path: string, params?: Record<string, string>, options?: ShodanRequestOptions): Promise<T> {
        const url = new URL(path, this.baseUrl);
        url.searchParams.set("key", this.apiKey);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                url.searchParams.set(k, v);
            }
        }
        const fetchOptions = this.buildFetchOptions(options);
        const response = await fetch(url.toString(), fetchOptions);
        if (!response.ok) {
            let errorMessage = `Shodan API error: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json() as { error?: string };
                if (errorBody.error) {
                    errorMessage = `Shodan API error: ${errorBody.error}`;
                }
            } catch {
                // ignore JSON parse errors on error responses
            }
            throw new Error(errorMessage);
        }
        return response.json() as Promise<T>;
    }

    /** Get all available information on an IP address */
    async hostInfo(ip: string, options?: ShodanRequestOptions & { history?: boolean; minify?: boolean }): Promise<unknown> {
        const params: Record<string, string> = {};
        if (options?.history) params.history = "true";
        if (options?.minify) params.minify = "true";
        return this.get(`/shodan/host/${encodeURIComponent(ip)}`, params, options);
    }

    /** Search Shodan using the same query syntax as the website */
    async search(query: string, options?: ShodanRequestOptions & { facets?: string; page?: number; minify?: boolean }): Promise<unknown> {
        const params: Record<string, string> = { query };
        if (options?.facets) params.facets = options.facets;
        if (options?.page !== undefined) params.page = String(options.page);
        if (options?.minify) params.minify = "true";
        return this.get("/shodan/host/search", params, options);
    }

    /** Search Shodan without results — returns total count and facet information */
    async searchCount(query: string, options?: ShodanRequestOptions & { facets?: string }): Promise<unknown> {
        const params: Record<string, string> = { query };
        if (options?.facets) params.facets = options.facets;
        return this.get("/shodan/host/count", params, options);
    }

    /** Resolve hostnames to IPs */
    async dnsResolve(hostnames: string[], options?: ShodanRequestOptions): Promise<unknown> {
        return this.get("/dns/resolve", { hostnames: hostnames.join(",") }, options);
    }

    /** Reverse DNS lookup for IPs */
    async dnsReverse(ips: string[], options?: ShodanRequestOptions): Promise<unknown> {
        return this.get("/dns/reverse", { ips: ips.join(",") }, options);
    }

    /** Get subdomains and DNS entries for a domain */
    async dnsDomain(domain: string, options?: ShodanRequestOptions & { history?: boolean; type?: string; page?: number }): Promise<unknown> {
        const params: Record<string, string> = {};
        if (options?.history) params.history = "true";
        if (options?.type) params.type = options.type;
        if (options?.page !== undefined) params.page = String(options.page);
        return this.get(`/dns/domain/${encodeURIComponent(domain)}`, params, options);
    }

    /** Get API plan and usage information */
    async apiInfo(options?: ShodanRequestOptions): Promise<unknown> {
        return this.get("/api-info", undefined, options);
    }

    /** List all ports that Shodan crawls */
    async ports(options?: ShodanRequestOptions): Promise<unknown> {
        return this.get("/shodan/ports", undefined, options);
    }

    /** List all protocols that can be used for scanning */
    async protocols(options?: ShodanRequestOptions): Promise<unknown> {
        return this.get("/shodan/protocols", undefined, options);
    }

    /** List all search filters */
    async searchFilters(options?: ShodanRequestOptions): Promise<unknown> {
        return this.get("/shodan/host/search/filters", undefined, options);
    }
}
