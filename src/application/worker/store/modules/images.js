import streamToBlob from "stream-to-blob";
import fs from "fs";

import Vue from "vue";

const state = {};

const getters = {
  image: state => id => state[id]
};

const actions = {
  async createImageFromPath({ commit }, { path }) {
    const stream = fs.createReadStream(path);
    const blob = await streamToBlob(stream);
    const imageBitmap = await createImageBitmap(blob);

    if (state[path]) {
      return { id: path };
    }

    commit("SAVE_IMAGE", { id: path, imageBitmap });
    return { id: path };
  }
};

const mutations = {
  SAVE_IMAGE(state, { id, imageBitmap }) {
    Vue.set(state, id, imageBitmap);
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
