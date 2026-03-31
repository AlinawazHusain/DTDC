"""
gst_calculator.py
-----------------
Determines intra-state vs inter-state shipment from a DSRRecord
and computes IGST / CGST / SGST accordingly.

Usage:
    from gst_calculator import compute_gst, get_state_from_pincode

    result = compute_gst(dsr_record, tax_rate=18.0)
    # result.igst, result.cgst, result.sgst, result.is_interstate, ...
"""

from typing import List, Optional
from fastapi import HTTPException
from db.tables import RateSlab


# ── Pincode prefix → State mapping ───────────────────────────────────────────
# Based on India Post's pincode zone allocation (first 2–3 digits)
_PINCODE_STATE_MAP: dict[str, str] = {
    # Delhi
    "11": "Delhi",
    # Haryana
    "12": "Haryana", "13": "Haryana",
    # Punjab
    "14": "Punjab", "15": "Punjab", "16": "Punjab",
    # Himachal Pradesh
    "17": "Himachal Pradesh",
    # Jammu & Kashmir / Ladakh
    "18": "Jammu and Kashmir", "19": "Jammu and Kashmir",
    # Uttar Pradesh
    "20": "Uttar Pradesh", "21": "Uttar Pradesh",
    "22": "Uttar Pradesh", "23": "Uttar Pradesh",
    "24": "Uttar Pradesh", "25": "Uttar Pradesh",
    "26": "Uttar Pradesh", "27": "Uttar Pradesh",
    "28": "Uttar Pradesh",
    # Uttarakhand
    "24": "Uttarakhand",   # 244xxx–249xxx overlap; refined below via 3-digit
    # Rajasthan
    "30": "Rajasthan", "31": "Rajasthan", "32": "Rajasthan",
    "33": "Rajasthan", "34": "Rajasthan",
    # Gujarat
    "36": "Gujarat", "37": "Gujarat", "38": "Gujarat", "39": "Gujarat",
    # Maharashtra
    "40": "Maharashtra", "41": "Maharashtra", "42": "Maharashtra",
    "43": "Maharashtra", "44": "Maharashtra", "45": "Maharashtra",
    "46": "Maharashtra",
    # Madhya Pradesh
    "47": "Madhya Pradesh", "48": "Madhya Pradesh", "49": "Madhya Pradesh",
    "45": "Madhya Pradesh", "46": "Madhya Pradesh",
    # Goa
    "403": "Goa",
    # Chhattisgarh
    "49": "Chhattisgarh", "48": "Chhattisgarh",
    # Andhra Pradesh / Telangana (split from 2014)
    "50": "Telangana", "51": "Telangana", "52": "Telangana",
    "53": "Andhra Pradesh",
    # Karnataka
    "56": "Karnataka", "57": "Karnataka", "58": "Karnataka", "59": "Karnataka",
    # Tamil Nadu
    "60": "Tamil Nadu", "61": "Tamil Nadu", "62": "Tamil Nadu",
    "63": "Tamil Nadu", "64": "Tamil Nadu",
    # Kerala
    "67": "Kerala", "68": "Kerala", "69": "Kerala",
    # Puducherry
    "605": "Puducherry", "533": "Puducherry",
    # Lakshadweep
    "682": "Lakshadweep",
    # West Bengal
    "70": "West Bengal", "71": "West Bengal", "72": "West Bengal",
    "73": "West Bengal", "74": "West Bengal",
    # Sikkim
    "737": "Sikkim",
    # Assam
    "78": "Assam",
    # Meghalaya
    "793": "Meghalaya", "794": "Meghalaya",
    # Manipur
    "795": "Manipur",
    # Nagaland
    "797": "Nagaland",
    # Mizoram
    "796": "Mizoram",
    # Tripura
    "799": "Tripura",
    # Arunachal Pradesh
    "790": "Arunachal Pradesh", "791": "Arunachal Pradesh", "792": "Arunachal Pradesh",
    # Odisha
    "75": "Odisha", "76": "Odisha", "77": "Odisha",
    # Bihar
    "80": "Bihar", "81": "Bihar", "82": "Bihar", "83": "Bihar", "84": "Bihar",
    # Jharkhand
    "82": "Jharkhand", "83": "Jharkhand", "84": "Jharkhand", "85": "Jharkhand",
    # Andaman & Nicobar
    "744": "Andaman and Nicobar Islands",
}

