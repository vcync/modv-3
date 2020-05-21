import grandiose from "grandiose";
import uuidv4 from "uuid/v4";
import store from "../";

const state = {
  receivers: {
    "reciever-uuidv4": {
      reciver: {}, // the reciever instance,
      outputId: "output-uuidv4", // id of an output canvas
      enabled: false // whether we should do anything with the incoming data from this reciever
    }
  },

  sources: [
    {
      name: "GINGER (Intel(R) HD Graphics 520 1)",
      urlAddress: "169.254.82.1:5962"
    },
    { name: "GINGER (Test Pattern)", urlAddress: "169.254.82.1:5961" },
    {
      name: "GINGER (TOSHIBA Web Camera - HD)",
      urlAddress: "169.254.82.1:5963"
    }
  ],

  discoveryOptions: {
    showLocalSources: true,
    groups: [],
    extraIPs: []
  }
};

function checkCpu() {
  if (!grandiose.isSupportedCPU()) {
    throw new Error("Your CPU is not supported for NDI");
  }
}

async function waitForFrame(recieverContext) {
  const { receiver, outputId } = recieverContext;
  const {
    context,
    context: { canvas }
  } = store.state.outputs.auxillary[outputId];

  let dataFrame;

  try {
    dataFrame = await receiver.data();
  } catch (e) {
    console.error(e);

    if (recieverContext.enabled) {
      waitForFrame(recieverContext);
    }
  }

  if (dataFrame.type === "video") {
    const { xres, yres, data: uint8array } = dataFrame;
    const ui8c = new Uint8ClampedArray(
      uint8array.buffer,
      uint8array.byteOffset,
      uint8array.byteLength / Uint8ClampedArray.BYTES_PER_ELEMENT
    );
    const image = new ImageData(ui8c, dataFrame.xres);

    if (canvas.width !== xres || canvas.height !== yres) {
      canvas.width = xres;
      canvas.height = yres;
    }

    context.putImageData(image, 0, 0);
  }

  if (recieverContext.enabled) {
    waitForFrame(recieverContext);
  }
}

const actions = {
  async discoverSources({ commit }) {
    checkCpu();

    const sources = await grandiose.find(state.discoveryOptions);

    commit("SET_SOURCES", sources);
  },

  setDiscoveryOptions({ commit }, options) {
    commit("SET_DISCOVERY_OPTIONS", { ...state.discoveryOptions, ...options });
  },

  async createReciever({ commit }, recieverOptions) {
    const receiver = await grandiose.receive(recieverOptions);

    const outputContext = await store.dispatch("outputs/getAuxillaryOutput", {
      name: recieverOptions.source.name,
      group: "NDI",
      reactToResize: false
    });

    const recieverId = uuidv4();
    const recieverContext = {
      id: recieverId,
      outputId: outputContext.id,
      receiver,
      enabled: false
    };

    commit("ADD_RECIEVER", recieverContext);

    return recieverContext;
  },

  async enableReciever({ commit }, { recieverId }) {
    const recieverContext = state.receivers[recieverId];

    if (!recieverContext) {
      throw new Error(`No reciever found with id ${recieverId}`);
    }

    recieverContext.enabled = true;

    commit("UPDATE_RECIEVER", recieverContext);

    waitForFrame(recieverContext);
  },

  disableReciever({ commit }, { recieverId }) {
    const recieverContext = state.receivers[recieverId];

    if (!recieverContext) {
      throw new Error(`No reciever found with id ${recieverId}`);
    }

    recieverContext.enabled = false;

    commit("UPDATE_RECIEVER", recieverContext);
  },

  async removeReciever({ commit }, { recieverId }) {
    const recieverContext = state.receivers[recieverId];

    if (!recieverContext) {
      throw new Error(`No reciever found with id ${recieverId}`);
    }

    await store.dispatch(
      "outputs/removeAuxillaryOutput",
      recieverContext.outputId
    );

    commit("DELETE_RECIEVER", { recieverId });
  }
};

const mutations = {
  SET_SOURCES(state, sources) {
    state.sources = sources;
  },

  SET_DISCOVERY_OPTIONS(state, options) {
    state.discoveryOptions = options;
  },

  ADD_RECIEVER(state, recieverContext) {
    state.receivers[recieverContext.id] = recieverContext;
  },

  UPDATE_RECIEVER(state, recieverContext) {
    state.receivers[recieverContext.id] = recieverContext;
  },

  DELETE_RECIEVER(state, recieverContext) {
    delete state.receivers[recieverContext.id];
  }
};

export default {
  namespaced: true,
  state,
  actions,
  mutations
};
