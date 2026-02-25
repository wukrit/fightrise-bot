/**
 * DQ Entrant mutation for Start.gg
 *
 * Start.gg doesn't have a dedicated DQ mutation, so we use reportBracketSet
 * with the non-DQ'd player as winner to achieve the same result.
 */

export const DQ_ENTRANT = `
  mutation DqEntrant($setId: ID!, $winnerId: ID!) {
    reportBracketSet(setId: $setId, winnerId: $winnerId) {
      id
      state
    }
  }
`;
