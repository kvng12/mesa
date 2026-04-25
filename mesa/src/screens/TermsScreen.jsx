// src/screens/TermsScreen.jsx
// T&C acceptance screen shown during registration.

import { useState } from "react";

const PRIMARY    = "#8B1A1A";
const DARK       = "#1C1C1E";
const TEXT_MUTED = "#666666";
const BORDER     = "#ECE6DE";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By creating an account or placing an order on Chowli, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the platform. We reserve the right to update these terms at any time; continued use of the platform after changes are posted constitutes your acceptance of the revised terms.`,
  },
  {
    title: "2. Who We Are",
    body: `Chowli is an online food ordering marketplace that connects customers with local restaurants. We act as an intermediary platform and are not a restaurant or food provider ourselves. Fulfilment of orders — including food preparation, quality, and delivery where applicable — is the responsibility of the respective restaurant.`,
  },
  {
    title: "3. Eligibility",
    body: `You must be at least 18 years old to create an account and place orders on Chowli. By registering, you represent that all information you provide is accurate and up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.`,
  },
  {
    title: "4. Orders",
    subsections: [
      { label: "4.1", text: "All orders placed through Chowli are subject to acceptance by the restaurant. A confirmed order notification does not guarantee immediate preparation; preparation begins at the restaurant's discretion." },
      { label: "4.2", text: "Order details — including items, quantities, and prices — are displayed at checkout. You are responsible for reviewing your order before submission." },
      { label: "4.3", text: "Once an order is placed and confirmed by the restaurant, cancellations may not be possible. Contact support at support@chowli.com as soon as possible if you need to cancel." },
      { label: "4.4", text: "For pickup orders, you will receive a one-time PIN (OTP) to collect your order. The OTP must be presented to the restaurant. Chowli is not liable for orders collected by a third party using your OTP." },
      { label: "4.5", text: "Scheduled orders are placed in advance and will be prepared at the time you specified. Ensure the scheduled time is accurate; we cannot guarantee adjustments after the order is confirmed." },
    ],
  },
  {
    title: "5. Payments",
    subsections: [
      { label: "5.1", text: "Chowli supports online card payments (processed by Paystack) and cash on delivery/pickup where offered by the restaurant." },
      { label: "5.2", text: "All prices displayed are in Nigerian Naira (NGN) and are inclusive of any applicable fees unless otherwise stated." },
      { label: "5.3", text: "Card payments are processed securely by Paystack. Chowli does not store your card details. By making a payment, you agree to Paystack's terms of service." },
      { label: "5.4", text: "For cash orders, payment is made directly to the restaurant or delivery rider at the point of fulfilment. Chowli is not responsible for cash payment disputes between you and the restaurant." },
      { label: "5.5", text: "Promotional codes and loyalty point redemptions are subject to their own terms and expiry conditions. They have no cash value and cannot be transferred." },
    ],
  },
  {
    title: "6. Refunds and Disputes",
    subsections: [
      { label: "6.1", text: "If you receive an incorrect or significantly substandard order, you may raise a dispute within 24 hours of order completion through the app." },
      { label: "6.2", text: "Refunds are assessed on a case-by-case basis. Chowli acts as a mediator between you and the restaurant but cannot guarantee a refund in all circumstances." },
      { label: "6.3", text: "Refunds for verified claims on card payments will be credited to your original payment method within 5–10 business days." },
      { label: "6.4", text: "We reserve the right to decline refund requests that appear fraudulent or that fall outside our dispute window." },
      { label: "6.5", text: "Disputes related to delivery (where the restaurant provides delivery) should be raised with the restaurant directly. Chowli can assist as a mediator but bears no liability for third-party delivery errors." },
    ],
  },
  {
    title: "7. Restaurant Responsibilities",
    body: `Restaurants listed on Chowli are independent businesses. Each restaurant is solely responsible for the quality, safety, accuracy, and legality of the food and information they provide. Chowli does not inspect, certify, or warrant the food offered by any restaurant on the platform. Any health, hygiene, or quality concerns should be reported to us at support@chowli.com.`,
  },
  {
    title: "8. Customer Responsibilities",
    body: `You agree not to submit false orders, abuse promotions, make fraudulent payment claims, or engage in any conduct that harms restaurants or other users of the platform. You are responsible for providing an accurate delivery address and being reachable at the time of delivery. Chowli reserves the right to refuse service to any user who violates these responsibilities.`,
  },
  {
    title: "9. Fraud Prevention",
    body: `Chowli employs several measures to detect and prevent fraud, including order verification messages. If you receive a verification request for an order you did not place, respond immediately and contact us at support@chowli.com. Confirmed fraudulent activity will result in immediate account suspension and may be referred to relevant authorities.`,
  },
  {
    title: "10. Account Suspension and Termination",
    body: `Chowli reserves the right to suspend or permanently terminate your account without notice if you are found to be in breach of these terms, engage in abusive behaviour toward restaurant partners or support staff, or attempt to manipulate the platform in any way. You may request account deletion at any time by contacting support@chowli.com.`,
  },
  {
    title: "11. Privacy",
    body: `Your personal information — including name, email address, phone number, and order history — is collected and stored to provide and improve our services. We do not sell your data to third parties. We may share limited data with restaurant partners solely to fulfil your orders. By using Chowli, you consent to this use of your data in accordance with our Privacy Policy.`,
  },
  {
    title: "12. Limitation of Liability",
    body: `To the fullest extent permitted by law, Chowli shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to food quality issues, delivery delays, or platform downtime. Our total liability for any claim shall not exceed the value of the order in question.`,
  },
  {
    title: "13. Governing Law",
    body: `These Terms and Conditions are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the courts of Nigeria.`,
  },
  {
    title: "14. Contact",
    body: `If you have any questions about these Terms and Conditions or need to raise a concern, please contact us at support@chowli.com. We aim to respond to all enquiries within 2 business days.`,
  },
];

export function TermsScreen({ onAccept, onDecline }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#fff",
      display: "flex", flexDirection: "column",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "16px",
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        <button onClick={onDecline} style={{
          width: 36, height: 36, borderRadius: 10,
          background: "#F5F5F5", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M9 1L2 8.5L9 16" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div style={{
          flex: 1, textAlign: "center",
          fontSize: 17, fontWeight: 700, color: DARK,
          marginRight: 36, // offset for back button width
        }}>
          Terms &amp; Conditions
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <p style={{ fontSize: 13, fontWeight: 400, color: TEXT_MUTED, marginBottom: 16, lineHeight: 1.6 }}>
          Please read and accept our Terms and Conditions before using Chowli.
        </p>

        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: DARK,
              marginTop: 20, marginBottom: 6,
            }}>
              {section.title}
            </div>

            {section.body && (
              <p style={{ fontSize: 13, fontWeight: 400, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
                {section.body}
              </p>
            )}

            {section.subsections && section.subsections.map(sub => (
              <div key={sub.label} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MUTED, flexShrink: 0, minWidth: 28 }}>
                  {sub.label}
                </span>
                <p style={{ fontSize: 13, fontWeight: 400, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
                  {sub.text}
                </p>
              </div>
            ))}
          </div>
        ))}

        {/* Bottom padding so last section clears the sticky bar */}
        <div style={{ height: 16 }} />
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "#fff",
        borderTop: `1px solid ${BORDER}`,
        padding: "16px",
        flexShrink: 0,
      }}>
        {/* Checkbox row */}
        <div
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={() => setAgreed(v => !v)}
        >
          <div style={{
            width: 20, height: 20, flexShrink: 0,
            border: `2px solid ${agreed ? PRIMARY : BORDER}`,
            borderRadius: 4,
            background: agreed ? PRIMARY : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, border-color 0.15s",
          }}>
            {agreed && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{
            marginLeft: 10, fontSize: 13, fontWeight: 500, color: DARK,
            userSelect: "none",
          }}>
            I have read and agree to the Terms and Conditions
          </span>
        </div>

        {/* Continue button */}
        <button
          onClick={agreed ? onAccept : undefined}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "15px 0",
            background: PRIMARY,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: agreed ? "pointer" : "default",
            opacity: agreed ? 1 : 0.4,
            transition: "opacity 0.15s",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
