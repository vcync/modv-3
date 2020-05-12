import store from "../worker/store";

export default async function getPropDefault(
  module,
  propName,
  prop,
  useExistingData
) {
  const { default: defaultValue, random, type } = prop;

  if (
    typeof defaultValue !== "undefined" &&
    Array.isArray(defaultValue) &&
    random
  ) {
    return defaultValue[Math.floor(Math.random() * defaultValue.length)];
  }

  if (store.state.dataTypes[type] && store.state.dataTypes[type].create) {
    if (useExistingData) {
      return await store.state.dataTypes[type].create(
        module.props[propName],
        module.meta.isGallery
      );
    } else {
      return await store.state.dataTypes[type].create(
        prop.default,
        module.meta.isGallery
      );
    }
  }

  if (useExistingData && module.props && module.props[propName]) {
    return module.props[propName];
  }

  if (
    typeof defaultValue === "undefined" &&
    module.data &&
    module.data[propName]
  ) {
    return module.data[propName];
  }

  return defaultValue;
}
