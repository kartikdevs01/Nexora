export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Save a browser push subscription
    if (url.pathname === "/api/subscribe" && request.method === "POST") {
      try {
        const subscription = await request.json();

        if (
          !subscription ||
          !subscription.endpoint ||
          !subscription.keys ||
          !subscription.keys.p256dh ||
          !subscription.keys.auth
        ) {
          return new Response(
            JSON.stringify({ error: "Invalid push subscription" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" }
            }
          );
        }

        await env.DB.prepare(
          `INSERT OR REPLACE INTO push_subscriptions
           (endpoint, p256dh, auth, created_at)
           VALUES (?, ?, ?, ?)`
        )
          .bind(
            subscription.endpoint,
            subscription.keys.p256dh,
            subscription.keys.auth,
            new Date().toISOString()
          )
          .run();

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { "Content-Type": "application/json" }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Failed to save subscription",
            details: String(error)
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Everything else goes to Nexora's static files
    return env.ASSETS.fetch(request);
  }
};
