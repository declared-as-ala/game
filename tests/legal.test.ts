import { describe, it, expect } from 'vitest';
import { LEGAL_CONFIG, getLegalCompanyName, getLegalContactEmail, getLegalCountry } from '../src/legal/legalConfig';
import { getPrivacyPolicy } from '../src/legal/privacyPolicy';
import { getTermsOfService } from '../src/legal/termsOfService';
import { getOpenSourceNotices } from '../src/legal/openSourceNotices';

describe('Legal Configuration & Policies', () => {
  it('provides graceful fallbacks for undefined legal parameters', () => {
    expect(LEGAL_CONFIG.companyName).toBe('TO_BE_DEFINED');
    const company = getLegalCompanyName();
    expect(company).not.toBe('TO_BE_DEFINED');
    expect(company.length).toBeGreaterThan(0);

    const email = getLegalContactEmail();
    expect(email).not.toBe('TO_BE_DEFINED');
    expect(email).toContain('@');

    const country = getLegalCountry();
    expect(country).not.toBe('TO_BE_DEFINED');
  });

  it('generates a complete Privacy Policy with all mandatory sections', () => {
    const policy = getPrivacyPolicy();
    expect(policy.title).toBe('Privacy Policy');
    expect(policy.lastUpdated).toBeDefined();

    const titles = policy.sections.map((s) => s.title);
    expect(titles.some((t) => t.includes('Introduction'))).toBe(true);
    expect(titles.some((t) => t.includes('Information We Collect'))).toBe(true);
    expect(titles.some((t) => t.includes('Local Game Data'))).toBe(true);
    expect(titles.some((t) => t.includes('How Information Is Used'))).toBe(true);
    expect(titles.some((t) => t.includes('Data Storage'))).toBe(true);
    expect(titles.some((t) => t.includes('Third-Party Services'))).toBe(true);
    expect(titles.some((t) => t.includes("Children's Privacy"))).toBe(true);
    expect(titles.some((t) => t.includes('Security'))).toBe(true);
    expect(titles.some((t) => t.includes('Data Retention'))).toBe(true);
    expect(titles.some((t) => t.includes('Changes'))).toBe(true);
    expect(titles.some((t) => t.includes('Contact'))).toBe(true);
    expect(titles.some((t) => t.includes('Last Updated'))).toBe(true);

    // Verify it never exposes raw placeholders
    const fullText = JSON.stringify(policy);
    expect(fullText).not.toContain('TO_BE_DEFINED');
  });

  it('generates complete Terms of Service', () => {
    const tos = getTermsOfService();
    expect(tos.title).toBe('Terms of Service');
    expect(tos.lastUpdated).toBeDefined();

    const titles = tos.sections.map((s) => s.title);
    expect(titles.some((t) => t.includes('Acceptance of Terms'))).toBe(true);
    expect(titles.some((t) => t.includes('Use of the Application'))).toBe(true);
    expect(titles.some((t) => t.includes('Offline Gameplay'))).toBe(true);
    expect(titles.some((t) => t.includes('Intellectual Property'))).toBe(true);
    expect(titles.some((t) => t.includes('Prohibited Use'))).toBe(true);
    expect(titles.some((t) => t.includes('Disclaimer of Warranties'))).toBe(true);
    expect(titles.some((t) => t.includes('Limitation of Liability'))).toBe(true);

    const fullText = JSON.stringify(tos);
    expect(fullText).not.toContain('TO_BE_DEFINED');
  });

  it('provides open source notices with licenses and descriptions', () => {
    const notices = getOpenSourceNotices();
    expect(notices.length).toBeGreaterThanOrEqual(5);

    const names = notices.map((n) => n.name);
    expect(names).toContain('PixiJS');
    expect(names).toContain('Planck.js');
    expect(names).toContain('Capacitor');
    expect(names).toContain('Howler.js');
  });
});
