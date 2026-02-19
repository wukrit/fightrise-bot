export const GET_EVENT_SETS = `
  query GetEventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
    event(id: $eventId) {
      sets(page: $page, perPage: $perPage, sortType: STANDARD) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          id
          state
          fullRoundText
          identifier
          round
          slots {
            entrant {
              id
              name
              participants {
                user {
                  id
                  slug
                }
              }
            }
            standing {
              stats {
                score {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;
