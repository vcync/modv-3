import store from "../";
import streamToBlob from "stream-to-blob";
import fs from "fs";
import media from "../../../../media-manager/store/modules/media";

/**
 * Holds processed media
 *
 * @type {Object}
 */
const state = {};

const getters = media.getters;

const actions = {
  ...media.actions,

  async addMedia({ commit }, { project, folder, item }) {
    if (folder === "module") {
      const stream = fs.createReadStream(item.path);
      const blob = await streamToBlob(stream);

      let text;
      let module;

      try {
        text = await blob.text();
      } catch (e) {
        console.error(`Could not load module`, item.name);
        console.error(e);
        return;
      }

      try {
        module = eval(text).default;
      } catch (e) {
        console.error(`Could not load module`, item.name);
        console.error(e);
      }

      try {
        await store.dispatch("modules/registerModule", module);
      } catch (e) {
        console.error(`Could not load module`, item.name);
        console.log(module);
        console.error(e);
        return;
      }
    }

    commit("ADD", { project, folder, item });
  }
};

const mutations = media.mutations;

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
