export const GET_EVENT_ENTRANTS = `
  query GetEventEntrants($eventId: ID!, $page: Int!, $perPage: Int!) {
    event(id: $eventId) {
      entrants(query: { page: $page, perPage: $perPage }) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          id
          name
          participants {
            user {
              id
              slug
              name
            }
          }
        }
      }
    }
  }
`;
