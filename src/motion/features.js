// Split point for Motion's feature bundle.
//
// `domMax` is needed for drag (sheet dismissal) and layout animations (list
// reordering), but it is the largest feature set. Importing it from its own
// module lets LazyMotion fetch it as a separate chunk after first paint, so it
// never sits in the critical path of a PWA that has to open fast.
import { domMax } from 'motion/react';

export default domMax;
