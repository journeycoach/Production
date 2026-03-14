const SANITY_PROJECT_ID = '9ksnhows';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = 'v2024-03-10';

// A lightweight custom client using the native Fetch API to avoid heavy UMD bundle errors
const sanityClient = {
    fetch: function(query) {
        const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Sanity API error: ${res.status}`);
                return res.json();
            })
            .then(data => data.result);
    }
};
