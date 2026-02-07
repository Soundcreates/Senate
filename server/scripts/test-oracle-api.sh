#!/bin/bash
# End-to-end test of all oracle API endpoints
BASE="http://localhost:3000/api/oracle"

echo "=== 1. GET /api/oracle/status ==="
curl -s "$BASE/status" | python3 -m json.tool
echo ""

echo "=== 2. GET /api/oracle/escrows (list from factory) ==="
curl -s "$BASE/escrows" | python3 -m json.tool
echo ""

echo "=== 3. POST /api/oracle/sign (generate signature) ==="
curl -s -X POST "$BASE/sign" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAddress": "0x0000000000000000000000000000000000000001",
    "milestoneId": 0,
    "members": ["0x4C3F5a84041E562928394d63b3E339bE70DBcC17"],
    "scores": [100]
  }' | python3 -m json.tool
echo ""

echo "=== 4. POST /api/oracle/sign (validation: missing fields) ==="
curl -s -X POST "$BASE/sign" \
  -H "Content-Type: application/json" \
  -d '{"escrowAddress": "0x01"}' | python3 -m json.tool
echo ""

echo "=== 5. POST /api/oracle/sign (validation: array mismatch) ==="
curl -s -X POST "$BASE/sign" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAddress": "0x0000000000000000000000000000000000000001",
    "milestoneId": 0,
    "members": ["0x4C3F5a84041E562928394d63b3E339bE70DBcC17"],
    "scores": [100, 200]
  }' | python3 -m json.tool
echo ""

echo "=== 6. GET /api/oracle/escrow/:address (nonexistent escrow) ==="
curl -s "$BASE/escrow/0x0000000000000000000000000000000000000001" | python3 -m json.tool
echo ""

echo "=== 7. POST /api/oracle/submit-scores (no real escrow - expect revert) ==="
curl -s -X POST "$BASE/submit-scores" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAddress": "0x0000000000000000000000000000000000000001",
    "milestoneId": 0,
    "members": ["0x4C3F5a84041E562928394d63b3E339bE70DBcC17"],
    "scores": [100]
  }' | python3 -m json.tool
echo ""

echo "=== 8. POST /api/oracle/finalize (no real escrow - expect revert) ==="
curl -s -X POST "$BASE/finalize" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAddress": "0x0000000000000000000000000000000000000001",
    "milestoneId": 0
  }' | python3 -m json.tool
echo ""

echo "=== ALL TESTS COMPLETE ==="
