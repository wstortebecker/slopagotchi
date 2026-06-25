/**
 * Legal copy — Terms, Privacy and Refund policy as typed blocks, rendered by
 * screens/Legal.jsx.
 *
 * Slopagotchi is a hobby / experimental project. These documents are written to
 * make that crystal clear and to disclaim warranties and liability to the
 * maximum extent the law allows — including for data loss or breaches. Each doc
 * carries a `disclaimer` banner that the Legal screen renders prominently.
 *
 * Note: disclaimers limit responsibility but cannot waive non-excludable duties
 * (e.g. core data-protection obligations under GDPR). Have a lawyer review
 * before relying on these in anger.
 */

const UPDATED = '25 June 2026'

const HOBBY_DISCLAIMER =
  'Slopagotchi is a hobby project, provided free of warranties and “as is”. You use it entirely at your own risk. We accept no responsibility or liability for any loss, damage, downtime, data loss or data breach, to the maximum extent permitted by law. Do not upload anything confidential, sensitive or irreplaceable.'

export const LEGAL = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    updated: UPDATED,
    disclaimer: HOBBY_DISCLAIMER,
    intro:
      'These terms govern your use of Slopagotchi. By creating an account or hatching a pet you agree to them. Please read the hobby-project disclaimer above before relying on the service for anything.',
    sections: [
      {
        heading: '1. A hobby project, provided “as is”',
        body: [
          'Slopagotchi is an experimental hobby project built and run by a small group of people in their spare time. It is not an enterprise product, it carries no service-level agreement, no uptime guarantee, and no promise that it will keep working, keep your data, or even keep existing.',
          'The service and everything in it is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including but not limited to fitness for a particular purpose, reliability, availability, accuracy, or security. You use it entirely at your own risk.',
          'We may change, break, pause or shut down the service, in whole or in part, at any time and without notice or liability.',
        ],
      },
      {
        heading: '2. The service',
        body: [
          'Slopagotchi renders a virtual pet whose health reflects the quality of the work you and your team ship, plus a shared team zoo. Quality scores are a playful heuristic, not a measurement, and must never be used as the basis for employment, performance, disciplinary or any other consequential decisions.',
        ],
      },
      {
        heading: '3. Accounts',
        body: [
          'You are responsible for everything that happens under your account and for keeping your credentials secure. Accounts are for a single named person.',
          'You must be old enough to enter a binding contract in your jurisdiction to use Slopagotchi.',
        ],
      },
      {
        heading: '4. Payments',
        body: [
          'If a paid plan is offered, it is billed via our payment provider, Stripe, at the price shown at checkout. We never see or store your full card number. Any subscription renews until cancelled; cancel at any time and it stops at the end of the current period. Because this is a hobby project, paid features may change or disappear — see the Refund Policy for how we handle that.',
        ],
      },
      {
        heading: '5. Acceptable use',
        body: [
          'Do not use Slopagotchi to break the law, infringe others’ rights, attempt to gain unauthorised access, or interfere with its operation. Do not upload confidential, sensitive, regulated or personal data about other people that you are not allowed to share.',
          'We may suspend or delete any account, at any time, for any reason, without liability.',
        ],
      },
      {
        heading: '6. Your content & data',
        body: [
          'You retain ownership of the data you connect and the reputation records your pet generates, and you grant us the limited licence needed to host and display it so the service works. Where reputation records are written to an open protocol, they stay associated with your identity and are portable to you.',
          'Keep your own backups. We do not guarantee that your data will be retained, recoverable, or protected, and we are not a system of record for anything you cannot afford to lose.',
        ],
      },
      {
        heading: '7. No liability — including for data loss & breaches',
        body: [
          'To the maximum extent permitted by law, we (and anyone involved in building or running Slopagotchi) accept no liability whatsoever for any direct, indirect, incidental, special, consequential or exemplary damages, or for any loss of data, loss of profits, business interruption, reputational harm, or losses arising from a security incident or data breach — whether or not we were advised such damages were possible.',
          'You use the service at your own risk and agree that any risk of loss, including from unauthorised access to or disclosure of your data, rests with you.',
          'Where liability cannot be excluded by law, it is limited to the greater of the amount you actually paid us in the three months before the claim, or USD 0. Nothing in these terms excludes liability that cannot lawfully be excluded.',
          'You agree to indemnify and hold us harmless from any claim arising out of your use of the service or your breach of these terms.',
        ],
      },
      {
        heading: '8. Changes & governing law',
        body: [
          'We may update these terms at any time; continued use after a change means you accept it. These terms are governed by the laws of Norway, and any dispute is subject to the exclusive jurisdiction of the Norwegian courts, without prejudice to mandatory consumer protections in your country of residence.',
        ],
      },
    ],
  },

  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: UPDATED,
    disclaimer: HOBBY_DISCLAIMER,
    intro:
      'This policy explains what we collect and why. Because Slopagotchi is a hobby project, the single most important thing we can tell you is: do not put confidential, sensitive or irreplaceable information into it.',
    sections: [
      {
        heading: '1. Don’t upload anything sensitive',
        body: [
          'This is the rule that matters most. Treat Slopagotchi as a public-ish, best-effort hobby service. Do not enter passwords, secrets, regulated data, special-category personal data, or anything whose exposure would harm you or anyone else. If in doubt, leave it out.',
        ],
      },
      {
        heading: '2. What we collect',
        body: [
          'Account data: your name, email and team membership. Usage data: how you interact with the app. Quality signals: the metrics that determine your pet’s health. Payment data (if you pay) is handled by Stripe — we only ever see a token and the last four digits of your card.',
        ],
      },
      {
        heading: '3. How we use it & who we share it with',
        body: [
          'We use your data only to run the service — render your pet, run the zoo, support you, and keep things working — and we rely on a few processors to do it: our hosting provider, our authentication and billing provider (Stripe), and basic analytics. We do not sell your personal data and we do not use your private content to train third-party models.',
        ],
      },
      {
        heading: '4. Security — best effort, no guarantees',
        body: [
          'We use sensible measures such as encryption in transit (TLS) and least-privilege access. But this is a hobby project, not a hardened enterprise platform, and no system is ever perfectly secure.',
          'We cannot and do not guarantee the security of your data. To the maximum extent permitted by law, we accept no liability for any data breach, leak, loss, corruption or unauthorised access, however it occurs. By using Slopagotchi you accept that this risk is yours.',
        ],
      },
      {
        heading: '5. In the event of a breach',
        body: [
          'If we become aware of a breach affecting personal data, we will make reasonable efforts to address it and to notify affected users and any regulator where the law requires it. Beyond those non-excludable legal duties, we make no commitment and accept no liability regarding breaches or their consequences.',
        ],
      },
      {
        heading: '6. Your rights & contact',
        body: [
          'You can access, correct, export or delete your personal data — email us and we will action verified requests within a reasonable time. Deleting your account removes your personal data from our active systems, subject to any legal retention requirements.',
          'Questions, requests or breach reports: privacy@slopagotchi.com.',
        ],
      },
    ],
  },

  refunds: {
    slug: 'refunds',
    title: 'Refund Policy',
    updated: UPDATED,
    disclaimer:
      'Slopagotchi is a hobby project. Paid features are offered on a best-effort basis with no guarantee of availability or continuity.',
    intro:
      'If we ever charge for anything, here is how refunds work. Keep it friendly: this is a hobby, not a livelihood.',
    sections: [
      {
        heading: '1. 14-day money-back',
        body: [
          'Not happy within 14 days of your first payment? Email us for a full refund — no interrogation required.',
        ],
      },
      {
        heading: '2. Cancelling',
        body: [
          'Cancel any time and your plan will not renew. We do not pro-rate partial periods by default, but if something broke on our side, get in touch and we will make it right.',
        ],
      },
      {
        heading: '3. If the project shuts down',
        body: [
          'Because this is a hobby project, we may stop running it. If we discontinue a paid service you have already paid for, we will refund the unused, prepaid portion of your most recent term where we reasonably can. Beyond that, our liability is limited as set out in the Terms of Service.',
        ],
      },
      {
        heading: '4. How to request',
        body: [
          'Email billing@slopagotchi.com from your account address. Approved refunds go back to your original payment method via Stripe, typically within 5–10 business days depending on your bank.',
        ],
      },
    ],
  },
}

export function getLegal(slug) {
  return LEGAL[slug] || null
}
