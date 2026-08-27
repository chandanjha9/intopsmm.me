import { SITE_CONTACT } from "./site-contact";

const B = SITE_CONTACT.brand;

export type TermsSection = {
  id: string;
  title: string;
  intro?: string;
  points?: string[];
  note?: string;
};

export const TERMS_UPDATED = "27 August 2026";

export const TERMS_INTRO = `Hello dear ${B} users, our system is fully automated and processes orders automatically. Occasional system errors may happen, but we can never manipulate your data. Because of high server load, please follow the rules below for refunds — refunds are provided only for reasonable issues. Your money is 100% safe with us.`;

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "terms-of-service",
    title: "Terms of Service",
    intro:
      "Thank you for using our products and services (\u201cServices\u201d). By accessing this website you agree to be bound by these Terms and Conditions of Use, all applicable laws and regulations. You are responsible for compliance with any applicable local laws. If you do not agree with any of these terms you are prohibited from using or accessing this site. The materials on this website are protected by applicable copyright and trademark laws.",
  },
  {
    id: "rules",
    title: "Rules",
    points: [
      "Make sure your subscriber, like and view counters are not hidden and your account is public before placing an order.",
      "Do not place more than one order for the same link at the same time until the first one is completed.",
      "Orders cannot be cancelled or edited once placed unless there is a problem — please make sure you place the right order.",
      "Do not order for content related to porn, politics, extremism or any content that stirs public opinion.",
      `If you face any payment issue, do not worry — just message us on WhatsApp. Your money is 100% safe with us.`,
      `When you add funds we cannot refund the payment back to your bank under any circumstances. Funds can only be used on ${B}.`,
      "We cannot deduct your funds without your consent. Funds are only deducted through order payments, which you can verify on the Payments page.",
      "We will suspend your account if you attempt to manipulate adding funds, threaten us or behave abusively towards support.",
      "Do not rely solely on descriptions or average times — these are estimations. Quality may fluctuate at times, so test before placing large orders.",
      "By placing a new order you accept all the rules mentioned above.",
    ],
  },
  {
    id: "refill",
    title: "Refill Policy",
    points: [
      "No refill if you change your username or make your account private.",
      "Refill is only for order IDs, not for links. If the link does not work for that order we cannot refill.",
      "Refill periods may vary depending on updates and load, but usually it is done within 24\u201372 hours.",
      "The refill system works on \u201cStart Count + Order Quantity = End Count\u201d for each order separately. If your start count is 1000 and you order 1000, you get a refill only if it drops below 2000.",
      "Refill requests may be rejected if the drop is less than 5% — our system only counts drops above 5% for small orders.",
      "If followers drop, use the refill button on the Orders page or contact us on WhatsApp. Do not place a new order until the first one is fully refilled.",
      "No refill if you order for a 1M base with less than a 200K order. Always order at least 20% more than the existing count, and buy from one panel only.",
      "If your account already has a large count (for example 200K) and you order only 20K more, drops may come from old followers — we cannot refill in that case.",
    ],
  },
  {
    id: "refund",
    title: "Refund Policy",
    points: [
      `If your order is not completed, the money is refunded to your ${B} wallet.`,
      `No refund if you order from ${B} and another panel for the same link. We do not encourage such practices.`,
      `If you provide a wrong or non-working link, the order is automatically cancelled and refunded to your ${B} wallet.`,
      "\u201cPartial\u201d means the remaining quantity is refunded. If you ordered 1000 and it shows 500 partial, 50% of the payment is refunded.",
      "\u201cCancelled\u201d means fully refunded.",
      "Refunds for running orders are possible for some services but not for fast-working services.",
      "Refunds may be difficult if your order's start count decreases. Please keep that in mind.",
    ],
    note: "You may or may not get a refund if the service provider marks the order complete — it depends on the service provider.",
  },
  {
    id: "tips",
    title: "Tips",
    points: [
      "For faster delivery always use mobile links, avoid desktop links or usernames.",
      "Always read the description and check the average time before placing an order.",
      "For the best quality always order from admin-suggested services.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    intro:
      "The use of this website and any dispute arising out of its use are subject to the laws of the Government of India. Any legal action or proceedings related to these terms shall be settled in the courts and/or tribunals in India.",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    intro:
      "We prioritise your privacy and never publish or sell your information to other companies. We only collect details such as email and WhatsApp number to complete your orders.",
  },
];
