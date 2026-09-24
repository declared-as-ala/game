import { LEGAL_CONFIG, getLegalCompanyName, getLegalContactEmail } from './legalConfig';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function getPrivacyPolicy(): LegalDocument {
  const company = getLegalCompanyName();
  const email = getLegalContactEmail();

  return {
    title: 'Privacy Policy',
    lastUpdated: LEGAL_CONFIG.privacyPolicyLastUpdated,
    sections: [
      {
        title: '1. Introduction',
        paragraphs: [
          `Welcome to SatisfyBall ("we," "our," or "us"). We are committed to respecting and protecting your privacy. This Privacy Policy outlines how SatisfyBall handles your information when you download, install, and play our mobile game.`,
          `SatisfyBall is designed from the ground up as an offline-first mobile game. We believe you should enjoy satisfying physics puzzles with peace of mind, knowing your personal life remains private and secure on your own device.`,
        ],
      },
      {
        title: '2. Information We Collect',
        paragraphs: [
          `SatisfyBall does NOT collect, harvest, sell, or transmit any personal information.`,
          `Specifically, our game does NOT require or access:`,
        ],
        bullets: [
          'No account registration, login, username, or passwords.',
          'No personal identifiers such as your real name, email address, or phone number.',
          'No location data (GPS, network location, or IP geolocation).',
          'No device hardware identifiers (IDFA, GAID, IMEI, or MAC address).',
          'No access to your camera, microphone, photo library, or contact list.',
          'No biometric data or sensor tracking beyond native screen orientation and haptic feedback.',
        ],
      },
      {
        title: '3. Local Game Data',
        paragraphs: [
          `To deliver a seamless gameplay experience and save your achievements, SatisfyBall stores game data strictly locally on your device using client-side storage (IndexedDB and LocalStorage).`,
          `This local data includes only:`,
        ],
        bullets: [
          'Completed levels and unlocked gameplay modes.',
          'Stars earned (up to 3 stars per handcrafted challenge).',
          'High scores, best completion times, and attempt counts.',
          'Audio volume settings (SFX, music) and haptic vibration preferences.',
          'Graphics quality tier and dynamic camera shake toggles.',
          'Unlocked and actively equipped ball skins, trails, and impact visual themes.',
          'Daily Challenge completion history and streak status.',
          'First-time onboarding status.',
        ],
      },
      {
        title: '4. How Information Is Used',
        paragraphs: [
          `Because all gameplay information is confined entirely to your device sandbox, local data is used exclusively to:`,
        ],
        bullets: [
          'Resume your puzzle progress across app restarts.',
          'Render your selected cosmetic themes and visual preferences.',
          'Track your personal best high scores and star milestones.',
          'Maintain your Daily Challenge streak without contacting an external server.',
        ],
      },
      {
        title: '5. Data Storage & Persistence',
        paragraphs: [
          `Your game save is stored directly in your mobile operating system's private storage area via HTML5 IndexedDB and LocalStorage APIs.`,
          `IMPORTANT NOTICE REGARDING DATA LOSS: Because your game data exists solely on your physical device and is not synced to a remote cloud account, uninstalling the SatisfyBall application or manually clearing application cache/data in your device settings will permanently erase your progress, high scores, and unlocked cosmetics.`,
        ],
      },
      {
        title: '6. Third-Party Services & Telemetry',
        paragraphs: [
          `SatisfyBall contains:`,
        ],
        bullets: [
          'NO analytics SDKs (e.g., Google Analytics, Firebase, Mixpanel, or Segment).',
          'NO advertising SDKs (e.g., AdMob, Unity Ads, AppLovin, or IronSource).',
          'NO crash reporting or telemetry trackers (e.g., Sentry, Crashlytics, or Bugsnag).',
          'NO third-party social media integrations or tracking beacons.',
        ],
      },
      {
        title: "7. Children's Privacy",
        paragraphs: [
          `SatisfyBall is suitable for players of all ages, including children under 13 (and under 16 in the European Union).`,
          `We comply with the Children's Online Privacy Protection Act (COPPA) and General Data Protection Regulation (GDPR) standards. We do not solicit, gather, or share personal data from children or any other user.`,
        ],
      },
      {
        title: '8. Security',
        paragraphs: [
          `Because we do not operate remote databases or collect personal data over the internet, your information is protected by your device's native hardware security and operating system sandbox protections.`,
          `We recommend keeping your device operating system updated to maintain the highest level of security.`,
        ],
      },
      {
        title: '9. Data Retention and Deletion',
        paragraphs: [
          `You retain complete ownership and control of your local game data at all times.`,
          `You can reset or delete your game data at any time through two methods:`,
        ],
        bullets: [
          'In-Game: Navigate to Settings and tap "Reset Game Data" to clear all saved progress and cosmetics.',
          'Device Settings: Clear the application storage/cache in your Android or iOS settings, or uninstall the app.',
        ],
      },
      {
        title: '10. Changes to This Privacy Policy',
        paragraphs: [
          `We may update this Privacy Policy from time to time to reflect game updates or legal requirements. Any revisions will be published within this in-app page with an updated "Last Updated" date.`,
          `Your continued use of SatisfyBall after any updates indicates acceptance of the revised terms.`,
        ],
      },
      {
        title: '11. Contact Us',
        paragraphs: [
          `If you have questions, concerns, or feedback regarding this Privacy Policy or our privacy practices, please contact ${company} via email:`,
          `Support Contact: ${email}`,
        ],
      },
      {
        title: '12. Effective Date / Last Updated',
        paragraphs: [
          `This Privacy Policy is effective as of ${LEGAL_CONFIG.privacyPolicyLastUpdated}.`,
        ],
      },
    ],
  };
}
