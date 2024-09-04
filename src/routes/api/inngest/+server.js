import { INNGEST_SIGING_KEY } from '$env/static/private';
import { inngest } from '$lib/inngest/inngest.js';
import { serve } from 'inngest/sveltekit';
import { updateDbFunction } from '$lib/inngest/function.js';

const options = {
  client: inngest,
  functions: [updateDbFunction],
}

if (INNGEST_SIGING_KEY) {
  options.signingKey = INNGEST_SIGING_KEY;
}

const inngestServe = serve(options);

export const POST = inngestServe.POST;
