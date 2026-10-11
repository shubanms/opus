import '../../styles/ink-components.css';
import useInkMotion from './useInkMotion.js';

/** variant: primary | secondary | secondaryOnPaper. All button props are forwarded. */
export default function InkButton({ variant = 'primary', block = false, className = '', type = 'button', children, ...rest }) {
  const motionOn = useInkMotion();
  const sheen = variant === 'primary' && motionOn;
  const cls = ['ink-btn', `ink-btn--${variant}`, block && 'ink-btn--block', sheen && 'ink-btn--sheen', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {variant === 'primary' ? <span aria-hidden className="ink-btn__sheen" /> : null}
      {children}
    </button>
  );
}
