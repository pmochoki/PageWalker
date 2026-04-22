const { withRequestContext, applyRateLimit, sendError } = require("./_utils");

module.exports = async (req, res) => {
  const ctx = withRequestContext(req, res, "mood-recommendations");
  if (!applyRateLimit(res, ctx, { windowMs: 60000, max: 20 })) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mood = String(req.body?.mood || "").trim();
  if (!mood) {
    return res.status(400).json({ error: "Mood is required" });
  }
  if (mood.length > 160) {
    return res.status(400).json({ error: "Mood is too long" });
  }

  const openAiKey = process.env.OPENAI_API_KEY || "";
  const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY || "";

  if (!openAiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
  }

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Pagewalker's book guide. Return ONLY valid JSON array, no markdown.",
          },
          {
            role: "user",
            content:
              `Reader feels: "${mood}". Recommend 5 books. ` +
              'Return JSON: [{"title":"","author":"","reason":"","genre":""}]',
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!aiRes.ok) {
      const details = await aiRes.text();
      return res.status(502).json({ error: "OpenAI failed", details });
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content || "[]";
    const parsed = JSON.parse(content);
    const baseRecommendations = Array.isArray(parsed) ? parsed : [];

    const withCovers = await Promise.all(
      baseRecommendations.map(async (rec) => {
        const title = String(rec?.title || "").trim();
        const author = String(rec?.author || "").trim();
        if (!googleBooksApiKey || !title) {
          return { ...rec, coverUrl: null };
        }
        try {
          const query = encodeURIComponent(`${title} ${author}`.trim());
          const bookRes = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&langRestrict=en&key=${googleBooksApiKey}`,
          );
          const bookData = await bookRes.json();
          const item = bookData?.items?.[0];
          let cover =
            item?.volumeInfo?.imageLinks?.thumbnail ||
            item?.volumeInfo?.imageLinks?.smallThumbnail ||
            null;
          if (cover) {
            cover = String(cover)
              .replace("http://", "https://")
              .replace("zoom=1", "zoom=3");
          }
          return { ...rec, coverUrl: cover };
        } catch (_) {
          return { ...rec, coverUrl: null };
        }
      }),
    );

    return res.status(200).json({ recommendations: withCovers });
  } catch (error) {
    return sendError(res, ctx, 500, "Failed to get recommendations", error);
  }
};
