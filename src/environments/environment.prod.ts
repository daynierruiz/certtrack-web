export const environment = {
  production: true,
  apiUrl: '/api',
  // SECURITY (M9): this key ships in the client bundle (unavoidable with Angular env),
  // so it MUST be locked down in the Geoapify dashboard: restrict it to the production
  // domain(s) (HTTP referrer allow-list) and set a usage quota so a third party who
  // extracts it cannot exhaust your quota / run up billing. Use a SEPARATE key from dev
  // (dev uses its own key in environment.ts) so they can be rotated independently.
  // Stronger (later): proxy tile/autocomplete requests through the backend so the key
  // never reaches the browser.
  geoapifyApiKey: '7dafe7a0fd69442294c91b46cd468b65',
  agentEnabled: true,
  // Cora is enabled in prod. Requires the backend AI stack on too (AI_ENABLED=true
  // + ANTHROPIC_API_KEY in Elastic Beanstalk), otherwise the widget shows but
  // /api/cora/chat returns 404 (controller is @ConditionalOnProperty on AI).
  coraEnabled: true
};
