// Auto-generated MSW handlers
// Generated: 2026-02-14T13:50:02.696Z

import { graphql, HttpResponse } from 'msw';

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const startgg = graphql.link(STARTGG_API);

export const handlers = [
  startgg.query('GetTournament', () => {
    return HttpResponse.json({
      data: {
            "tournament": {
                  "id": "mock-id-12345",
                  "name": "Weekly Tournament",
                  "events": []
            },
            "event": {
                  "id": "mock-id-67890",
                  "name": "Street Fighter",
                  "sets": [],
                  "entrants": []
            }
      }
    });
  }),
  startgg.query('GetEvent', () => {
    return HttpResponse.json({
      data: {
            "tournament": {
                  "id": "mock-id-12345",
                  "name": "Weekly Tournament",
                  "events": []
            },
            "event": {
                  "id": "mock-id-67890",
                  "name": "Street Fighter",
                  "sets": [],
                  "entrants": []
            }
      }
    });
  }),
];
