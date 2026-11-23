# Qikink sandbox report

**RESULT: RUN** on 2026-11-23T20:53:58.950Z against https://sandbox.qikink.com only (never live; nothing printed, shipped or charged).

## In short

Qikink did not give us an access token (qikink-token-failed: Invalid client_id or client_secret). Nothing else could be tested. Check that the Client ID and the **sandbox** secret are right.

## Details

- Access token: FAILED. Refresh: not tested.
- Product: `UWCM-Wh-11 OZ` (white 11 oz mug), print area tested 8.5 x 3.5 inches, delivery to Pune, India. Payment type is always "Prepaid".

| Test | Result | Qikink said |
|---|---|---|


## The exact order sent (no secrets are in an order)



## Notes

- The order-list and tracking calls do not work in the sandbox (documented by Qikink), so tracking cannot be tested here. That is not a failure.
- A design in the sandbox is not printed, so this does not prove where the design lands on a real mug. That needs a physical sample.
- The design image URL used: https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png (a public-domain demo image with no personal data).
