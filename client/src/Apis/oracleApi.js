const BASE = "https://senate-qiog.onrender.com";

/**
 * Get oracle status / address
 */
export async function getOracleStatus() {
  try {
    const res = await fetch(`${BASE}/status`);
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Request oracle to sign scores for a milestone
 */
export async function requestScoreSignature({ escrowAddress, milestoneId, members, scores }) {
  try {
    const res = await fetch(`${BASE}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowAddress, milestoneId, members, scores }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Ask oracle backend to submit scores on-chain directly
 */
export async function requestSubmitScores({ escrowAddress, milestoneId, members, scores }) {
  try {
    const res = await fetch(`${BASE}/submit-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowAddress, milestoneId, members, scores }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Ask oracle backend to finalize a milestone on-chain
 */
export async function requestFinalizeMilestone({ escrowAddress, milestoneId }) {
  try {
    const res = await fetch(`${BASE}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowAddress, milestoneId }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Read escrow data from chain via backend
 */
export async function fetchEscrowFromBackend(escrowAddress) {
  try {
    const res = await fetch(`${BASE}/escrow/${escrowAddress}`);
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * List all escrows via backend
 */
export async function fetchAllEscrows() {
  try {
    const res = await fetch(`${BASE}/escrows`);
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
