interface CrtShResponse {
    issuer_ca_id: number;
    issuer_name: string;
    common_name: string;
    name_value: string;
    id: number;
    entry_timestamp: string;
    not_before: string;
    not_after: string;
    serial_number: string;
    result_count: number;
}


export interface CrtShOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}

export async function GetCrtSh(target: string, options?: CrtShOptions): Promise<string[]> {
    const subdomains = await sendReqCrtSh(target, options);
    var results  = ClearResult(subdomains,target)
    return results;
}

async function sendReqCrtSh(query: string, options?: CrtShOptions): Promise<string[]> {
    try {
        const signals: AbortSignal[] = [];
        if (options?.signal) signals.push(options.signal);
        if (options?.timeoutMs) signals.push(AbortSignal.timeout(options.timeoutMs));
        const fetchOptions: RequestInit = signals.length > 0 ? { signal: AbortSignal.any(signals) } : {};

        const response = await fetch(`https://crt.sh/?q=${query}&output=json`, fetchOptions);

        if (!response.ok) {
            return [];
        }

        const crtshResponse: CrtShResponse[] = await response.json();
        const domains: string[] = [];

        for (const crtshResp of crtshResponse) {
            // NameValue'yi parse et ve domains array'ine ekle
            const nameValues = parseNameValue(crtshResp.name_value);
            domains.push(...nameValues);
        }

        return domains;
    } catch (error) {
        console.error("Error fetching from crt.sh:", error);
        return [];
    }
}

function parseNameValue(nameValue: string): string[] {
    // \n karakterine göre böl
    const values = nameValue.split("\n");

    // Boş değerleri filtrele
    const result = values.filter(v => v !== "");

    return result;
}

function ClearResult(result: string[], name: string): string[] {
   
    const escapedName = name.replace(/\./g, "\\.");

    
    const re = new RegExp(`[^.]+\\.${escapedName}\\b`);

    const unique: { [key: string]: boolean } = {};
    const uniqueList: string[] = [];

    
    for (const val of result) {
        if (!unique[val]) {
            if (re.test(val)) {
                unique[val] = true;
                uniqueList.push(val);
            }
        }
    }

    return uniqueList;
}