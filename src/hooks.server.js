// src/hooks.server.js
import { Agent } from 'undici';

// Create an undici agent with autoSelectFamily option
const agent = new Agent({
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 30_000,
  autoSelectFamily: true
});

// Override fetch function globally
export const handleFetch = async ({ request, fetch }) => {
  // Clone the request and set the agent
  const newRequest = new Request(request, {
    agent
  });

  // Call the original fetch with the modified request
  return fetch(newRequest);
};
