/**
 * Netlify Function: Content API
 * Handles content CRUD operations with Git-backed storage
 * 
 * GET: Retrieve published content
 * POST: Save draft content
 * PUT: Publish content (creates Git commit)
 */

const { Octokit } = require('@octokit/rest');

// GitHub configuration from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Validate authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token && event.httpMethod !== 'GET') {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        // Initialize Octokit for GitHub API
        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        switch (event.httpMethod) {
            case 'GET':
                return await handleGet(octokit, event, headers);
            case 'POST':
                return await handlePost(octokit, event, headers);
            case 'PUT':
                return await handlePublish(octokit, event, headers);
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Content API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * GET: Retrieve published content
 */
async function handleGet(octokit, event, headers) {
    const path = event.queryStringParameters?.path || 'data/site-content.json';
    
    try {
        const response = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: path,
            ref: GITHUB_BRANCH
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                content: JSON.parse(content),
                sha: response.data.sha,
                lastModified: response.data.html_url
            })
        };
    } catch (error) {
        // File doesn't exist yet
        if (error.status === 404) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Content not found' })
            };
        }
        throw error;
    }
}

/**
 * POST: Save draft content
 */
async function handlePost(octokit, event, headers) {
    const body = JSON.parse(event.body);
    const { path, content, message } = body;
    
    if (!path || !content) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Path and content are required' })
        };
    }

    const fullPath = path.startsWith('data/') ? path : `data/${path}`;
    const commitMessage = message || `Update ${path} via Admin Panel`;
    const contentEncoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

    try {
        // Get current file SHA if it exists
        let sha = null;
        try {
            const response = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: fullPath,
                ref: GITHUB_BRANCH
            });
            sha = response.data.sha;
        } catch (e) {
            // File doesn't exist, will create new
        }

        const response = await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: fullPath,
            message: `📝 Draft: ${commitMessage}`,
            content: contentEncoded,
            branch: GITHUB_BRANCH,
            ...(sha && { sha })
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                commit: response.data.commit.sha,
                message: 'Draft saved'
            })
        };
    } catch (error) {
        throw new Error(`Failed to save draft: ${error.message}`);
    }
}

/**
 * PUT: Publish content (creates Git commit and triggers deploy)
 */
async function handlePublish(octokit, event, headers) {
    const body = JSON.parse(event.body);
    const { files, message } = body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Files array is required' })
        };
    }

    const commitMessage = message || 'Publish content via Admin Panel';
    const results = [];

    for (const file of files) {
        const { path, content } = file;
        const fullPath = path.startsWith('data/') ? path : `data/${path}`;
        const contentEncoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

        try {
            // Get current SHA
            let sha = null;
            try {
                const response = await octokit.repos.getContent({
                    owner: GITHUB_OWNER,
                    repo: GITHUB_REPO,
                    path: fullPath,
                    ref: GITHUB_BRANCH
                });
                sha = response.data.sha;
            } catch (e) {
                // File doesn't exist
            }

            const response = await octokit.repos.createOrUpdateFileContents({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: fullPath,
                message: `🚀 Publish: ${commitMessage}`,
                content: contentEncoded,
                branch: GITHUB_BRANCH,
                ...(sha && { sha })
            });

            results.push({
                path: fullPath,
                success: true,
                sha: response.data.commit.sha
            });
        } catch (error) {
            results.push({
                path: fullPath,
                success: false,
                error: error.message
            });
        }
    }

    // Trigger Netlify deploy hook if configured
    const DEPLOY_HOOK_URL = process.env.NETLIFY_DEPLOY_HOOK;
    if (DEPLOY_HOOK_URL) {
        try {
            await fetch(DEPLOY_HOOK_URL, { method: 'POST' });
        } catch (e) {
            console.warn('Deploy hook failed:', e.message);
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Content published',
            results,
            deployTriggered: !!DEPLOY_HOOK_URL
        })
    };
}
