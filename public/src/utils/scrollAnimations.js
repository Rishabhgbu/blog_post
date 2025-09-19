// No-op shims kept for backward compatibility. Animations have been disabled.
export const initScrollAnimations = () => ({ disconnect: () => {} });
export const initParallaxEffect = () => () => {};
export const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
export const addRippleEffect = () => {};
