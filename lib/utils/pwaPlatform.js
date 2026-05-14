export const detectPwaPlatform = (ua) => {
  const value = String(ua || '');
  const isIos = /iphone|ipad|ipod/i.test(value);
  const isAndroid = /android/i.test(value);
  return {
    isIos,
    isAndroid,
    isMobile: isIos || isAndroid,
  };
};
