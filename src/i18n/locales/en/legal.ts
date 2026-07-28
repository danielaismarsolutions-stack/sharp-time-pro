import type { LocaleShape } from '../../types';
import type { legal as esLegal } from '../es/legal';

export const legal: LocaleShape<typeof esLegal> = {
  layout: {
    back: 'Back',
    lastUpdated: 'Last updated: {date}',
  },
  footer: {
    copyright: 'SmartFlow Labs. All rights reserved.',
    termsLink: 'Terms of Service',
    privacyLink: 'Privacy Policy',
    cookiesLink: 'Cookies',
  },
  terms: {
    title: 'Terms and Conditions of Use',
    lastUpdated: '19 February 2026',
    s1Title: '1. Identity of the owner',
    s1BodyPart1: 'This website and the',
    s1BodyPart2: 'application (hereinafter, the “Platform”) are owned by',
    s1BodyPart3:
      ', a sole proprietorship (eenmanszaak) registered with the Netherlands Chamber of Commerce under KvK number',
    s1BodyPart4: '.',
    s1Item1: 'Contact email: claudia@smartflow-labs.com',
    s1Item2: 'Website: https://smartflow-labs.com',
    s2Title: '2. Purpose and scope',
    s2Body:
      'These Terms and Conditions govern access to and use of the Platform, a tool for managing appointments, schedules and administration for hairdressing businesses. By accessing or using the Platform, the user fully accepts these Terms. If you do not agree, you must refrain from using the Platform.',
    s3Title: '3. Registration and user accounts',
    s3Item1:
      'Access to the Platform requires an account provided by the business administrator (owner).',
    s3Item2:
      'The user is responsible for maintaining the confidentiality of their credentials and for all activity carried out through their account.',
    s3Item3:
      'The user must immediately report any unauthorised use of their account to claudia@smartflow-labs.com.',
    s4Title: '4. Permitted use',
    s4Intro: 'The user agrees to:',
    s4Item1:
      'Use the Platform solely for legitimate purposes related to their professional activity.',
    s4Item2: 'Not enter false or defamatory data, or data that infringes third-party rights.',
    s4Item3:
      'Not attempt to access data, accounts or features for which they lack authorisation.',
    s4Item4:
      'Not reverse engineer, decompile or attempt to extract the source code of the Platform.',
    s4Item5: 'Not use the Platform to send unsolicited communications (spam).',
    s5Title: '5. Intellectual property',
    s5Body:
      'All content on the Platform — including text, designs, logos, icons, source code and databases — is protected by intellectual property rights and is owned by SmartFlow Labs or its licensors. Its reproduction, distribution or transformation without express authorisation is prohibited.',
    s6Title: '6. Data protection',
    s6BodyPart1: 'The processing of personal data is governed by our',
    s6Link: 'Privacy Policy',
    s6BodyPart2:
      ', which forms an integral part of these Terms. SmartFlow Labs complies with the General Data Protection Regulation (GDPR) of the European Union.',
    s7Title: '7. Service availability',
    s7Body:
      'SmartFlow Labs strives to keep the Platform available without interruption, but does not guarantee the absence of interruptions, technical errors or security failures. Scheduled maintenance may be carried out and will be announced with reasonable advance notice where possible.',
    s8Title: '8. Limitation of liability',
    s8Body:
      'To the maximum extent permitted by applicable law, SmartFlow Labs shall not be liable for indirect, incidental, special or consequential damages arising from the use of, or inability to use, the Platform, including — without limitation — loss of data, loss of profits or business interruption.',
    s9Title: '9. Amendments',
    s9Body:
      'SmartFlow Labs reserves the right to amend these Terms at any time. Changes will be communicated through the Platform and/or by email. Continued use of the Platform after notification constitutes acceptance of the new Terms.',
    s10Title: '10. Termination and suspension',
    s10Body:
      'SmartFlow Labs may suspend or terminate the access of any user who breaches these Terms, without prejudice to any legal action that may apply.',
    s11Title: '11. Governing law and jurisdiction',
    s11Body:
      'These Terms are governed by the laws of the Kingdom of the Netherlands. Any dispute arising from these Terms shall be submitted to the jurisdiction of the competent courts of the Netherlands, without prejudice to the rights afforded to consumers under Regulation (EU) No 1215/2012.',
    s12Title: '12. Contact',
    s12Body: 'For any enquiry relating to these Terms, you may contact us at:',
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '19 February 2026',
    s1Title: '1. Data controller',
    s1BodyPart1: 'The data controller responsible for the processing of your personal data is',
    s1BodyPart2:
      ', a sole proprietorship (eenmanszaak) registered with the Netherlands Chamber of Commerce under KvK number',
    s1BodyPart3: '.',
    s1Item1: 'Email: claudia@smartflow-labs.com',
    s1Item2: 'Website: https://smartflow-labs.com',
    s2Title: '2. Data we collect',
    s2Intro: 'Depending on how you interact with the Platform, we may collect:',
    s2Sub1Title: '2.1. System user data (business staff and administrators)',
    s2Sub1Item1: 'Full name, email address, telephone number.',
    s2Sub1Item2: 'Profile picture (avatar), if provided voluntarily.',
    s2Sub1Item3: 'Configured working hours and break periods.',
    s2Sub1Item4: 'Login credentials (passwords are stored in encrypted form).',
    s2Sub2Title: '2.2. Business client data',
    s2Sub2Item1: 'Name, telephone number, email address.',
    s2Sub2Item2: 'Appointment history and services booked.',
    s2Sub2Item3: 'Internal business notes about the client.',
    s2Sub3Title: '2.3. Enquiry data (leads)',
    s2Sub3Item1: 'Name, telephone number, email address, service of interest.',
    s2Sub3Item2: 'Message or enquiry notes.',
    s2Sub4Title: '2.4. Technical data',
    s2Sub4Item1: 'IP address, browser type and version, operating system.',
    s2Sub4Item2: 'Push notification subscription data (endpoint, keys).',
    s3Title: '3. Legal basis for processing',
    s3Intro:
      'In accordance with Article 6 of the General Data Protection Regulation (GDPR), we process your data on the basis of:',
    s3Item1Label: 'Performance of a contract',
    s3Item1Body:
      '(Art. 6(1)(b) GDPR): processing is necessary to provide the contracted service (management of appointments, schedules and clients).',
    s3Item2Label: 'Legitimate interest',
    s3Item2Body:
      '(Art. 6(1)(f) GDPR): service improvement, fraud prevention and Platform security.',
    s3Item3Label: 'Consent',
    s3Item3Body:
      '(Art. 6(1)(a) GDPR): for sending push notifications and the use of non-essential cookies.',
    s3Item4Label: 'Legal obligation',
    s3Item4Body: '(Art. 6(1)(c) GDPR): compliance with applicable tax and legal obligations.',
    s4Title: '4. Purposes of processing',
    s4Item1: 'Management of the business’s appointments, bookings and schedule.',
    s4Item2: 'Administration of the commercial relationship with the business’s clients.',
    s4Item3: 'Sending notifications and reminders related to appointments.',
    s4Item4: 'Generation of internal business reports and statistics.',
    s4Item5: 'Maintaining the security and operation of the Platform.',
    s5Title: '5. Data recipients',
    s5Intro: 'Your data may be disclosed to the following data processors:',
    s5Item1Body: '— Database hosting and authentication (servers in the European Union).',
    s5Item2Body: '— Web application hosting.',
    s5Note:
      'We do not sell, rent or share your personal data with third parties for their own commercial purposes.',
    s6Title: '6. International transfers',
    s6Body:
      'Some service providers may be located outside the European Economic Area (EEA). In such cases, transfers are carried out under standard contractual clauses approved by the European Commission (Art. 46(2)(c) GDPR) or on the basis of adequacy decisions (Art. 45 GDPR).',
    s7Title: '7. Retention period',
    s7Item1Label: 'Active user data:',
    s7Item1Body: 'for as long as the account remains active.',
    s7Item2Label: 'Business client data:',
    s7Item2Body:
      'for as long as necessary for the commercial relationship and, thereafter, for the applicable statutory retention periods.',
    s7Item3Label: 'Tax data:',
    s7Item3Body: '7 years, in accordance with Dutch law.',
    s7Item4Label: 'Push notification data:',
    s7Item4Body: 'until the subscription is cancelled.',
    s8Title: '8. Rights of the data subject',
    s8Intro: 'Under the GDPR, you have the right to:',
    s8Item1Label: 'Access:',
    s8Item1Body: 'know what personal data we process about you.',
    s8Item2Label: 'Rectification:',
    s8Item2Body: 'correct inaccurate or incomplete data.',
    s8Item3Label: 'Erasure:',
    s8Item3Body: 'request the deletion of your data (the “right to be forgotten”).',
    s8Item4Label: 'Restriction:',
    s8Item4Body: 'restrict processing in certain circumstances.',
    s8Item5Label: 'Portability:',
    s8Item5Body: 'receive your data in a structured, machine-readable format.',
    s8Item6Label: 'Objection:',
    s8Item6Body: 'object to processing based on legitimate interest.',
    s8Item7Label: 'Withdrawal of consent:',
    s8Item7Body:
      'withdraw your consent at any time, without affecting the lawfulness of processing carried out beforehand.',
    s8OutroPart1: 'To exercise your rights, send an email to',
    s8OutroPart2:
      'stating your request and attaching an identity document. We will respond within a maximum of 30 days.',
    s9Title: '9. Right to lodge a complaint',
    s9BodyPart1:
      'If you consider that the processing of your data infringes data protection law, you have the right to lodge a complaint with the',
    s9BodyPart2:
      '(the Dutch Data Protection Authority) or with the supervisory authority of the Member State in which you habitually reside.',
    s10Title: '10. Security',
    s10Intro:
      'We apply appropriate technical and organisational measures to protect your personal data, including:',
    s10Item1: 'Encryption of data in transit (HTTPS/TLS) and at rest.',
    s10Item2: 'Passwords stored using secure hashing (bcrypt).',
    s10Item3: 'Role-based access control (RBAC) and row-level security (RLS) policies.',
    s10Item4: 'Expiring JWT tokens for authentication.',
    s11Title: '11. Cookies',
    s11BodyPart1: 'For detailed information about the cookies we use, please see our',
    s11Link: 'Cookie Policy',
    s11BodyPart2: '.',
    s12Title: '12. Amendments',
    s12Body:
      'We reserve the right to update this Privacy Policy. Any changes will be published on this page together with the date of the latest update. We recommend that you review it periodically.',
    s13Title: '13. Contact',
    s13Body: 'For any enquiry regarding data protection, you may contact us at:',
  },
  cookies: {
    title: 'Cookie Policy',
    lastUpdated: '19 February 2026',
    s1Title: '1. What are cookies?',
    s1Body:
      'Cookies are small text files that websites store on your device (computer, tablet or mobile phone) when you visit them. They allow the website to remember your actions and preferences over a period of time.',
    s2Title: '2. Controller',
    s2BodyPart1: 'The party responsible for the use of cookies on this Platform is',
    s2BodyPart2: ', a sole proprietorship (eenmanszaak), KvK',
    s2BodyPart3: ', the Netherlands.',
    s3Title: '3. Cookies we use',
    s3Sub1Title: '3.1. Strictly necessary cookies',
    s3Sub1Body:
      'These cookies are essential for the operation of the Platform and cannot be disabled. They are used for:',
    tableCookieHeader: 'Cookie',
    tableKeyHeader: 'Key',
    tablePurposeHeader: 'Purpose',
    tableDurationHeader: 'Duration',
    s3Sub1Row1Purpose: 'User authentication (Supabase session)',
    s3Sub1Row1Duration: 'Session / 30 days',
    s3Sub2Title: '3.2. Local storage (localStorage)',
    s3Sub2Body: 'In addition to cookies, the Platform uses the browser’s local storage for:',
    s3Sub2Row1Purpose: 'Persistence of the authentication session',
    s3Sub2Row2Purpose: 'Theme preference (light/dark)',
    s4Title: '4. Third-party cookies',
    s4BodyPart1: 'The Platform currently',
    s4BodyStrong: 'does not use',
    s4BodyPart2:
      'third-party analytics, advertising or social media cookies. If any are introduced in the future, this policy will be updated and, where required, your prior consent will be requested.',
    s5Title: '5. Legal basis',
    s5Body1Part1: 'Strictly necessary cookies are used on the basis of',
    s5Body1Strong1: 'legitimate interest',
    s5Body1Part2: 'and the',
    s5Body1Strong2: 'performance of a contract',
    s5Body1Part3:
      ', as they are essential to provide the service (Art. 6(1)(b) and 6(1)(f) GDPR, in conjunction with Art. 5(3) of the ePrivacy Directive 2002/58/EC).',
    s5Body2Part1:
      'For any non-essential cookie introduced in the future, we will request your',
    s5Body2Strong: 'prior consent',
    s5Body2Part2: '(Art. 6(1)(a) GDPR).',
    s6Title: '6. How to manage cookies',
    s6Body1:
      'You can configure your browser to block or delete cookies. Please note that if you block essential cookies, the Platform may not work properly.',
    s6Body2: 'Instructions for the most common browsers:',
    s6Item1: 'Settings > Privacy and security > Cookies and other site data',
    s6Item2: 'Settings > Privacy & Security > Cookies and Site Data',
    s6Item3: 'Preferences > Privacy > Cookies and website data',
    s6Item4: 'Settings > Cookies and site permissions > Cookies and site data',
    s7Title: '7. Amendments',
    s7Body:
      'This Cookie Policy may be updated to reflect changes in the cookies used or in applicable law. We recommend that you review it periodically.',
    s8Title: '8. Contact',
    s8Body: 'If you have any questions about the use of cookies, you may contact us at:',
  },
} as const;
