import { INNGEST_EVENT_KEY } from '$env/static/private';
import { Inngest } from 'inngest';

const options = { 
  id: 'MyWorker',
  fetch: fetch // hooks.server.jsでオーバーライドしたfetchを割り当て
};

if (INNGEST_EVENT_KEY) {
  options.eventKey = INNGEST_EVENT_KEY;
}

export const inngest = new Inngest(options);
