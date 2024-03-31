import { getData } from '$lib/server/router.js';
import { addTextToImage } from '$lib/server/imgshaper.js';
import fs from 'fs';

export const actions = {
  generate: async ({request}) => {
    try {
      const data = await request.formData();
      const handle = data.get('handle');
      console.log(`[INFO] receive query from client. handle: ${data.get('handle')}.`);
      const elements = await getData(handle);
      console.log("[INFO] send data to client. total elements: "+elements.length);
  
      return { success: true, elements: elements };
    } catch (e) {
      console.error("[ERROR] An error occured: ", e);
      return { success: false };
    }
  },

  upload: async ({request}) => {
    try {
      const data = await request.formData();
      const blob = data.get('image');
      console.log(`[INFO] receive blob data to client, ${blob.type}, ${blob.size} [Byte]`);
      const arraybuf = await blob.arrayBuffer();
      const buffer = Buffer.from(arraybuf);
      const base64 = await addTextToImage(buffer);
      console.log("[INFO] send uri data to client.");

      return { success: true, uri: base64 };
    } catch (e) {
      console.error("[ERROR] An error occured: ", e);
      return { success: false };
    } 
  }
}
