module.exports = ({ config }) => {
  const googleServicesPlist = process.env.GOOGLE_SERVICES_PLIST;

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(googleServicesPlist
        ? { googleServicesFile: googleServicesPlist }
        : {}),
    },
  };
};