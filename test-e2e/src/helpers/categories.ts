import { isTargetReachable } from "./health.js";

export enum TestCategory {
  /** Tools that hit public targets — always run */
  PUBLIC = "PUBLIC",
  /** Tools that need local httpbin — run if httpbin is up */
  LOCAL = "LOCAL",
  /** Tools that need no external target */
  SELF_CONTAINED = "SELF_CONTAINED",
  /** Tools that need API keys / credentials */
  CREDENTIAL = "CREDENTIAL",
  /** Tools that need DVWA vulnerable target */
  VULN_DVWA = "VULN_DVWA",
  /** Tools that need WordPress target */
  VULN_WORDPRESS = "VULN_WORDPRESS",
  /** Tools that need root / privileged mode */
  PRIVILEGED = "PRIVILEGED",
}

export async function shouldSkip(category: TestCategory): Promise<string | false> {
  switch (category) {
    case TestCategory.PUBLIC:
    case TestCategory.SELF_CONTAINED:
      return false;

    case TestCategory.LOCAL:
      return (await isTargetReachable("httpbin")) ? false : "httpbin not available";

    case TestCategory.CREDENTIAL:
      return false; // individual tests check their own env vars

    case TestCategory.VULN_DVWA:
      return (await isTargetReachable("dvwa")) ? false : "DVWA not available";

    case TestCategory.VULN_WORDPRESS:
      return (await isTargetReachable("wordpress")) ? false : "WordPress not available";

    case TestCategory.PRIVILEGED:
      return process.env.E2E_RUN_PRIVILEGED === "true"
        ? false
        : "privileged tests disabled (set E2E_RUN_PRIVILEGED=true)";
  }
}
