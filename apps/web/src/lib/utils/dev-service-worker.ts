interface ServiceWorkerRegistrationLike {
  unregister(): Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations(): Promise<readonly ServiceWorkerRegistrationLike[]>;
}

/**
 * A production worker can keep controlling localhost after switching back to
 * Vite. Remove those stale registrations before an in-app development
 * navigation so they cannot reject dynamic SPA routes.
 */
export async function unregisterDevelopmentServiceWorkers(
  isDevelopment: boolean,
  serviceWorker: ServiceWorkerContainerLike | undefined = typeof navigator !==
  "undefined"
    ? navigator.serviceWorker
    : undefined,
): Promise<void> {
  if (!isDevelopment || !serviceWorker?.getRegistrations) return;

  const registrations = await serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );
}
