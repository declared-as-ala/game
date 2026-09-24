export interface LegalConfig {
  appName: string;
  appVersion: string;
  companyName: string;
  contactEmail: string;
  country: string;
  websiteUrl: string;
  privacyPolicyLastUpdated: string;
  termsLastUpdated: string;
}

/**
 * Centralized Legal Configuration Placeholders.
 * 
 * IMPORTANT FOR STORE SUBMISSION:
 * Update these values before publishing SatisfyBall on Google Play or the Apple App Store.
 * In-game UI uses graceful helper getters below so users never see raw placeholders.
 */
export const LEGAL_CONFIG: LegalConfig = {
  appName: 'SatisfyBall',
  appVersion: '1.0.0',
  companyName: 'TO_BE_DEFINED',
  contactEmail: 'TO_BE_DEFINED',
  country: 'TO_BE_DEFINED',
  websiteUrl: 'TO_BE_DEFINED',
  privacyPolicyLastUpdated: 'September 5, 2026',
  termsLastUpdated: 'September 5, 2026',
};

export function getLegalCompanyName(): string {
  if (LEGAL_CONFIG.companyName && LEGAL_CONFIG.companyName !== 'TO_BE_DEFINED') {
    return LEGAL_CONFIG.companyName;
  }
  return 'SatisfyBall Team';
}

export function getLegalContactEmail(): string {
  if (LEGAL_CONFIG.contactEmail && LEGAL_CONFIG.contactEmail !== 'TO_BE_DEFINED') {
    return LEGAL_CONFIG.contactEmail;
  }
  return 'support@satisfyball.game';
}

export function getLegalCountry(): string {
  if (LEGAL_CONFIG.country && LEGAL_CONFIG.country !== 'TO_BE_DEFINED') {
    return LEGAL_CONFIG.country;
  }
  return 'Applicable Jurisdiction';
}

export function getLegalWebsiteUrl(): string {
  if (LEGAL_CONFIG.websiteUrl && LEGAL_CONFIG.websiteUrl !== 'TO_BE_DEFINED') {
    return LEGAL_CONFIG.websiteUrl;
  }
  return '';
}
