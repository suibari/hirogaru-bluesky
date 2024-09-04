import { inngest } from '$lib/inngest/inngest.js';
import { serve } from 'inngest/sveltekit';
import { updateDbFunction } from '$lib/inngest/function.js';

const inngestServe = serve({
  client: inngest,
  functions: [updateDbFunction],
});

export const POST = inngestServe.POST;
