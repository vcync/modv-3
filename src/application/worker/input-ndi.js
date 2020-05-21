/* eslint-env worker node */

import grandiose from "grandiose";

console.log(grandiose.version());
console.log("Is CPU supported?", grandiose.isSupportedCPU());

const timeout = 5000; // Optional timeout, default is 10000ms

grandiose
  .find({
    // Should sources on the same system be found?
    showLocalSources: true
  })
  .then(async sources => {
    if (!sources.length) {
      return;
    }
    console.log("Found sources", sources.length);

    const source = sources[0];

    console.log("Source", source);

    const receiver = await grandiose.receive({ source: source });

    for (let x = 0; x < 10; x++) {
      try {
        const videoFrame = await receiver.video(timeout);
        console.log(videoFrame);
      } catch (e) {
        console.error(e);
      }
    }
  })
  .catch(console.error);
