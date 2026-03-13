/**
 * Netlify Function: Assets Upload
 * Handles file uploads to Git repository or external storage
 */

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Validate authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { filename, content, type } = body;

        if (!filename || !content) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Filename and content are required' })
            };
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (type && !allowedTypes.includes(type)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'File type not allowed' })
            };
        }

        // Sanitize filename
        const sanitizedName = filename
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-{2,}/g, '-')
            .substring(0, 100);

        const path = `assets/images/${sanitizedName}`;

        // In production, this would:
        // 1. Upload to GitHub or external storage (S3, Cloudflare R2)
        // 2. Return the public URL
        
        // For demo, return a mock response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                filename: sanitizedName,
                path: path,
                url: `/${path}`,
                message: 'Asset uploaded successfully'
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
