import '@testing-library/jest-dom'

// Stub all VITE_ env vars used at module load time
Object.assign(import.meta.env, {
  VITE_API_BASE_URL: 'https://api.example.com',
  VITE_QUERY_STREAM_URL: 'https://stream.example.com',
  VITE_QUERY_STREAM_RERANKED_URL: 'https://reranked.example.com',
  VITE_AWS_REGION: 'eu-west-2',
  VITE_USER_POOL_ID: 'eu-west-2_TestPool',
  VITE_USER_POOL_CLIENT_ID: 'testclientid',
})
