export const GET_TOURNAMENTS_BY_OWNER = `
  query GetTournamentsByOwner($page: Int!, $perPage: Int!) {
    currentUser {
      tournaments(query: { page: $page, perPage: $perPage }) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          id
          name
          slug
          startAt
          endAt
          state
          events {
            id
            name
            numEntrants
            state
          }
        }
      }
    }
  }
`;
