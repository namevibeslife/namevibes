// Ambassador display name for payouts: full name from their record, or their email while they
// haven't filled in their details. The name is saved on each payout request when it is created.
export const ambassadorLabel = (ambassador) =>
  String(ambassador?.fullName || '').trim() || String(ambassador?.email || ambassador?.ambassadorEmail || '').trim();

// "IN482913 – Priya Sharma"
export const codeWithName = (code, name) => [code, name].filter(Boolean).join(' – ');
export const payoutCodeLabel = (payout) =>
  codeWithName(payout.referralCode, String(payout.ambassadorName || '').trim() || payout.ambassadorEmail || '');
