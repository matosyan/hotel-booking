export class VendorTimeoutError extends Error {
  constructor() {
    super('Vendor API timed out');
    this.name = 'VendorTimeoutError';
  }
}

export class VendorUnavailableError extends Error {
  constructor() {
    super('Vendor service unavailable (503)');
    this.name = 'VendorUnavailableError';
  }
}

export class VendorRejectionError extends Error {
  constructor() {
    super('Booking rejected by vendor');
    this.name = 'VendorRejectionError';
  }
}
