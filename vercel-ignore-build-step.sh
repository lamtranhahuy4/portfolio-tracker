#!/bin/bash
# Script to prevent Vercel from building if it's just a draft PR or if you want to rely purely on GitHub Actions passing.
# Usage in Vercel Dashboard -> Project Settings -> Git -> Ignored Build Step:
# bash vercel-ignore-build-step.sh

echo "VERCEL_ENV: $VERCEL_ENV"
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

# Only build automatically on main or dev-hl branches
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ] || [ "$VERCEL_GIT_COMMIT_REF" == "dev-hl" ]; then
  echo "✅ Proceeding with Vercel Build (Branch: $VERCEL_GIT_COMMIT_REF)"
  exit 1; # Exit 1 tells Vercel to PROCEED with the build
else
  echo "🛑 Canceling Vercel Build (Branch: $VERCEL_GIT_COMMIT_REF). Preview builds should be triggered manually or rely on GitHub Actions."
  exit 0; # Exit 0 tells Vercel to CANCEL the build
fi
