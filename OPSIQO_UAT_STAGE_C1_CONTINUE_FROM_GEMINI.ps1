# OPSIQO UAT Stage C1 - Continue from Gemini credential failure
# Safe continuation after duplicate/multiple matching API key resources were passed to
# `gcloud services api-keys get-key-string`.
#
# This script:
# - does NOT create another Gemini API key if a matching UAT key already exists
# - deterministically selects exactly one matching Gemini API key resource
# - stores its key string in Secret Manager without printing it
# - preserves existing Job/Survey secret versions
# - grants the App Hosting backend service account access to the 3 UAT secrets
# - validates and applies UAT backend overrideEnv
# - confirms automatic rollouts remain disabled
# - does NOT trigger an App Hosting rollout
# - does NOT modify production
# - does NOT modify certified Git source

$ErrorActionPreference = "Stop"

$ProjectId = "opsiqo-hcm-uat-2026"
$Region = "us-east5"
$BackendId = "opsiqo-hcm-uat"
$AppId = "1:68136784443:web:8c05e5e25ec2ee943e021e"

$ExpectedBranch = "production-v7-9-3-3-certification-20260816"
$ExpectedCommit = "c385efcb9e9d797d171c961170a6efb5d185c3d8"

$RepoRoot = "D:\opsiqo\git\OPSIQO-HCM-V7933-PRODUCTION"

$GeminiDisplayName = "OPSIQO HCM UAT Gemini"
$GeminiApiService = "generativelanguage.googleapis.com"

$JobSecretName = "UAT_OPSIQO_JOB_SECRET"
$SurveySecretName = "UAT_OPSIQO_SURVEY_ANONYMITY_SECRET"
$GeminiSecretName = "UAT_OPSIQO_GEMINI_API_KEY"

$FirebaseCmd = (Get-Command firebase.cmd -ErrorAction Stop).Source
$GcloudCmd = (Get-Command gcloud.cmd -ErrorAction Stop).Source

$WorkDir = Join-Path $env:TEMP ("opsiqo-uat-c1-gemini-" + [Guid]::NewGuid().ToString("N"))
$SdkFile = Join-Path $WorkDir "firebase-sdk.json"

New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

function Invoke-NativeCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$AllowFailure
    )

    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    $stdoutFile = Join-Path $WorkDir ([Guid]::NewGuid().ToString("N") + ".stdout")
    $stderrFile = Join-Path $WorkDir ([Guid]::NewGuid().ToString("N") + ".stderr")

    try {
        & $Executable @Arguments 1>$stdoutFile 2>$stderrFile
        $code = $LASTEXITCODE

        $stdout = ""
        $stderr = ""

        if (Test-Path $stdoutFile) {
            $stdout = Get-Content -LiteralPath $stdoutFile -Raw -ErrorAction SilentlyContinue
        }

        if (Test-Path $stderrFile) {
            $stderr = Get-Content -LiteralPath $stderrFile -Raw -ErrorAction SilentlyContinue
        }
    }
    finally {
        $ErrorActionPreference = $oldPreference
        Remove-Item $stdoutFile, $stderrFile -Force -ErrorAction SilentlyContinue
    }

    if (($code -ne 0) -and (-not $AllowFailure)) {
        throw ("Native command failed with exit code {0}: {1} {2}" -f $code, $Executable, ($Arguments -join " "))
    }

    return [PSCustomObject]@{
        Code = $code
        StdOut = [string]$stdout
        StdErr = [string]$stderr
    }
}

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$AllowFailure
    )

    return Invoke-NativeCapture -Executable $GcloudCmd -Arguments $Arguments -AllowFailure:$AllowFailure
}

function Invoke-Firebase {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$AllowFailure
    )

    return Invoke-NativeCapture -Executable $FirebaseCmd -Arguments $Arguments -AllowFailure:$AllowFailure
}

function Test-SecretExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $r = Invoke-Gcloud -Arguments @(
        "secrets",
        "describe",
        $Name,
        "--project=$ProjectId",
        "--format=value(name)"
    ) -AllowFailure

    return ($r.Code -eq 0)
}

