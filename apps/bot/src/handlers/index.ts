// Button handler exports and registration
export { buttonHandlers, registerButtonHandler } from './buttonHandlers.js';
export type { ButtonHandler } from './buttonHandlers.js';

// Import and register all button handlers
import { registerButtonHandler } from './buttonHandlers.js';
import { checkinHandler } from './checkin.js';

// Register handlers
registerButtonHandler(checkinHandler);
