#!/bin/bash
echo "Checking Vercel project configuration..."
echo ""
echo "1. Check if vercel is linked:"
if [ -f .vercel/project.json ]; then
  echo "   ✓ Project is linked"
  cat .vercel/project.json
else
  echo "   ✗ Project not linked to Vercel"
fi
echo ""
echo "2. Check environment:"
echo "   NODE_ENV: $NODE_ENV"
echo "   AUTH_SECRET set: $([ -n \"$AUTH_SECRET\" ] && echo 'YES' || echo 'NO')"
