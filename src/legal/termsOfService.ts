import { LEGAL_CONFIG, getLegalCompanyName, getLegalContactEmail, getLegalCountry } from './legalConfig';
import type { LegalDocument } from './privacyPolicy';

export function getTermsOfService(): LegalDocument {
  const company = getLegalCompanyName();
  const email = getLegalContactEmail();
  const country = getLegalCountry();

  return {
    title: 'Terms of Service',
    lastUpdated: LEGAL_CONFIG.termsLastUpdated,
    sections: [
      {
        title: '1. Acceptance of Terms',
        paragraphs: [
          `By downloading, installing, or playing SatisfyBall ("the Game" or "the Application"), you agree to be bound by these Terms of Service ("Terms").`,
          `If you do not agree to all terms and conditions herein, you must immediately cease using and uninstall the Application.`,
        ],
      },
      {
        title: '2. Use of the Application',
        paragraphs: [
          `${company} grants you a personal, revocable, non-exclusive, non-transferable, limited license to download, install, and play SatisfyBall on personal mobile devices you own or control, solely for personal, non-commercial entertainment purposes.`,
        ],
      },
      {
        title: '3. Offline Gameplay and Local Storage',
        paragraphs: [
          `SatisfyBall functions primarily as an offline-first puzzle game. Progress, stars, unlocks, and configurations are stored locally on your device.`,
          `You acknowledge that deleting the application, resetting device memory, or clearing game cache will result in permanent loss of saved game state. We do not provide cloud backup or restoration of lost local data.`,
        ],
      },
      {
        title: '4. User Responsibilities',
        paragraphs: [
          `You are responsible for ensuring that your device meets the minimum hardware and software requirements to run SatisfyBall smoothly.`,
          `You agree to use SatisfyBall in compliance with all applicable local, national, and international laws, regulations, and platform guidelines.`,
        ],
      },
      {
        title: '5. Intellectual Property Rights',
        paragraphs: [
          `All title, ownership rights, and intellectual property rights in and to SatisfyBall—including but not limited to source code, graphics, game mechanics, puzzle level designs, audio effects, animations, visual effects, and trademarks—are owned exclusively by ${company} or its licensors.`,
          `Third-party open-source libraries used within the Application are licensed under their respective permissive open-source licenses as documented in the Licenses section of this game.`,
        ],
      },
      {
        title: '6. Prohibited Use',
        paragraphs: [
          `You expressly agree NOT to:`,
        ],
        bullets: [
          'Decompile, reverse-engineer, disassemble, or derive source code from the Application, except where permitted by mandatory applicable law.',
          'Rent, lease, lend, sell, sublicense, distribute, or commercially exploit the game or its assets.',
          'Modify, alter, create derivative works of, or hack game files, textures, or algorithms.',
          'Circumvent or attempt to bypass any technological measure designed to protect game files or assets.',
        ],
      },
      {
        title: '7. Updates and Availability',
        paragraphs: [
          `We may periodically release software updates, patches, bug fixes, or enhancements for SatisfyBall. Updates may modify, balance, or adjust levels, visual effects, or audio.`,
          `We reserve the right to modify, suspend, or discontinue the Application (or any part thereof) at any time without prior notice or liability.`,
        ],
      },
      {
        title: '8. Disclaimer of Warranties',
        paragraphs: [
          `SatisfyBall is provided strictly on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind, whether express, implied, statutory, or otherwise.`,
          `To the fullest extent permissible under applicable law, we disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, title, quiet enjoyment, and non-infringement.`,
        ],
      },
      {
        title: '9. Limitation of Liability',
        paragraphs: [
          `To the maximum extent permitted by applicable law, neither ${company} nor its developers, affiliates, or licensors shall be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages arising out of or related to your use of or inability to use the Application.`,
        ],
      },
      {
        title: '10. Governing Law and Jurisdiction',
        paragraphs: [
          `These Terms shall be governed by, construed, and enforced in accordance with the laws of ${country}, without regard to its conflict of law principles.`,
          `Any dispute arising from or related to these Terms or the Application shall be submitted to the competent courts of ${country}.`,
        ],
      },
      {
        title: '11. Changes to Terms',
        paragraphs: [
          `We reserve the right to revise or update these Terms at our sole discretion. Any modifications will become effective immediately upon posting within the Application with an updated "Last Updated" date.`,
          `Your continued use of SatisfyBall after revised Terms are posted constitutes your binding agreement to the modifications.`,
        ],
      },
      {
        title: '12. Contact Information',
        paragraphs: [
          `If you have questions or inquiries regarding these Terms of Service, please contact:`,
          `Entity: ${company}`,
          `Email: ${email}`,
        ],
      },
      {
        title: '13. Last Updated',
        paragraphs: [
          `These Terms were last updated on ${LEGAL_CONFIG.termsLastUpdated}.`,
        ],
      },
    ],
  };
}
