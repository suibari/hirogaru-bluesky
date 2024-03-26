import { getData } from '$lib/server/router.js';

export const actions = {
  generate: async ({request}) => {
    try {
      const data = await request.formData();
      const handle = data.get('handle');
      console.log(`[INFO] receive query from client. handle: ${data.get('handle')}.`);
      const elements = await getData(handle, 36);
      console.log("[INFO] send data to client. total elements: "+elements.length);
  
      return { success: true, elements: elements };
    } catch (e) {
      console.error("[ERROR] An error occured: ", e);
    }
  }
}
