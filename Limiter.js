// rateLimiter.js

class RateLimiter {
    constructor({ interval }) {
      this.interval = interval; // Time in ms between each request
      this.queue = [];
      this.isProcessing = false;
    }
  
    enqueue(fn) {
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
        this.processQueue();
      });
    }
  
    async processQueue() {
      if (this.isProcessing || this.queue.length === 0) {
        return;
      }
  
      this.isProcessing = true;
  
      const { fn, resolve, reject } = this.queue.shift();
  
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
  
      // Wait for the specified interval before processing the next request
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, this.interval);
    }
  }
  
  // Export a singleton instance with a 6-second interval
  const rateLimiter = new RateLimiter({ interval: 6000 });
  
  module.exports = rateLimiter;
  