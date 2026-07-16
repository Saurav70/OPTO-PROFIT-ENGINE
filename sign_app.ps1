Write-Host "=========================================="
Write-Host " OPTO-PROFIT Code Signing Script "
Write-Host "=========================================="
Write-Host ""
Write-Host "This script will generate a local self-signed certificate and sign OPTO-PROFIT.exe"
Write-Host "so that Windows Smart App Control will allow it to run on this machine."
Write-Host ""
Write-Host ">>> IMPORTANT: A Windows Security prompt will appear asking you to install a certificate."
Write-Host ">>> You MUST click 'Yes' for this to work!"
Write-Host ""
Pause

$cert = New-SelfSignedCertificate -Subject "CN=OPTO-PROFIT Developer" -Type CodeSigningCert -CertStoreLocation "Cert:\CurrentUser\My"
Export-Certificate -Cert $cert -FilePath "dev_cert.cer" | Out-Null
Import-Certificate -FilePath "dev_cert.cer" -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
Set-AuthenticodeSignature -FilePath "k:\OPTO-PROFIT\desktop\dist\OPTO-PROFIT.exe" -Certificate $cert | Out-Null

Write-Host ""
Write-Host "Signing complete! You can now close this window and double-click OPTO-PROFIT.exe."
Pause
