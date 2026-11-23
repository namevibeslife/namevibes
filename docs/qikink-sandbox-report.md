# Qikink sandbox report

**RESULT: RUN** on 2026-11-23T21:01:22.193Z against https://sandbox.qikink.com only (never live; nothing printed, shipped or charged).

## In short

Qikink's sandbox ACCEPTED print type 5 with placement "fr" for the mug (UWCM-Wh-11 OZ), both centred and off-centre.

## Details

- Access token: received. Refresh: worked (a new token was issued, as Qikink documents: it replaces the old one).
- Product: `UWCM-Wh-11 OZ` (white 11 oz mug), print area tested 8.5 x 3.5 inches, delivery to Pune, India. Payment type is always "Prepaid".

| Test | Result | Qikink said |
|---|---|---|
| Mug 8.5 x 3.5 in, design centred, print type 5, placement fr | Accepted | order 45868704 |
| Mug 8.5 x 3.5 in, design off-centre, print type 5, placement fr | Accepted | order 45873408 |
| Control: same mug with print type 1 (to learn which type Qikink accepts) | Rejected | "Invalid Print Type ID for This SKU" |

## The exact order sent (no secrets are in an order)

### Mug 8.5 x 3.5 in, design centred, print type 5, placement fr

```json
{
  "order_number": "nv1jq63ynvwgi",
  "qikink_shipping": 1,
  "gateway": "Prepaid",
  "total_order_value": 1,
  "line_items": [
    {
      "search_from_my_products": 0,
      "print_type_id": 5,
      "quantity": 1,
      "sku": "UWCM-Wh-11 OZ",
      "price": 1,
      "designs": [
        {
          "design_code": "d0_ffffffffffff",
          "width_inches": 8.5,
          "height_inches": 3.5,
          "placement_sku": "fr",
          "design_link": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
          "mockup_link": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
        }
      ]
    }
  ],
  "shipping_address": {
    "first_name": "Sandbox",
    "address1": "1 Test Road",
    "phone": "9999999999",
    "email": "sandbox-test@example.com",
    "city": "Pune",
    "zip": "411001",
    "province": "Maharashtra",
    "country_code": "IN",
    "last_name": "Test"
  }
}
```

### Mug 8.5 x 3.5 in, design off-centre, print type 5, placement fr

```json
{
  "order_number": "nv0y7jd7lg2v9",
  "qikink_shipping": 1,
  "gateway": "Prepaid",
  "total_order_value": 1,
  "line_items": [
    {
      "search_from_my_products": 0,
      "print_type_id": 5,
      "quantity": 1,
      "sku": "UWCM-Wh-11 OZ",
      "price": 1,
      "designs": [
        {
          "design_code": "d0_ffffffffffff",
          "width_inches": 8.5,
          "height_inches": 3.5,
          "placement_sku": "fr",
          "design_link": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
          "mockup_link": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
        }
      ]
    }
  ],
  "shipping_address": {
    "first_name": "Sandbox",
    "address1": "1 Test Road",
    "phone": "9999999999",
    "email": "sandbox-test@example.com",
    "city": "Pune",
    "zip": "411001",
    "province": "Maharashtra",
    "country_code": "IN",
    "last_name": "Test"
  }
}
```

### Control: same mug with print type 1 (to learn which type Qikink accepts)

```json
{
  "order_number": "nv0s7tkr7pma9",
  "qikink_shipping": 1,
  "gateway": "Prepaid",
  "total_order_value": 1,
  "line_items": [
    {
      "search_from_my_products": 0,
      "print_type_id": 1,
      "quantity": 1,
      "sku": "UWCM-Wh-11 OZ",
      "price": 1,
      "designs": [
        {
          "design_code": "d0_ffffffffffff",
          "width_inches": 8.5,
          "height_inches": 3.5,
          "placement_sku": "fr",
          "design_link": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
          "mockup_link": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
        }
      ]
    }
  ],
  "shipping_address": {
    "first_name": "Sandbox",
    "address1": "1 Test Road",
    "phone": "9999999999",
    "email": "sandbox-test@example.com",
    "city": "Pune",
    "zip": "411001",
    "province": "Maharashtra",
    "country_code": "IN",
    "last_name": "Test"
  }
}
```

## Notes

- The order-list and tracking calls do not work in the sandbox (documented by Qikink), so tracking cannot be tested here. That is not a failure.
- A design in the sandbox is not printed, so this does not prove where the design lands on a real mug. That needs a physical sample.
- The design image URL used: https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png (a public-domain demo image with no personal data).
