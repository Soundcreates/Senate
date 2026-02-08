require('dotenv').config();
const token = process.env.GITHUB_TOKEN;
const owner = 'Soundcreates';
const repo = 'I-want-to-build-an-AI-web3-marketplace';

async function main() {
  // Get latest workflow run
  const runsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const runs = await runsRes.json();
  const runId = runs.workflow_runs[0].id;
  console.log('Run ID:', runId, '| Event:', runs.workflow_runs[0].event);

  // Get jobs
  const jobsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const jobs = await jobsRes.json();
  
  jobs.jobs.forEach(job => {
    console.log(`\nJob: ${job.name} | Status: ${job.status} | Conclusion: ${job.conclusion}`);
    job.steps?.forEach(step => {
      console.log(`  Step: ${step.name} | Conclusion: ${step.conclusion}`);
    });
  });

  // Get workflow file content
  const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/copilot-review.yml`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const file = await fileRes.json();
  const content = Buffer.from(file.content, 'base64').toString('utf-8');
  console.log('\n--- WORKFLOW FILE (first 100 lines) ---');
  console.log(content.split('\n').slice(0, 100).join('\n'));

  // Check PRs
  const prsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=5`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const prs = await prsRes.json();
  console.log('\n--- PULL REQUESTS ---');
  prs.forEach(pr => {
    console.log(`PR #${pr.number}: ${pr.title} | State: ${pr.state} | Merged: ${pr.merged_at ? 'yes' : 'no'} | Body: ${(pr.body || '').substring(0, 100)}`);
  });

  // Get PR review comments
  if (prs.length > 0) {
    const pr = prs[0];
    const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const comments = await commentsRes.json();
    console.log(`\n--- PR #${pr.number} Review Comments: ${comments.length} ---`);
    comments.forEach(c => {
      console.log(`  ${c.user?.login}: ${(c.body || '').substring(0, 200)}`);
    });

    // Get issue comments on the PR 
    const issueCommentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const issueComments = await issueCommentsRes.json();
    console.log(`\n--- PR #${pr.number} Issue Comments: ${issueComments.length} ---`);
    issueComments.forEach(c => {
      console.log(`  ${c.user?.login}: ${(c.body || '').substring(0, 200)}`);
    });
  }
}

main().catch(console.error);
