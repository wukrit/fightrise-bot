// Button handler exports and registration
export { buttonHandlers, registerButtonHandler } from './buttonHandlers.js';
export type { ButtonHandler } from './buttonHandlers.js';
export { CUID_REGEX, isValidCuid } from './validation.js';

// Import and register all button handlers
import { registerButtonHandler } from './buttonHandlers.js';
import { checkinHandler } from './checkin.js';
import { scoreHandler, confirmHandler, disputeHandler } from './scoreHandler.js';
import { registrationHandler } from './registration.js';

// Register handlers
registerButtonHandler(checkinHandler);
registerButtonHandler(scoreHandler);
registerButtonHandler(confirmHandler);
registerButtonHandler(disputeHandler);
registerButtonHandler(registrationHandler);
