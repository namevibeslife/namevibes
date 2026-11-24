# Qikink SKUs for the NAMASUTRA starter products

Source: Qikink dashboard, Products > SKU Descriptions (read 23 Nov 2026, 2,777 entries in total). Base price is Qikink's cost in INR per unit. `Product Dimensions` in the dashboard is a package/product size, NOT a print area. The SKU table does NOT list `print_type_id` or print-area sizes, so those must be confirmed separately (see bottom).

SKU rule seen in the data: `<product code>-<colour code>-<size or variant>` (examples: `MRnHs-Bk-S`, `UFPos-Wh-A4 Frame poster`). Some SKUs contain spaces; send them exactly as written.

## T-shirts (apparel)
| Category | SKU pattern | Colours | Sizes | Base price (INR) | Tax % |
|---|---|---|---|---|---|
| Male Classic Crew T-Shirt | `MRnHs-<col>-<size>`, e.g. `MRnHs-Bk-S` | 34 (Black, Navy Blue, Grey Melange, White, Red, Royal Blue, ...) | XS, S, M, L, XL, XXL, 3XL to 7XL | 180 to 290 depending on size | 5 |
| Female Classic Crew T-Shirt | `FRnHs-<col>-<size>`, e.g. `FRnHs-Bk-S` | 22 | XS to XXL | 160 | 5 |
| Unisex Oversized Classic T-Shirt (UC22) | `UOsMRnHs-<col>-<size>`, e.g. `UOsMRnHs-Wh-S` | 19 | XS to XXL | 260 | 5 |
| Unisex Basic T-Shirt PC (UB73) | `UBscRnHs-<col>-<size>`, e.g. `UBscRnHs-Wh-S` | 9 | XS to XXL | 110 | 5 |

Colour codes seen: Bk Black, Nb Navy Blue, Gm Grey Melange, Rb Royal Blue, Rd Red, Wh White (full colour-to-code list: read the Export from the SKU page). Other apparel in the catalogue (hoodies, sweatshirts, caps, totes, kids, AOP) exists if we add them later.

## Mugs (tax 5%)
| Product | SKU | Base price |
|---|---|---|
| White Coffee Mug 11 oz | `UWCM-Wh-11 OZ` | 115 |
| Black Coffee Mug 11 oz | `UBCM-Bk-11 OZ` | 174 |
| Color Coffee Mug (inner/handle colour) | `UCCM-Wh-Green`, `-SkyBlue`, `-Orange`, `-Black`, `-DarkBlue`, `-Red`, `-Yellow`, `-LightPink` | 174 |
| Magic Coffee Mug 11 oz | `UMCM-Wh-11oz Black`, `11oz Red`, `11ozGreen`, `11ozRoyalBlue` | 174 |
| White Enamel Mug 11 oz | `UWECM-Wh-11oz` | 254 |
Recommended first mug: `UWCM-Wh-11 OZ` (cheapest, plain white, best for the full-colour red-and-gold blood-group art).

## Notebooks and notepads (tax 18%)
| Product | SKU | Base price |
|---|---|---|
| Notebook, ruled | `UNotebook-Wh-Notebook Ruled` | 162 |
| Notebook, unruled | `UNotebook-Wh-Notebook Unruled` | 162 |
| NotePad, ruled | `UNotePad-Wh-Notepad Ruled` | 156 |
| NotePad, unruled | `UNotePad-Wh-Notepad UnRuled` | 156 |

## Posters, unframed (tax 18%)
`UPoster-Wh-A5 poster` 34, `UPoster-Wh-A4 poster` 39, `UPoster-Wh-A3 poster` 50, `UPoster-Wh-8x8Pos` 50 (tax 12), `UPoster-Wh-8x10pos` 50, `UPoster-Wh-10x10pos` 50, `UPoster-Wh-12x16pos` 60, `UPoster-Wh-12x18pos` 60.

## Framed posters (tax 18%)
| Size | SKU (colour code in the middle) | Colours | Base price |
|---|---|---|---|
| A4 | `UFPos-<col>-A4 Frame poster` | Wh White, Bk Black, Yl Yellow, Gn Bottle Green, Rb Royal Blue, OG Olive Green | 212 |
| A3 | `UFPos-<col>-A3 Frame poster` | same six | 326 |
| 8x8 in | `UFPos-<col>-8x8FPoster` | White, Black | 173 |
| 8x10 in | `UFPos-<col>-8x10fpos` | White, Black | 188 |
| 10x10 in | `UFPos-<col>-10x10fpos` | White, Black | 212 |
| 12x12 in | `UFPos-<col>-12x12FPoster` | White, Black | 248 |
| 11x14 in | `UFPos-<col>-11x14Fpos` | White, Black | 282 |
| 12x16 in | `UFPos-<col>-12x16Fpos` | White, Black | 299 |
| 12x18 in | `UFPos-<col>-12x18Fpos` | White, Black | 321 |
Recommended first framed posters: A4 and A3 in Black or White (the two best-supported sizes).

## Not in this table; confirm before activating a product
1. `print_type_id` per SKU (T-shirts are likely 1 = DTG, but only Qikink can confirm; mugs and posters are not stated). The API rejects a wrong one with "Invalid Print Type ID for This SKU", so the first sandbox create-order calls can verify each.
2. Print-area size in inches and allowed `placement_sku` per product (DTG max is 16 x 20 in, DTF 18 x 20 in per the API docs; mugs, notebooks, posters need Qikink's print-area guide).
3. Whether a whole-order shipping charge, COD/prepaid rules or add-on prices apply (not in the table).
4. Prices above are Qikink's cost, not our selling price; add shipping, payment fees, GST handling and margin when you set India prices.

## Update 24 November 2026
Starter SKUs now cover the full catalogue (framed posters x sizes x colours, acrylic sizes, stand `UAcryDiSt-Wh-NA`, frame `UAcryFrmStd-Wh-NA`, 15 mug variants, 3 bottles). All are marked unverified except the white mug; print type IDs stay unset until confirmed with Qikink. See docs/launch-scope.md.
