let dvwaInitialized = false;

/**
 * Auto-initializes DVWA database by POSTing to /setup.php.
 * Call once before running DVWA-dependent tests.
 * Idempotent — safe to call multiple times.
 */
export async function ensureDvwaSetup(): Promise<void> {
  if (dvwaInitialized) return;
  const port = Number(process.env.DVWA_PORT || 8082);
  try {
    await fetch(`http://localhost:${port}/setup.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "create_db=Create+%2F+Reset+Database",
      signal: AbortSignal.timeout(10000),
    });
    dvwaInitialized = true;
  } catch {
    // DVWA might not need setup or might be pre-configured — continue anyway
  }
}
