// Module-level session store for the active business context.
// Set on login, restored on page reload, cleared on logout.

let _businessId: string | null = null;

/** Set the active business ID (called at login and session restore). */
export function setBusinessId(id: string): void {
  _businessId = id;
}

/** Clear the active business ID (called at logout). */
export function clearBusinessId(): void {
  _businessId = null;
}

/** Get the active business ID. Throws if not set. */
export function getBusinessId(): string {
  if (!_businessId) {
    throw new Error('Business ID not initialized. Ensure the user is logged in before calling services.');
  }
  return _businessId;
}