function Test-SecretHasEnabledLatest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $r = Invoke-Gcloud -Arguments @(
        "secrets",
        "versions",
        "describe",
        "latest",
        "--secret=$Name",
        "--project=$ProjectId",
        "--format=value(state)"
    ) -AllowFailure

    if ($r.Code -ne 0) {
        return $false
    }

    return ($r.StdOut.Trim() -eq "ENABLED")
}

function Add-SecretVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $secretFile = Join-Path $WorkDir ([Guid]::NewGuid().ToString("N") + ".secret")

    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($secretFile, $Value, $utf8NoBom)

        Invoke-Gcloud -Arguments @(
            "secrets",
            "versions",
            "add",
            $Name,
            "--data-file=$secretFile",
            "--project=$ProjectId",
            "--quiet"
        ) | Out-Null
    }
    finally {
        if (Test-Path $secretFile) {
            Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host "PASS: enabled secret version ready for $Name" -ForegroundColor Green
}

function Grant-BackendSecretAccess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SecretName,

        [Parameter(Mandatory = $true)]
        [string]$ServiceAccountEmail
    )

    Invoke-Gcloud -Arguments @(
        "secrets",
        "add-iam-policy-binding",
        $SecretName,
        "--project=$ProjectId",
        "--member=serviceAccount:$ServiceAccountEmail",
        "--role=roles/secretmanager.secretAccessor",
        "--condition=None",
        "--quiet"
    ) | Out-Null

    Write-Host "PASS: App Hosting backend can access $SecretName" -ForegroundColor Green
}

function Wait-AppHostingOperation {
    param(
        [Parameter(Mandatory = $true)]
        $Operation,

        [Parameter(Mandatory = $true)]
        [hashtable]$Headers
    )

    if ($Operation.done -eq $true) {
        if ($null -ne $Operation.error) {
            throw ("App Hosting operation failed: " + $Operation.error.message)
        }
        return
    }

    $operationName = [string]$Operation.name

    if ([string]::IsNullOrWhiteSpace($operationName)) {
        return
    }

    $operationUri = "https://firebaseapphosting.googleapis.com/v1beta/$operationName"

    for ($attempt = 1; $attempt -le 36; $attempt++) {
        Start-Sleep -Seconds 5

        $state = Invoke-RestMethod -Method Get -Uri $operationUri -Headers $Headers

        if ($state.done -eq $true) {
            if ($null -ne $state.error) {
                throw ("App Hosting operation failed: " + $state.error.message)
            }
            return
        }

        Write-Host "Waiting for App Hosting operation... $attempt/36"
    }

    throw "App Hosting operation did not complete in time."
}

function Get-MatchingGeminiKeys {
    $listResult = Invoke-Gcloud -Arguments @(
        "services",
        "api-keys",
        "list",
        "--project=$ProjectId",
        "--format=json"
    )

    if ([string]::IsNullOrWhiteSpace($listResult.StdOut)) {
        return @()
    }

    $parsed = $listResult.StdOut | ConvertFrom-Json
    $matches = @()

    foreach ($item in @($parsed)) {
        if ([string]$item.displayName -eq $GeminiDisplayName) {
            $matches += $item
        }
    }

    return @($matches)
}

