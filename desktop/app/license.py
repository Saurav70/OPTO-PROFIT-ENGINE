import base64
import hashlib
import json
import logging
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass, asdict

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519

logger = logging.getLogger("optoprofit-license")

# The public key will be embedded here during the build process
# If empty, the app will run in an unverified state or reject all keys
PUBLIC_KEY_HEX = "429e89616057d5ac79e3566a475b4437ccc5d5c7b22f27e7aa42804753e48066"

APP_DATA = Path(os.environ.get("APPDATA", Path.home())) / "OPTO-PROFIT"
APP_DATA.mkdir(parents=True, exist_ok=True)
LICENSE_PATH = APP_DATA / "license.dat"


@dataclass
class LicensePayload:
    licensee: str
    issued: str
    expires: str
    hwid: str


def get_hardware_fingerprint() -> str:
    """Generate a stable hardware fingerprint based on CPU and Baseboard."""
    try:
        # Try getting CPU ID
        cpu_cmd = subprocess.run(["wmic", "cpu", "get", "processorid"], capture_output=True, text=True, timeout=2)
        cpu_id = "".join(cpu_cmd.stdout.split()[1:]) if cpu_cmd.returncode == 0 else ""

        # Try getting Baseboard Serial
        board_cmd = subprocess.run(["wmic", "baseboard", "get", "serialnumber"], capture_output=True, text=True, timeout=2)
        board_serial = "".join(board_cmd.stdout.split()[1:]) if board_cmd.returncode == 0 else ""

        hw_string = f"{cpu_id}-{board_serial}"
        if len(hw_string) < 5:
            # Fallback if wmic fails
            import uuid
            hw_string = str(uuid.getnode())

        return hashlib.sha256(hw_string.encode('utf-8')).hexdigest()[:16].upper()
    except Exception as e:
        logger.error(f"Failed to generate hardware fingerprint: {e}")
        import uuid
        return hashlib.sha256(str(uuid.getnode()).encode('utf-8')).hexdigest()[:16].upper()


def verify_license_key(key_string: str) -> LicensePayload | None:
    """Verify the Base64 JWT-style license key using the embedded public key."""
    if not PUBLIC_KEY_HEX:
        logger.error("No public key embedded in the application.")
        return None

    try:
        parts = key_string.strip().split(".")
        if len(parts) != 2:
            return None

        payload_b64, signature_b64 = parts
        
        # Add padding back if necessary
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4))
        signature_bytes = base64.urlsafe_b64decode(signature_b64 + "=" * (-len(signature_b64) % 4))

        # Verify signature
        public_key_bytes = bytes.fromhex(PUBLIC_KEY_HEX)
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(public_key_bytes)
        
        try:
            public_key.verify(signature_bytes, payload_bytes)
        except InvalidSignature:
            logger.warning("License signature verification failed.")
            return None

        # Parse payload
        payload_dict = json.loads(payload_bytes.decode('utf-8'))
        payload = LicensePayload(**payload_dict)

        # Check expiry
        expires_date = datetime.fromisoformat(payload.expires)
        if expires_date.tzinfo is None:
            expires_date = expires_date.replace(tzinfo=timezone.utc)
            
        if datetime.now(timezone.utc) > expires_date:
            logger.warning("License has expired.")
            return None

        # Check HWID
        current_hwid = get_hardware_fingerprint()
        if payload.hwid and payload.hwid != current_hwid:
            logger.warning(f"Hardware mismatch. License HWID: {payload.hwid}, Current: {current_hwid}")
            return None

        return payload

    except Exception as e:
        logger.error(f"Error verifying license key: {e}")
        return None


def get_license_status() -> dict:
    """Check the stored license status."""
    if not LICENSE_PATH.exists():
        return {
            "activated": False,
            "error": "No license key found. Please activate the product.",
            "hwid": get_hardware_fingerprint()
        }

    try:
        with open(LICENSE_PATH, "r") as f:
            key_string = f.read().strip()
            
        payload = verify_license_key(key_string)
        if payload:
            return {
                "activated": True,
                "licensee": payload.licensee,
                "expires": payload.expires,
                "hwid": payload.hwid,
                "error": None
            }
        else:
            return {
                "activated": False,
                "error": "Stored license key is invalid or expired.",
                "hwid": get_hardware_fingerprint()
            }
    except Exception as e:
        return {
            "activated": False,
            "error": f"Failed to read license: {e}",
            "hwid": get_hardware_fingerprint()
        }


def activate_license(key_string: str) -> dict:
    """Activate the application with the given key string."""
    payload = verify_license_key(key_string)
    if not payload:
        return {"success": False, "error": "Invalid, expired, or hardware-mismatched license key."}
        
    try:
        with open(LICENSE_PATH, "w") as f:
            f.write(key_string)
        return {"success": True, "licensee": payload.licensee, "expires": payload.expires}
    except Exception as e:
        return {"success": False, "error": f"Failed to save license key: {e}"}
