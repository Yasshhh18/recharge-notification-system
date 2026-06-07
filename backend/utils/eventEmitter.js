import { EventEmitter } from 'events';

// Create a single shared instance of EventEmitter for the application
const eventEmitter = new EventEmitter();

// Handle general errors in event emitter to prevent crash
eventEmitter.on('error', (err) => {
  console.error('EventEmitter error occurred:', err);
});

export default eventEmitter;