try {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host " OPSIQO UAT C1 CONTINUE - GEMINI + OVERRIDES" -ForegroundColor Magenta
    Write-Host "============================================================" -ForegroundColor Magenta

    # --------------------------------------------------------
    # 1. Safety assertions
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 1. SAFETY ASSERTIONS ===" -ForegroundColor Cyan

    Set-Location $RepoRoot

    $branch = ([string](git branch --show-current)).Trim()
    if ($branch -ne $ExpectedBranch) {
        throw "Wrong Git branch: $branch"
    }

    $commit = ([string](git rev-parse HEAD)).Trim()
    if ($commit -ne $ExpectedCommit) {
        throw "Wrong Git commit: $commit"
    }

    $currentProject = ([string](& $GcloudCmd config get-value project 2>$null)).Trim()
    if ($currentProject -ne $ProjectId) {
        Invoke-Gcloud -Arguments @("config", "set", "project", $ProjectId) | Out-Null
    }

    Write-Host "PASS: certification branch." -ForegroundColor Green
    Write-Host "PASS: certified commit." -ForegroundColor Green
    Write-Host "PASS: active Google Cloud project is UAT." -ForegroundColor Green

    # --------------------------------------------------------
    # 2. Verify pre-existing Job/Survey secrets
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 2. EXISTING UAT SECRET STATE ===" -ForegroundColor Cyan

    foreach ($secretName in @($JobSecretName, $SurveySecretName, $GeminiSecretName)) {
        if (-not (Test-SecretExists -Name $secretName)) {
            throw "Expected UAT secret does not exist: $secretName"
        }

        Write-Host "PASS: secret resource exists: $secretName" -ForegroundColor Green
    }

    if (-not (Test-SecretHasEnabledLatest -Name $JobSecretName)) {
        throw "Job secret has no enabled latest version."
    }

    if (-not (Test-SecretHasEnabledLatest -Name $SurveySecretName)) {
        throw "Survey anonymity secret has no enabled latest version."
    }

    Write-Host "PASS: Job secret enabled version preserved." -ForegroundColor Green
    Write-Host "PASS: Survey secret enabled version preserved." -ForegroundColor Green

    # --------------------------------------------------------
    # 3. Complete Gemini secret safely
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 3. UAT GEMINI CREDENTIAL REPAIR ===" -ForegroundColor Cyan

    if (Test-SecretHasEnabledLatest -Name $GeminiSecretName) {
        Write-Host "PASS: Gemini secret already has an enabled latest version." -ForegroundColor Green
    }
    else {
        $matchingKeys = @(Get-MatchingGeminiKeys)

        if ($matchingKeys.Count -eq 0) {
            Write-Host "No matching UAT Gemini API key exists; creating one." -ForegroundColor Yellow

            Invoke-Gcloud -Arguments @(
                "services",
                "api-keys",
                "create",
                "--project=$ProjectId",
                "--display-name=$GeminiDisplayName",
                "--api-target=service=$GeminiApiService",
                "--format=json"
            ) | Out-Null

            Start-Sleep -Seconds 3
            $matchingKeys = @(Get-MatchingGeminiKeys)
        }

        if ($matchingKeys.Count -eq 0) {
            throw "Unable to resolve a UAT Gemini API key."
        }

        if ($matchingKeys.Count -gt 1) {
            Write-Host ("NOTICE: {0} matching UAT Gemini API keys exist. Exactly one will be selected; no key will be deleted." -f $matchingKeys.Count) -ForegroundColor Yellow
        }

        # Choose one object deterministically. Prefer newest createTime when available.
        $chosenKey = $matchingKeys |
            Sort-Object -Property createTime -Descending |
            Select-Object -First 1

        $geminiKeyResource = [string]$chosenKey.name
        $geminiKeyResource = $geminiKeyResource.Trim()

        if ([string]::IsNullOrWhiteSpace($geminiKeyResource)) {
            throw "Selected Gemini API key resource name is empty."
        }

        # Strong guard against accidentally passing multiple resource names again.
        if ($geminiKeyResource -match "[\r\n\t ]") {
            throw "Selected Gemini API key resource unexpectedly contains whitespace or multiple values."
        }

        if ($geminiKeyResource -notmatch '^projects/[0-9]+/locations/global/keys/[A-Za-z0-9_-]+$') {
            throw "Selected Gemini API key resource has an unexpected format."
        }

        Write-Host "PASS: exactly one Gemini API key resource selected." -ForegroundColor Green
        Write-Host "API key resource/key-string values are not displayed." -ForegroundColor DarkGray

        $keyStringResult = Invoke-Gcloud -Arguments @(
            "services",
            "api-keys",
            "get-key-string",
            $geminiKeyResource,
            "--project=$ProjectId",
            "--format=value(keyString)"
        )

        $geminiKeyString = $keyStringResult.StdOut.Trim()

        if ([string]::IsNullOrWhiteSpace($geminiKeyString)) {
            throw "Unable to retrieve the selected UAT Gemini key string."
        }

        Add-SecretVersion -Name $GeminiSecretName -Value $geminiKeyString

        $geminiKeyString = $null

        Write-Host "PASS: Gemini key material stored in Secret Manager." -ForegroundColor Green
        Write-Host "Gemini key value was not displayed." -ForegroundColor DarkGray
    }

    # --------------------------------------------------------
    # 4. Firebase SDK config + App Check
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 4. FIREBASE + APP CHECK CONFIG ===" -ForegroundColor Cyan

    Invoke-Firebase -Arguments @(
        "apps:sdkconfig",
        "WEB",
        $AppId,
        "--project",
        $ProjectId,
        "-o",
        $SdkFile
    ) | Out-Null

    if (-not (Test-Path $SdkFile)) {
        throw "Firebase SDK configuration was not downloaded."
    }

    $sdk = Get-Content -LiteralPath $SdkFile -Raw | ConvertFrom-Json

    if ($sdk.projectId -ne $ProjectId) {
        throw "Firebase SDK project mismatch."
    }

    if ($sdk.appId -ne $AppId) {
        throw "Firebase SDK app mismatch."
    }

    if ([string]::IsNullOrWhiteSpace([string]$sdk.apiKey)) {
        throw "Firebase Web API key is missing."
    }

    $recaptchaResult = Invoke-Gcloud -Arguments @(
        "recaptcha",
        "keys",
        "list",
        "--project=$ProjectId",
        "--format=json"
    )

    $recaptchaParsed = @()
    if (-not [string]::IsNullOrWhiteSpace($recaptchaResult.StdOut)) {
        $recaptchaParsed = @($recaptchaResult.StdOut | ConvertFrom-Json)
    }

    $appCheckKey = @(
        $recaptchaParsed |
        Where-Object { $_.displayName -eq "OPSIQO HCM UAT App Check" }
    ) | Select-Object -First 1

    if ($null -eq $appCheckKey) {
        throw "UAT App Check key was not found."
    }

    $appCheckSiteKey = ([string]$appCheckKey.name -split "/")[-1]

    if ([string]::IsNullOrWhiteSpace($appCheckSiteKey)) {
        throw "Unable to resolve UAT App Check site key."
    }

    Write-Host "PASS: Firebase Web config loaded." -ForegroundColor Green
    Write-Host "PASS: App Check key resolved." -ForegroundColor Green
    Write-Host "Firebase/App Check values were not displayed." -ForegroundColor DarkGray

    # --------------------------------------------------------
    # 5. App Hosting cloud truth
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 5. APP HOSTING CLOUD TRUTH ===" -ForegroundColor Cyan

    $token = ([string](& $GcloudCmd auth print-access-token)).Trim()
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "Could not obtain Google Cloud access token."
    }

    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
        "x-goog-user-project" = $ProjectId
    }

    $backendUri = "https://firebaseapphosting.googleapis.com/v1beta/projects/$ProjectId/locations/$Region/backends/$BackendId"
    $trafficUri = "$backendUri/traffic"

    $backend = Invoke-RestMethod -Method Get -Uri $backendUri -Headers $headers
    $traffic = Invoke-RestMethod -Method Get -Uri $trafficUri -Headers $headers

    if ($backend.appId -ne $AppId) {
        throw "Backend App ID mismatch."
    }

    if ($traffic.rolloutPolicy.codebaseBranch -ne $ExpectedBranch) {
        throw "Backend Git branch mismatch."
    }

    if ($traffic.rolloutPolicy.disabled -ne $true) {
        throw "Automatic UAT rollouts are not disabled."
    }

    $backendServiceAccount = [string]$backend.serviceAccount
    if ([string]::IsNullOrWhiteSpace($backendServiceAccount)) {
        throw "Backend service account could not be resolved."
    }

    $baseUrl = "https://$($backend.uri)"

    Write-Host "PASS: correct UAT backend." -ForegroundColor Green
    Write-Host "PASS: automatic rollouts remain disabled." -ForegroundColor Green

    # --------------------------------------------------------
    # 6. Grant secret access
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 6. APP HOSTING SECRET ACCESS ===" -ForegroundColor Cyan

    foreach ($secretName in @($JobSecretName, $SurveySecretName, $GeminiSecretName)) {
        Grant-BackendSecretAccess -SecretName $secretName -ServiceAccountEmail $backendServiceAccount
    }

    # --------------------------------------------------------
    # 7. Build UAT override set
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 7. BUILD UAT BACKEND OVERRIDES ===" -ForegroundColor Cyan

    $projectNumberResult = Invoke-Gcloud -Arguments @(
        "projects",
        "describe",
        $ProjectId,
        "--format=value(projectNumber)"
    )

    $projectNumber = $projectNumberResult.StdOut.Trim()

    if ([string]::IsNullOrWhiteSpace($projectNumber)) {
        throw "Could not resolve UAT project number."
    }

    $overrideEnv = @(
        @{
            variable = "FIREBASE_PROJECT_ID"
            value = $ProjectId
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
            value = $ProjectId
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_APP_ID"
            value = $AppId
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
            value = [string]$sdk.messagingSenderId
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_API_KEY"
            value = [string]$sdk.apiKey
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
            value = [string]$sdk.authDomain
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "FIREBASE_STORAGE_BUCKET"
            value = [string]$sdk.storageBucket
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
            value = [string]$sdk.storageBucket
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY"
            value = $appCheckSiteKey
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "APP_BASE_URL"
            value = $baseUrl
            availability = @("RUNTIME")
        },
        @{
            variable = "NEXT_PUBLIC_APP_BASE_URL"
            value = $baseUrl
            availability = @("BUILD", "RUNTIME")
        },
        @{
            variable = "OPSIQO_AI_PROVIDER"
            value = "gemini"
        },
        @{
            variable = "GEMINI_API_KEY"
            secret = "projects/$projectNumber/secrets/$GeminiSecretName/versions/latest"
        },
        @{
            variable = "OPSIQO_JOB_SECRET"
            secret = "projects/$projectNumber/secrets/$JobSecretName/versions/latest"
        },
        @{
            variable = "OPSIQO_SURVEY_ANONYMITY_SECRET"
            secret = "projects/$projectNumber/secrets/$SurveySecretName/versions/latest"
        },
        @{
            variable = "OPSIQO_BACKUP_EVIDENCE_MODE"
            value = "governed_manual"
        },
        @{
            variable = "OPSIQO_PLATFORM_MONITORING_SOURCE"
            value = "firebase_app_hosting_and_cloud_logging"
        },
        @{
            variable = "OPSIQO_REGULATORY_SOURCE_HOSTS"
            value = "canada.ca,www.ontario.ca"
        },
        @{
            variable = "OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF"
            value = "PENDING"
            availability = @("RUNTIME")
        },
        @{
            variable = "OPSIQO_PRODUCTION_EVIDENCE_REF"
            value = "PENDING"
        },
        @{
            variable = "OPSIQO_CLOUD_DR_EVIDENCE_REF"
            value = "PENDING"
        },
        @{
            variable = "OPSIQO_DR_EXERCISE_EVIDENCE_REF"
            value = "PENDING"
        }
    )

    Write-Host "PASS: UAT override set assembled." -ForegroundColor Green

    # --------------------------------------------------------
    # 8. Validate overrides
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 8. VALIDATE UAT OVERRIDES ===" -ForegroundColor Cyan

    $patchBodyObject = @{
        name = "projects/$ProjectId/locations/$Region/backends/$BackendId"
        etag = $backend.etag
        overrideEnv = $overrideEnv
    }

    $patchBody = $patchBodyObject | ConvertTo-Json -Depth 20
    $validateUri = "$backendUri?updateMask=overrideEnv&validateOnly=true"

    $validationOperation = Invoke-RestMethod -Method Patch -Uri $validateUri -Headers $headers -Body $patchBody
    Wait-AppHostingOperation -Operation $validationOperation -Headers $headers

    Write-Host "PASS: UAT override configuration validated." -ForegroundColor Green

    # --------------------------------------------------------
    # 9. Apply overrides
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 9. APPLY UAT OVERRIDES ===" -ForegroundColor Cyan

    $backend = Invoke-RestMethod -Method Get -Uri $backendUri -Headers $headers

    $patchBodyObject.etag = $backend.etag
    $patchBody = $patchBodyObject | ConvertTo-Json -Depth 20
    $patchUri = "$backendUri?updateMask=overrideEnv"

    $updateOperation = Invoke-RestMethod -Method Patch -Uri $patchUri -Headers $headers -Body $patchBody
    Wait-AppHostingOperation -Operation $updateOperation -Headers $headers

    Write-Host "PASS: UAT backend overrides persisted." -ForegroundColor Green

    # --------------------------------------------------------
    # 10. Final verification
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "=== 10. FINAL UAT OVERRIDE INVENTORY ===" -ForegroundColor Cyan

    $finalBackend = Invoke-RestMethod -Method Get -Uri $backendUri -Headers $headers

    $overrideRows = @(
        foreach ($entry in @($finalBackend.overrideEnv)) {
            $source = "VALUE"

            if (($entry.PSObject.Properties.Name -contains "secret") -and
                (-not [string]::IsNullOrWhiteSpace([string]$entry.secret))) {
                $source = "SECRET"
            }

            [PSCustomObject]@{
                Variable = $entry.variable
                Source = $source
            }
        }
    )

    $overrideRows | Sort-Object Variable | Format-Table -AutoSize

    $requiredNames = @(
        "FIREBASE_PROJECT_ID",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        "NEXT_PUBLIC_FIREBASE_APP_ID",
        "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "FIREBASE_STORAGE_BUCKET",
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY",
        "APP_BASE_URL",
        "NEXT_PUBLIC_APP_BASE_URL",
        "GEMINI_API_KEY",
        "OPSIQO_JOB_SECRET",
        "OPSIQO_SURVEY_ANONYMITY_SECRET",
        "OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF",
        "OPSIQO_PRODUCTION_EVIDENCE_REF",
        "OPSIQO_CLOUD_DR_EVIDENCE_REF",
        "OPSIQO_DR_EXERCISE_EVIDENCE_REF"
    )

    $actualNames = @($finalBackend.overrideEnv | ForEach-Object { $_.variable })

    foreach ($requiredName in $requiredNames) {
        if ($actualNames -notcontains $requiredName) {
            throw "Missing backend override: $requiredName"
        }
    }

    Write-Host "PASS: all required UAT overrides are present." -ForegroundColor Green

    Write-Host ""
    Write-Host "=== 11. ROLLOUT CONTROL ===" -ForegroundColor Cyan

    $finalTraffic = Invoke-RestMethod -Method Get -Uri $trafficUri -Headers $headers

    [PSCustomObject]@{
        LiveBranch = $finalTraffic.rolloutPolicy.codebaseBranch
        AutomaticRolloutsOff = $finalTraffic.rolloutPolicy.disabled
        BackendReconciling = $finalBackend.reconciling
    } | Format-List

    if ($finalTraffic.rolloutPolicy.codebaseBranch -ne $ExpectedBranch) {
        throw "UAT branch changed unexpectedly."
    }

    if ($finalTraffic.rolloutPolicy.disabled -ne $true) {
        throw "Automatic UAT rollouts are no longer disabled."
    }

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " UAT APP HOSTING CONFIGURATION READY" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green

    Write-Host ""
    Write-Host "Certified Git source unchanged." -ForegroundColor Green
    Write-Host "Production project unchanged." -ForegroundColor Green
    Write-Host "Automatic rollouts remain disabled." -ForegroundColor Green
    Write-Host "No App Hosting rollout was triggered." -ForegroundColor Green
    Write-Host "No secret value was displayed." -ForegroundColor Green

    if ($matchingKeys.Count -gt 1) {
        Write-Host ""
        Write-Host ("NOTE: {0} duplicate-named Gemini API keys remain for later cleanup after UAT deployment is verified." -f $matchingKeys.Count) -ForegroundColor Yellow
    }
}
finally {
    $token = $null
    $headers = $null
    $sdk = $null
    $appCheckSiteKey = $null
    $geminiKeyString = $null
    $overrideEnv = $null
    $patchBody = $null
    $patchBodyObject = $null
    $matchingKeys = $null
    $chosenKey = $null
    $geminiKeyResource = $null

    Set-Location $env:TEMP

    if (Test-Path $WorkDir) {
        Remove-Item -LiteralPath $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
