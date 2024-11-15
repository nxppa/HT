// rateLimitedFunctions.js

const rateLimiter = require('./Limiter');
const { PublicKey } = require('@solana/web3.js');

/**
 * Rate-limited version of getParsedTokenAccountsByOwner.
 * @param {Connection} connection - Solana connection instance.
 * @param {PublicKey} owner - Public key of the token account owner.
 * @param {object} filters - Filters for token accounts.
 * @returns {Promise<Map>} - A map of token accounts.
 */
async function rateLimitedGetParsedTokenAccountsByOwner(connection, owner, filters) {
  return rateLimiter.enqueue(() => connection.getParsedTokenAccountsByOwner(owner, filters));
}

module.exports = {
  rateLimitedGetParsedTokenAccountsByOwner,
};
