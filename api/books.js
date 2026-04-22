module.exports = async (req, res) => {
  const type = String(req.query?.type || "").trim();
  const googleKey = process.env.GOOGLE_BOOKS_API_KEY || "";

  try {
    if (type === "classics") {
      const classicsRes = await fetch(
        "https://gutendex.com/books?languages=en&copyright=false",
      );
      const classics = await classicsRes.json();
      return res.status(200).json(classics);
    }

    if (!googleKey) {
      return res.status(500).json({ error: "GOOGLE_BOOKS_API_KEY is missing" });
    }

    let url = "";
    if (type === "trending") {
      url =
        `https://www.googleapis.com/books/v1/volumes` +
        `?q=subject:fiction&orderBy=relevance&maxResults=12&langRestrict=en&key=${googleKey}`;
    } else if (type === "genre") {
      const genre = encodeURIComponent(String(req.query?.genre || "romance"));
      url =
        `https://www.googleapis.com/books/v1/volumes` +
        `?q=subject:${genre}&orderBy=relevance&maxResults=12&langRestrict=en&key=${googleKey}`;
    } else if (type === "search") {
      const q = encodeURIComponent(String(req.query?.q || ""));
      url =
        `https://www.googleapis.com/books/v1/volumes` +
        `?q=${q}&maxResults=20&langRestrict=en&key=${googleKey}`;
    } else {
      return res.status(400).json({ error: "Invalid books type" });
    }

    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "books_proxy_failed",
      details: String(error?.message || error),
    });
  }
};
