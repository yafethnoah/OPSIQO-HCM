# OPSIQO V7.32 H29 â€” Source Manifest Portability Closure

## Purpose

Close the release-integrity portability defect discovered after H28 freeze.

H28 application source was healthy and immutable. Canonical Git export verification
identified 36 hash mismatches. Read-only diagnosis proved:

- 36 byte mismatches;
- 36 became identical after CRLF -> LF normalization;
- 0 non-line-ending byte differences;
- Git index held LF while the Windows working tree contained CRLF or mixed EOLs.

## Root cause

`scripts/source-manifest.mjs` hashed raw working-tree bytes. That made text-file
digests dependent on checkout EOL representation even though `.gitattributes`
normalizes text to LF in Git.

## H29 contract

- UTF-8 text source is canonicalized from CRLF to LF before SHA-256.
- Binary files remain byte-for-byte SHA-256 protected.
- Lone CR, BOM, final-newline state, whitespace and all non-EOL bytes remain significant.
- Existing path traversal, symlink, duplicate path, missing, stale and unlisted-file
  protections remain unchanged.
- Local environment-secret exclusions remain unchanged.

## Regression coverage

The source-manifest test now proves:

- LF and CRLF text verify against the same manifest;
- mixed LF/CRLF verifies against the same manifest;
- real text changes fail;
- binary byte changes fail;
- unlisted files fail;
- missing files fail;
- path/rename changes fail.

## Scope

Release engineering only.

No H28 localization/application behavior is modified.
No Firebase resource is modified.
No UAT or production deployment is performed by the H29 patch.
