export const REPORT_SET = `
  mutation ReportSet($setId: ID!, $winnerId: ID!) {
    reportBracketSet(setId: $setId, winnerId: $winnerId) {
      id
      state
    }
  }
`;
