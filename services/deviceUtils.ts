/**
 * Device detection utility to identify mobile devices,
 * even when the user enables "Desktop Site / Computer Mode" in mobile browsers.
 */

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // 1. Direct User Agent string check
  const isUaMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);

  // 2. Modern Chromium User Agent Data API
  const isUaDataMobile = (navigator as any).userAgentData?.mobile === true;

  // 3. Touch Screen Hardware Detection (Smartphone screen touch points)
  const hasTouchPoints = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  const hasTouchEvents = 'ontouchstart' in window;
  const hasCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;

  // 4. Physical Screen Dimensions (Mobile screen resolution bounds)
  const physicalWidth = Math.min(window.screen.width, window.screen.height);
  const isSmallPhysicalScreen = physicalWidth < 900;

  // Case A: Standard mobile user-agent or userAgentData flag
  if (isUaMobile || isUaDataMobile) {
    return true;
  }

  // Case B: Mobile phone in "Desktop Mode" (UA spoofed to Desktop/Linux/Mac, but touch hardware + small physical screen remains)
  if ((hasTouchPoints || hasTouchEvents) && (hasCoarsePointer || isSmallPhysicalScreen) && physicalWidth < 900) {
    return true;
  }

  return false;
};
