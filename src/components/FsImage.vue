<template>
  <canvas ref="canvas"></canvas>
</template>

<script>
export default {
  props: {
    alt: {
      type: String
    },

    src: {
      type: String
    }
  },

  data() {
    return {
      context: null,
      imageId: null
    };
  },

  async mounted() {
    const { id } = await this.$modV._store.dispatch(
      "images/createImageFromPath",
      {
        path: this.src
      }
    );

    this.imageId = id;

    this.context = this.$refs.canvas.getContext("2d");

    const { canvas } = this.context;

    canvas.style.width = `${canvas.width}px`;

    canvas.width = canvas.width * window.devicePixelRatio;
    canvas.height = canvas.height * window.devicePixelRatio;

    requestAnimationFrame(this.draw);
  },

  methods: {
    draw() {
      const imageBitmap = this.$modV._store.getters["images/image"](
        this.imageId
      );

      const { width, height } = this.context.canvas;

      var hRatio = width / imageBitmap.width;
      var vRatio = height / imageBitmap.height;
      var ratio = Math.min(hRatio, vRatio);

      const x = imageBitmap.width * ratio;
      const y = imageBitmap.height * ratio;

      this.context.drawImage(
        imageBitmap,
        0,
        0,
        imageBitmap.width,
        imageBitmap.height,
        width / 2 - x / 2,
        height / 2 - y / 2,
        x,
        y
      );
    }
  }
};
</script>

<style>
canvas {
  max-width: 100%;
}
</style>
