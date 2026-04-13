#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "dev-hl" ]; then
  echo "ERROR: Commit is blocked on branch 'dev-hl'."
  echo "Please switch to 'main' to commit."
  exit 1
fi
EOF

cat > .git/hooks/pre-push <<'EOF'
#!/bin/sh
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "dev-hl" ]; then
  echo "ERROR: Push is blocked when current branch is 'dev-hl'."
  echo "Please switch to 'main' before pushing."
  exit 1
fi
EOF

chmod +x .git/hooks/pre-commit .git/hooks/pre-push
echo "Git guard hooks installed successfully."
