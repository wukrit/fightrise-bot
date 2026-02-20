export const GET_TOURNAMENT = `
  query GetTournament($slug: String!) {
    tournament(slug: $slug) {
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
`;
