import { INNGEST_EVENT_KEY } from '$env/static/private';
import { Inngest } from 'inngest';

const options = { id: 'MyWorker' };

if (INNGEST_EVENT_KEY) {
  options.eventKey = INNGEST_EVENT_KEY;
}

export const inngest = new Inngest(options);