# 3-digit overrides (more specific; applied after 2-digit lookup)
_PINCODE_STATE_3DIG: dict[str, str] = {
    "244": "Uttarakhand", "245": "Uttarakhand", "246": "Uttarakhand",
    "247": "Uttarakhand", "248": "Uttarakhand", "249": "Uttarakhand",
    "403": "Goa",
    "605": "Puducherry",
    "533": "Puducherry",
    "682": "Lakshadweep",
    "737": "Sikkim",
    "744": "Andaman and Nicobar Islands",
    "790": "Arunachal Pradesh", "791": "Arunachal Pradesh", "792": "Arunachal Pradesh",
    "793": "Meghalaya",         "794": "Meghalaya",
    "795": "Manipur",
    "796": "Mizoram",
    "797": "Nagaland",
    "799": "Tripura",
    "800": "Bihar",             "801": "Bihar", "802": "Bihar",
    "803": "Bihar",             "804": "Bihar", "805": "Bihar",
    "806": "Jharkhand",         "807": "Jharkhand", "808": "Jharkhand",
    "809": "Jharkhand",         "814": "Jharkhand", "815": "Jharkhand",
    "816": "Jharkhand",         "825": "Jharkhand", "826": "Jharkhand",
    "827": "Jharkhand",         "828": "Jharkhand", "829": "Jharkhand",
    "481": "Chhattisgarh",      "482": "Chhattisgarh", "483": "Chhattisgarh",
    "484": "Chhattisgarh",      "485": "Chhattisgarh", "486": "Chhattisgarh",
    "487": "Chhattisgarh",      "488": "Chhattisgarh", "491": "Chhattisgarh",
    "492": "Chhattisgarh",      "493": "Chhattisgarh", "494": "Chhattisgarh",
    "495": "Chhattisgarh",      "496": "Chhattisgarh",
    "500": "Telangana",         "501": "Telangana",    "502": "Telangana",
    "503": "Telangana",         "504": "Telangana",    "505": "Telangana",
    "506": "Telangana",         "507": "Telangana",    "508": "Telangana",
    "509": "Telangana",
    "515": "Andhra Pradesh",    "516": "Andhra Pradesh", "517": "Andhra Pradesh",
    "518": "Andhra Pradesh",    "519": "Andhra Pradesh",
    "520": "Andhra Pradesh",    "521": "Andhra Pradesh", "522": "Andhra Pradesh",
    "523": "Andhra Pradesh",    "524": "Andhra Pradesh", "525": "Andhra Pradesh",
    "530": "Andhra Pradesh",    "531": "Andhra Pradesh", "532": "Andhra Pradesh",
    "533": "Andhra Pradesh",    "534": "Andhra Pradesh", "535": "Andhra Pradesh",
}


def get_state_from_pincode(pincode: Optional[str]) -> Optional[str]:
    """
    Resolve an Indian pincode (string or int) to a state name.
    Returns None if pincode is missing or unrecognised.

    Resolution order:
      1. 3-digit prefix override (_PINCODE_STATE_3DIG)
      2. 2-digit prefix fallback (_PINCODE_STATE_MAP)
    """
    if not pincode:
        return None

    pin = str(pincode).strip().replace(" ", "")
    if len(pin) < 6 or not pin.isdigit():
        return None

    # Try 3-digit prefix first (more specific)
    state = _PINCODE_STATE_3DIG.get(pin[:3])
    if state:
        return state

    # Fall back to 2-digit prefix
    return _PINCODE_STATE_MAP.get(pin[:2])



# ── Core calculator ───────────────────────────────────────────────────────────
def calculate_final_amount(
        sgst_percent:float ,
        cgst_percent:float ,
        igst_percent:float ,
        chargable_weight:float ,
        slabs:List[List] ,
        within_state:bool ):
    breakdown = []
    total = 0.0
    remaining = chargable_weight

    for slab in slabs:
        if remaining <= 0:
            break

        band_start = slab[0]
        band_end = slab[1]
        rate_per_kg = slab[2]

        # Calculate weight in this slab
        if band_end is None:
            in_band = remaining
        else:
            slab_capacity = band_end - band_start
            in_band = min(remaining, slab_capacity)

        if in_band <= 0:
            continue

        cost = round(in_band * rate_per_kg, 2)
        total += cost
        remaining -= in_band

        label = f"{band_start}–{band_end} kg" if band_end is not None else f"{band_start}+ kg"

        breakdown.append({
            "slab_label": label,
            "weight_in_band": round(in_band, 4),
            "rate_per_kg": rate_per_kg,
            "cost": cost
        })

    if remaining > 0:
        raise HTTPException(
            status_code=422,
            detail=f"{remaining} kg not covered by any slab. Add an open-ended slab."
        )

    total_cost = round(total, 2)

    cgst = 0
    sgst = 0
    igst = 0

    if within_state:
        cgst = total_cost * (cgst_percent / 100)
        sgst = total_cost * (sgst_percent / 100)
        final_amount = total_cost

        return {
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "igst": 0,
            "total": round(final_amount, 2)
        }
    else:
        igst = total_cost * (igst_percent/ 100)
        final_amount = total_cost  

        return {
            "cgst": 0,
            "sgst": 0,
            "igst": round(igst, 2),
            "total": round(final_amount, 2)
        }








