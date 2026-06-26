import argparse
import base64
import json
import os
from datetime import datetime, timezone

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

KEY_DIR = os.path.dirname(os.path.abspath(__file__))
PRIVATE_KEY_PATH = os.path.join(KEY_DIR, "private_key.pem")
PUBLIC_KEY_PATH = os.path.join(KEY_DIR, "public_key.hex")

def generate_keys():
    """Generate a new Ed25519 key pair."""
    print("Generating new Ed25519 key pair...")
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    # Save private key
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    with open(PRIVATE_KEY_PATH, "wb") as f:
        f.write(private_bytes)

    # Save public key as hex string
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    public_hex = public_bytes.hex()
    with open(PUBLIC_KEY_PATH, "w") as f:
        f.write(public_hex)

    print(f"Keys generated successfully!")
    print(f"Private Key saved to: {PRIVATE_KEY_PATH}")
    print(f"Public Key saved to: {PUBLIC_KEY_PATH}")
    print(f"Public Key (Hex): {public_hex}")
    print("\nIMPORTANT: Copy the Public Key (Hex) into desktop/app/license.py PUBLIC_KEY_HEX variable.")

def generate_license(licensee: str, expires: str, hwid: str):
    """Generate a signed license key."""
    if not os.path.exists(PRIVATE_KEY_PATH):
        print(f"Error: Private key not found at {PRIVATE_KEY_PATH}")
        print("Run with --generate-keys first.")
        return

    # Load private key
    with open(PRIVATE_KEY_PATH, "rb") as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)

    # Create payload
    payload_dict = {
        "licensee": licensee,
        "issued": datetime.now(timezone.utc).isoformat(),
        "expires": expires,
        "hwid": hwid
    }
    
    payload_json = json.dumps(payload_dict, separators=(',', ':'))
    payload_bytes = payload_json.encode('utf-8')
    
    # Sign payload
    signature_bytes = private_key.sign(payload_bytes)
    
    # Encode as Base64 (URL-safe, no padding)
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip("=")
    signature_b64 = base64.urlsafe_b64encode(signature_bytes).decode('utf-8').rstrip("=")
    
    # Combine into JWT-like string
    license_key = f"{payload_b64}.{signature_b64}"
    
    print("\n=== GENERATED LICENSE KEY ===")
    print(f"Licensee : {licensee}")
    print(f"Expires  : {expires}")
    print(f"HWID     : {hwid if hwid else 'Any'}")
    print("-----------------------------")
    print(license_key)
    print("=============================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OPTO-PROFIT License Key Generator")
    parser.add_argument("--generate-keys", action="store_true", help="Generate a new Ed25519 key pair")
    parser.add_argument("--licensee", type=str, help="Name of the licensee / company")
    parser.add_argument("--expires", type=str, help="Expiry date in ISO format (e.g. 2027-12-31T23:59:59Z)")
    parser.add_argument("--hwid", type=str, default="", help="Machine fingerprint (hardware ID) to bind the license to")
    
    args = parser.parse_args()
    
    if args.generate_keys:
        generate_keys()
    elif args.licensee and args.expires:
        generate_license(args.licensee, args.expires, args.hwid)
    else:
        parser.print_help()
