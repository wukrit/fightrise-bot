import { GraphQLClient } from 'graphql-request';

const STARTGG_API_URL = 'https://api.start.gg/gql/alpha';

export interface StartGGClientConfig {
  apiKey: string;
}

export class StartGGClient {
  private client: GraphQLClient;

  constructor(config: StartGGClientConfig) {
    this.client = new GraphQLClient(STARTGG_API_URL, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
  }

  async getTournament(slug: string) {
    const query = `
      query GetTournament($slug: String!) {
        tournament(slug: $slug) {
          id
          name
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

    return this.client.request(query, { slug });
  }

  async getEventSets(eventId: string, page = 1, perPage = 50) {
    const query = `
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

    return this.client.request(query, { eventId, page, perPage });
  }

  async reportSet(setId: string, winnerId: string) {
    const mutation = `
      mutation ReportSet($setId: ID!, $winnerId: ID!) {
        reportBracketSet(setId: $setId, winnerId: $winnerId) {
          id
          state
        }
      }
    `;

    return this.client.request(mutation, { setId, winnerId });
  }

  async getEventEntrants(eventId: string, page = 1, perPage = 50) {
    const query = `
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
                  gamerTag
                }
              }
            }
          }
        }
      }
    `;

    return this.client.request(query, { eventId, page, perPage });
  }
}

export default StartGGClient;
