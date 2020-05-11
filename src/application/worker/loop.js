/* eslint-env worker */
import get from "lodash.get";
import store from "./store";
import map from "../utils/map";
import { applyWindow } from "meyda/src/utilities";

const meyda = { windowing: applyWindow };

let bufferCanvas;
let bufferContext;

function loop(delta, features) {
  if (!bufferCanvas) {
    bufferCanvas = new OffscreenCanvas(300, 300);
    bufferContext = bufferCanvas.getContext("2d");
    store.dispatch("outputs/addAuxillaryOutput", {
      name: "loop-buffer",
      context: bufferContext,
      group: "buffer"
    });

    return;
  }

  const {
    modules: { active, registered },
    groups: { groups },
    inputs: { inputs, inputLinks },
    outputs: { main, debug, debugContext, auxillary, webcam: video },
    renderers,
    windows
  } = store.state;

  if (!main) {
    return;
  }

  // Update Input Links
  const inputLinkKeys = Object.keys(inputLinks);
  const inputLinkKeysLength = inputLinkKeys.length;
  for (let i = 0; i < inputLinkKeysLength; ++i) {
    const inputId = inputLinkKeys[i];
    const bind = inputs[inputId];
    const link = inputLinks[inputId];

    const { type, location, data } = bind;

    const {
      type: linkType,
      location: linkLocation,
      args: linkArguments,
      min,
      max
    } = link;
    let value;

    if (linkType === "getter" && linkArguments) {
      value = store.getters[linkLocation](...linkArguments);
    } else if (linkType === "state") {
      value = get(store.state, linkLocation);
    }

    // Coersion with != to also check for undefined
    if (min != null || max != null) {
      value = map(value, 0, 1, min, max);
    }

    if (type === "action") {
      store.dispatch(location, { ...data, data: value });
    } else if (type === "commit") {
      store.commit(location, { ...data, data: value });
    }
  }

  const preProcessFrameFunctions =
    store.getters["plugins/preProcessFrame"] || [];
  const preProcessFrameFunctionsLength = preProcessFrameFunctions.length;

  for (let i = 0; i < preProcessFrameFunctionsLength; ++i) {
    preProcessFrameFunctions[i].preProcessFrame({ features, store });
  }

  const renderersWithTick = store.getters["renderers/renderersWithTick"];
  const renderersWithTickLength = renderersWithTick.length;
  for (let i = 0; i < renderersWithTickLength; ++i) {
    renderersWithTick[i].tick();
  }

  let lastCanvas = main.canvas;

  const groupsLength = groups.length;
  for (let i = 0; i < groupsLength; ++i) {
    const group = groups[i];
    const groupModulesLength = group.modules.length;
    if (!group.enabled || group.alpha < 0.001) {
      continue;
    }

    const { clearing, inherit, pipeline } = group;

    const aux = group.drawToCanvasId && auxillary[group.drawToCanvasId].context;
    const groupContext = group.context.context;
    let drawTo = groupContext;

    if (aux) {
      drawTo = aux;
    }

    if (clearing) {
      groupContext.clearRect(
        0,
        0,
        groupContext.canvas.width,
        groupContext.canvas.height
      );
    }

    if (pipeline && clearing) {
      bufferContext.clearRect(
        0,
        0,
        bufferContext.canvas.width,
        bufferContext.canvas.height
      );
    }

    if (inherit) {
      groupContext.drawImage(
        lastCanvas,
        0,
        0,
        drawTo.canvas.width,
        drawTo.canvas.height
      );

      if (pipeline) {
        bufferContext.drawImage(
          lastCanvas,
          0,
          0,
          drawTo.canvas.width,
          drawTo.canvas.height
        );
      }
    }

    let firstModuleDrawn = false;
    for (let j = 0; j < groupModulesLength; ++j) {
      let canvas = groupContext.canvas;

      const module = active[group.modules[j]];

      if (!module.meta.enabled || module.meta.alpha < 0.001) {
        continue;
      }

      if (pipeline && firstModuleDrawn) {
        canvas = bufferContext.canvas;
      } else if (pipeline) {
        canvas = groupContext.canvas;
        firstModuleDrawn = true;
      }

      drawTo.save();
      drawTo.globalAlpha = module.meta.alpha || 1;
      drawTo.globalCompositeOperation =
        module.meta.compositeOperation || "normal";

      const { props, data } = module;
      const moduleDefinition = registered[module.$moduleName];
      let moduleData = data;

      if (moduleDefinition.update) {
        moduleData = moduleDefinition.update({
          props,
          data: { ...data },
          // canvas: drawTo.canvas,
          canvas,
          delta
        });

        store.commit("modules/UPDATE_ACTIVE_MODULE", {
          id: module.$id,
          key: "data",
          value: moduleData
        });
      }

      if (pipeline) {
        groupContext.clearRect(0, 0, canvas.width, canvas.height);
        groupContext.drawImage(bufferCanvas, 0, 0, canvas.width, canvas.height);
      }

      renderers[module.meta.type].render({
        canvas,
        context: groupContext,
        delta,
        module: moduleDefinition,
        features,
        meyda,
        video,
        props,
        data: moduleData,
        pipeline
      });
      drawTo.restore();

      if (pipeline) {
        bufferContext.clearRect(0, 0, canvas.width, canvas.height);
        bufferContext.drawImage(
          groupContext.canvas,
          0,
          0,
          canvas.width,
          canvas.height
        );

        groupContext.clearRect(0, 0, canvas.width, canvas.height);
        groupContext.drawImage(
          bufferCanvas,
          0,
          0,
          bufferCanvas.width,
          bufferCanvas.height
        );
      }
    }

    if (!group.hidden) {
      lastCanvas = groupContext.canvas;
    }
  }

  const windowKeys = Object.keys(windows);
  const windowsLength = windowKeys.length;

  main.clearRect(0, 0, main.canvas.width, main.canvas.height);
  for (let i = 0; i < groupsLength; ++i) {
    const group = groups[i];
    const {
      compositeOperation,
      context: { context },
      alpha,
      enabled,
      modules
    } = group;
    const groupModulesLength = modules.length;
    if (!enabled || groupModulesLength < 1 || !(alpha > 0)) {
      continue;
    }

    main.save();
    if (compositeOperation) {
      main.globalCompositeOperation = compositeOperation;
    }

    if (alpha < 1) {
      main.globalAlpha = alpha;
    }

    main.drawImage(context.canvas, 0, 0);
    main.restore();
  }

  for (let i = 0; i < windowsLength; ++i) {
    const { outputId } = windows[windowKeys[i]];
    const outputContext = store.state.outputs.auxillary[outputId];

    if (outputContext) {
      const { width, height } = outputContext.context.canvas;
      outputContext.context.clearRect(0, 0, width, height);
      outputContext.context.drawImage(main.canvas, 0, 0, width, height);
    }
  }

  if (main.canvas.width !== bufferCanvas.width) {
    bufferCanvas.width = main.canvas.width;
  }

  if (main.canvas.height !== bufferCanvas.height) {
    bufferCanvas.height = main.canvas.height;
  }

  if (debug && debugContext) {
    const { canvas: debugCanvas } = debugContext;
    const canvasToDebug = store.getters["outputs/canvasToDebug"];

    if (canvasToDebug) {
      debugCanvas.width = canvasToDebug.context.canvas.width;
      debugCanvas.height = canvasToDebug.context.canvas.height;

      debugContext.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
      debugContext.drawImage(canvasToDebug.context.canvas, 0, 0);
      debugContext.font = "32px monospace";
      debugContext.textBaseline = "hanging";
      debugContext.save();
      debugContext.fillStyle = "#fff";
      debugContext.globalCompositeOperation = "difference";
      debugContext.fillText(
        `${canvasToDebug.context.canvas.width} × ${canvasToDebug.context.canvas.height}`,
        10,
        10
      );
      debugContext.restore();
    }
  }

  // main.getImageData(0, 0, main.canvas.width, main.canvas.height);
}

export default loop;
