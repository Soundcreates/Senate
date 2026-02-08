// Test script to check task details endpoint
const projectId = process.argv[2];
const taskId = process.argv[3];

if (!projectId || !taskId) {
  console.error('Usage: node test-task-details.js <projectId> <taskId>');
  process.exit(1);
}

const url = `http://localhost:5000/api/projects/${projectId}/tasks/${taskId}/details`;

console.log(`Testing: ${url}`);

fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
})
  .then(async (response) => {
    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  })
  .catch((error) => {
    console.error('Error:', error.message);
  });
