# Frontend Blockchain Integration Testing Guide

## 🚀 Quick Start

**Backend**: http://localhost:3000 ✅ (running)  
**Frontend**: http://localhost:5174 ✅ (running)  
**Oracle Address**: `0x4C3F5a84041E562928394d63b3E339bE70DBcC17` ✅ (whitelisted)

---

## 📋 Test Workflow

### Phase 1: Initial Setup (5 min)

1. **Open the app**: http://localhost:5174
2. **Login/Register** with your account
3. **Connect MetaMask**:
   - Click wallet connect button (if in navbar) or go to Register page
   - Make sure you're on **Sepolia testnet**
   - Need test ETH? Get it from [Sepolia Faucet](https://sepoliafaucet.com/)
   - Need test USDC? Get it from [Circle Faucet](https://faucet.circle.com/) (select Sepolia + USDC)

---

### Phase 2: Create or Use a Project (2 min)

**Option A: Create New Project**
1. Go to Dashboard
2. Create a new project
3. Add team members (their wallet addresses must be filled in their profiles)

**Option B: Use Existing Project**
1. Go to any project you own
2. Make sure team members have wallet addresses in their profiles

---

### Phase 3: Deploy Escrow to Project (5 min)

1. **Open Project Details** page
2. **Click "Deploy Escrow"** button (top right, only visible to project creator)
3. **Fill in the form**:
   - **Oracle**: Auto-filled with `0x4C3F...cC17` (✅ our whitelisted oracle)
   - **Arbitrator**: Use the same `0x4C3F5a84041E562928394d63b3E339bE70DBcC17` or another address
   - **Total Budget**: e.g., `1000` USDC
   - **Dispute Window**: e.g., `86400` (1 day in seconds) or `3600` (1 hour for quick testing)
   - **Milestones**: Click "Add Milestone" to create 2-3 milestones
     - Milestone 1: Budget `300`, Deadline unix timestamp (use https://www.unixtimestamp.com/)
     - Milestone 2: Budget `400`, Deadline timestamp
     - Milestone 3: Budget `300`, Deadline timestamp
   - **Contributors**: Auto-filled from team wallets — verify all addresses are valid
4. **Approve USDC**:
   - Modal will show your USDC balance
   - Click "Approve USDC" → MetaMask pops up → Confirm
   - Wait for confirmation (~ 10-20 sec)
5. **Deploy Escrow**:
   - Click "Deploy Escrow" → MetaMask pops up → Confirm
   - Wait for deployment (~ 20-30 sec)
   - Transaction hash and escrow address will appear
6. **Link to Backend**:
   - Automatically calls backend to save escrow data
   - Project page will refresh and show escrow info

**✅ Success**: You should see:
- "Escrow Active" badge in project header
- "Escrow" card in right column with budget, milestones, contributors
- Milestone timeline with status badges

---

### Phase 4: Submit Scores (Oracle Flow) (10 min)

**Backend Route**: `POST /api/oracle/submit-scores`

**Option A: Use API directly** (recommended for first test)

```bash
# Get the escrow address from the project page
export ESCROW_ADDRESS="0x..." # Replace with your deployed escrow

# Submit scores for milestone 0
# Make sure the addresses match your actual contributors
curl -X POST http://localhost:3000/api/oracle/submit-scores \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAddress": "'$ESCROW_ADDRESS'",
    "milestoneId": 0,
    "members": [
      "0xYourContributor1Address",
      "0xYourContributor2Address"
    ],
    "scores": [85, 92]
  }' | python3 -m json.tool
```

**Expected Response**:
```json
{
  "ok": true,
  "txHash": "0x..."
}
```

**Option B: Build a UI** (if you want)
- Create a button in `ProjectDetail.jsx` or `DisputePanel.jsx`
- Call `requestSubmitScores()` from `oracleApi.js`
- Pass escrow address, milestone index, contributor addresses, and scores

**✅ Success**: 
- Transaction confirms on Sepolia
- Milestone status changes from 0 (Pending) → 1 (ScoresSubmitted)
- Contributors can now see their pending withdrawals

---

### Phase 5: Test Withdrawals (5 min)

1. **Go to User Dashboard** as one of the contributors
2. **Connect Wallet** (same wallet that was in contributors list)
3. **Check "Payments" card**: Should show pending USDC amount
4. **Scroll to "Pending Payments" section**: Should list the project
5. **Click "Withdraw"** → MetaMask pops up → Confirm
6. **Wait** for tx confirmation
7. **Verify**: Amount should appear in your wallet's USDC balance

**✅ Success**: USDC transferred from escrow to contributor wallet

---

### Phase 6: Test Disputes (Optional, 5 min)

**If you want to test the dispute flow:**

1. **Before dispute window closes**, go to **ProjectDetail** page
2. **Scroll to DisputePanel** (left column, below Tasks)
3. **Click "Raise Dispute"** on a milestone
4. **Enter reason**: e.g., "Scores are incorrect"
5. **Submit** → MetaMask pops up → Confirm
6. **Wait** for confirmation
7. **Check status**: Milestone should now show "In Dispute" (status 2)

**To Resolve** (as arbitrator):
- Only the arbitrator wallet can call `resolveDispute()` 
- This requires either:
  - Frontend button in DisputePanel (not implemented yet)
  - Direct contract call via ethers or Etherscan

---

### Phase 7: Finalize Milestones (5 min)

**After dispute window expires** (e.g., 1 hour if you set 3600):

1. Go to **ProjectDetail** page
2. **DisputePanel** → Find milestone with status "ScoresSubmitted" and expired dispute window
3. **Click "Finalize"** → MetaMask pops up → Confirm
4. **Wait** for confirmation
5. **Status changes**: Milestone → "Finalized" (status 3)

**Or use backend**:
```bash
curl -X POST http://localhost:3000/api/oracle/finalize \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAddress": "'$ESCROW_ADDRESS'",
    "milestoneId": 0
  }' | python3 -m json.tool
```

**✅ Success**: Milestone is now permanently finalized

---

### Phase 8: Admin Monitoring (2 min)

1. **Go to Admin Dashboard** (if you have admin access)
2. **Click "Escrows" tab**
3. **Check Oracle Status**: Should show configured with address
4. **Check Escrow List**: Should show all deployed escrows with:
   - Budget
   - Milestone count
   - Finalized/disputed counts
   - Contributor count
   - Etherscan links

---

## 🧪 Quick Testing Checklist

- [ ] MetaMask connected to Sepolia
- [ ] Have test ETH for gas
- [ ] Have test USDC (at least 100 for small test)
- [ ] Project created with team members
- [ ] All team members have wallet addresses in profiles
- [ ] Escrow deployed successfully
- [ ] Scores submitted for milestone 0
- [ ] Contributor can see pending payment
- [ ] Contributor can withdraw successfully
- [ ] Milestone finalized after dispute window

---

## 🐛 Troubleshooting

**"Wrong network" error**:
- Switch MetaMask to Sepolia testnet (Chain ID: 11155111)

**"Insufficient USDC balance"**:
- Get test USDC from [Circle Faucet](https://faucet.circle.com/)
- Make sure to select **Sepolia** + **USDC**

**"Transaction reverted"**:
- Check browser console for error details
- Common causes:
  - Not enough gas (get more ETH)
  - Dispute window not expired (can't finalize)
  - Milestone already finalized
  - Not the oracle/arbitrator/owner

**Escrow not showing after deployment**:
- Check if `linkEscrowToProject` succeeded (`/api/projects/:id/escrow`)
- Refresh the page
- Check MongoDB to see if `escrowAddress` field was saved

**Oracle endpoints failing**:
- Check server logs: `lsof -ti:3000 | xargs kill -9 && cd server && node app.js`
- Verify `.env` has `ORACLE_PRIVATE_KEY` and `SEPOLIA_RPC_URL`
- Test: `curl http://localhost:3000/api/oracle/status`

---

## 📚 API Reference

### Oracle Endpoints

**GET /api/oracle/status**
```json
{ "ok": true, "oracle": "0x...", "configured": true }
```

**POST /api/oracle/sign**
```json
{
  "escrowAddress": "0x...",
  "milestoneId": 0,
  "members": ["0x...", "0x..."],
  "scores": [85, 92]
}
```

**POST /api/oracle/submit-scores**
Same body as `/sign`, directly submits on-chain

**POST /api/oracle/finalize**
```json
{
  "escrowAddress": "0x...",
  "milestoneId": 0
}
```

**GET /api/oracle/escrow/:address**
Returns full escrow data (milestones, contributors, budgets)

**GET /api/oracle/escrows**
Returns list of all escrow addresses from factory

---

## 🔗 Useful Links

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Factory Contract**: https://sepolia.etherscan.io/address/0x7fC3446ae26286EF5668Df02f7C1c96a6a1c458B
- **RewardToken**: https://sepolia.etherscan.io/address/0x27a90bE82CF59d286634a5A49F384d4B369A1E84
- **USDC (Sepolia)**: https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Circle USDC Faucet**: https://faucet.circle.com/

---

## 💡 Next Steps

Once basic flow works, you can:
1. Add cron jobs to auto-submit scores daily (using `computeDailyScore.py`)
2. Build oracle signature UI for project owners to request score submissions
3. Add arbitrator dispute resolution UI
4. Implement refund logic for cancelled projects
5. Add analytics dashboard for escrow metrics
6. Test multi-milestone projects with complex contributor sets

---

**Happy Testing! 🎉**
