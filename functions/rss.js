export async function onRequest() {
  const feedUrl = "https://feeds.bbci.co.uk/news/rss.xml";

  const response = await fetch(feedUrl);
  const xml = await response.text();

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
