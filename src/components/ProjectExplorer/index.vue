<template>
  <div class="project-explorer">
    <select v-model="currentProject">
      <option disabled selected>Select a project</option>
      <option
        v-for="(project, projectTitle) in projects"
        :key="projectTitle"
        :value="projectTitle"
        >{{ projectTitle }}</option
      >
    </select>

    <h1>{{ currentProject }}</h1>

    <div v-if="project">
      <h2>presets</h2>
      <grid columns="4">
        <c v-for="(preset, presetTitle) in project.preset" :key="presetTitle">
          {{ presetTitle }}
          <button @click="loadPreset(presetTitle)">Load</button>
        </c>
      </grid>
    </div>

    <div v-if="project">
      <h2>images</h2>
      <grid columns="4">
        <c v-for="(image, imageTitle) in project.image" :key="imageTitle">
          {{ imageTitle }}
          <FsImage :src="image.path" />
        </c>
      </grid>
    </div>

    <div v-if="project">
      <h2>palettes</h2>
      <grid columns="4">
        <c
          v-for="(palette, paletteTitle) in project.palette"
          :key="paletteTitle"
        >
          {{ paletteTitle }}
        </c>
      </grid>
    </div>
  </div>
</template>

<script>
import FsImage from "../FsImage";

export default {
  components: {
    FsImage
  },

  data() {
    return {
      currentProject: "default"
    };
  },

  computed: {
    projects() {
      return this.$modV.store.state.media;
    },

    project() {
      return this.projects[this.currentProject];
    }
  },

  methods: {
    loadPreset(preset) {
      this.$modV.loadPreset(
        this.$modV.store.state.media[this.currentProject].preset[preset].path
      );
    }
  }
};
</script>

<style>
.project-explorer {
  padding: 1em;
}
</style>
