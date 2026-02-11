#!/bin/bash
# Launch Foundry VTT with the test fixtures data path.
# Usage: ./tests/e2e/foundry.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIXTURES="$REPO_ROOT/__fixtures__/FoundryVTT"
FOUNDRY="$REPO_ROOT/foundry/main.js"

if [ ! -f "$FOUNDRY" ]; then
  echo "Error: Foundry not found at $FOUNDRY"
  echo "Ensure the 'foundry' symlink points to your Foundry V14 installation."
  exit 1
fi

echo "Starting Foundry VTT (test) on port 30001..."
echo "Data path: $FIXTURES"
exec node "$FOUNDRY" --dataPath="$FIXTURES"
