module.exports = ({ config }) => {
  const googleServicesPlist = process.env.GOOGLE_SERVICES_PLIST;
  const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(googleServicesPlist
        ? { googleServicesFile: googleServicesPlist }
        : {}),
    },
    android: {
      ...config.android,
      ...(googleServicesJson
        ? { googleServicesFile: googleServicesJson }
        : {}),
    },
  };
};