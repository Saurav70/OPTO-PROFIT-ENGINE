# OPTO-PROFIT Licensing & Activation Guide

This document outlines the end-to-end process for generating license keys and activating the OPTO-PROFIT desktop application on any machine. It is intended for the software vendor (you) to manage customer licenses securely.

---

## 1. Overview of the Licensing System

OPTO-PROFIT uses an **Offline, Hardware-Locked, Asymmetric Cryptography** licensing model.

- **Asymmetric Cryptography (Ed25519)**: The system uses a public/private key pair.
  - The **Private Key** is kept strictly secret on your machine and is used to *sign* license keys.
  - The **Public Key** is embedded in the application code (`backend/app/license.py`). The app uses this to *verify* that a license was genuinely created by you.
- **Hardware-Locked (HWID)**: Each license is bound to a specific computer's hardware fingerprint (CPU ID + Motherboard Serial Number). This prevents customers from buying one license and copying the application to multiple computers.
- **Offline**: The activation process requires no internet connection.

---

## 2. Generating a License Key (Vendor Process)

When a customer purchases OPTO-PROFIT, follow these steps to grant them access.

### Step 2.1: Obtain the Customer's HWID
1. Instruct the customer to install and open the OPTO-PROFIT application.
2. Upon opening, the app will display the **License Activation Screen**.
3. On this screen, the customer's unique **Hardware ID (HWID)** will be displayed (e.g., `27CCE96460FFE11E`).
4. Ask the customer to copy this HWID and send it to you.

### Step 2.2: Run the Key Generator
On your machine (the vendor machine), run the secure key generation script. This script already contains your secret private key.

1. Open PowerShell or Command Prompt.
2. Navigate to the backend directory and activate the virtual environment:
   ```powershell
   cd k:\OPTO-PROFIT\backend
   .\venv\Scripts\activate
   ```
3. Run the generator script:
   ```powershell
   python scripts/generate_license.py
   ```

### Step 2.3: Enter Customer Details
The script will run interactively. Provide the requested information:

1. **Licensee name**: Enter the customer's name or company (e.g., `Acme Manufacturing`).
2. **Customer HWID**: Paste the 16-character HWID the customer sent you.
3. **Select Duration**: Choose how long the license should remain valid:
   - `1` - 1 Year (365 days)
   - `2` - 2 Years (730 days)
   - `3` - Perpetual (100 years - never expires)
   - `4` - Custom number of days

### Step 2.4: Send the License Key
The script will output a long, encrypted string. This is the **License Key**.

**Example Output:**
```text
eyJsaWNlbnNlZSI6IkFjbWUiLCJpc3N1ZWQiOiIyMDI2LTA2LTI5VDE1OjM2OjAzIiwiaHdpZCI6IjI3Q0NFOTY0NjBGRkUxMUUifQ.o7sTRAny_qAC5XUAJmwfKn9KRs1OF40sHpj83hly31hlKdiw9b0LaViOe3eqvuJiqKc5oahiYhLbPaCqW6O1AQ
```

Copy this entire string and send it to your customer via email, WhatsApp, or any secure channel.

---

## 3. Activating the Application (Customer Process)

Once the customer receives the License Key from you, they activate the software as follows:

1. Open OPTO-PROFIT.
2. On the **License Activation Screen**, paste the provided License Key into the input field.
3. Click **Activate**.

### What happens in the background?
- The app uses its embedded **Public Key** to verify the signature of the License Key. If anyone tried to tamper with the key (e.g., changing the expiration date), the signature will fail, and the app will reject it.
- The app checks if the current machine's HWID matches the HWID embedded in the license. If the customer copied the software to a different computer, the HWID will not match, and access will be denied.
- If everything is valid, the app saves the license to `AppData/Roaming/OPTO-PROFIT/license.dat` and unlocks the software.

---

## 4. Security Warnings & Best Practices

> [!CAUTION]
> **Protect Your Private Key**
> The `generate_license.py` script contains your master Private Key. **Anyone who possesses this script can generate unlimited, free licenses for your software.**
> - Never share `generate_license.py` with anyone.
> - Never commit it to a public GitHub repository (it is currently ignored via `.gitignore`).
> - Keep a backup of this script on an offline USB drive in case your computer crashes. If you lose the private key, you cannot generate licenses for the current version of the app.

> [!WARNING]
> **Database Encryption**
> The SQLite database used by OPTO-PROFIT (`optoprofit.db`) is transparently encrypted using a key derived from the machine's HWID. If a user copies the database file to another machine to steal data, the application will not be able to decrypt it.
