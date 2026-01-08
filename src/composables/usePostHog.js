import posthog from 'posthog-js'

export function usePostHog() {
  posthog.init('phc_UTHQbaE0TwZRAZha5ZzZlJmil1mqW2OcesSwlqIP0sn', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2025-11-30',
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
  })

  return { posthog }
}