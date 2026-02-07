/**
 * Submit developer profile to n8n vector database workflow
 * This will parse the resume and store the data in the vector database
 */
export async function submitToVectorDB(profileData) {
    try {
        const formData = new FormData();
        formData.append('name', profileData.name);
        formData.append('role', profileData.role); // hr, developer, legal, or finance
        formData.append('tier', profileData.tier); // intern, junior, or senior
        formData.append('wallet address', profileData.walletAddress);
        
        if (profileData.resume) {
            formData.append('resume', profileData.resume);
        }

        const response = await fetch(
            'https://antdev.app.n8n.cloud/webhook/bbd71201-1fa2-40e3-84b2-563ab983efe1',
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            return { ok: false, error: 'vector_db_submission_failed' };
        }

        const data = await response.json();
        
        // n8n returns {"message":"Workflow was started"} or {"status":200}
        if (data.message === 'Workflow was started' || data.status === 200) {
            return { ok: true, data };
        }

        return { ok: false, error: 'unexpected_response' };
    } catch (error) {
        console.error('Vector DB submission error:', error);
        return { ok: false, error: 'network_error' };
    }
}
