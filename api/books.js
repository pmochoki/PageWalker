module.exports = async (req, res) => {
  const type = String(req.query?.type || "").trim();
  const googleKey = process.env.GOOGLE_BOOKS_API_KEY || "";

  const normalizeGoogleBook = (item) => {
    const info = item?.volumeInfo || {};
    const images = info?.imageLinks || {};
    const pubDate = String(info?.publishedDate || "");
    let cover = images?.thumbnail || images?.smallThumbnail || null;
    if (cover) {
      cover = String(cover).replace("http://", "https://").replace("zoom=1", "zoom=3");
    }
    return {
      id: `google_${item?.id || ""}`,
      source: "google",
      title: String(info?.title || "Unknown Title"),
      author: Array.isArray(info?.authors) ? info.authors.join(", ") : String(info?.authors || "Unknown Author"),
      coverUrl: cover,
      description: info?.description || "",
      publishedYear: pubDate.length >= 4 ? pubDate.slice(0, 4) : "",
      publisher: info?.publisher || "",
      genres: Array.isArray(info?.categories) ? info.categories : [],
      googleRating: info?.averageRating ?? null,
    };
  };

  const normalizeGutendexBook = (book) => {
    const formats = book?.formats || {};
    const keys = Object.keys(formats);
    let cover = null;
    for (let i = 0; i < keys.length; i += 1) {
      if (keys[i].includes("image")) {
        cover = String(formats[keys[i]] || "").replace("http://", "https://");
        break;
      }
    }
    const authors = Array.isArray(book?.authors) ? book.authors : [];
    let author = "Unknown Author";
    if (authors.length) {
      const raw = String(authors[0]?.name || "");
      const parts = raw.split(", ");
      author = parts.length >= 2 ? `${parts[1]} ${parts[0]}`.trim() : raw;
    }
    return {
      id: `gutenberg_${book?.id || ""}`,
      source: "gutenberg",
      title: String(book?.title || "Untitled"),
      author,
      coverUrl: cover,
      description: String(book?.summaries?.[0] || ""),
      publishedYear: "",
      publisher: "",
      genres: [],
      googleRating: null,
    };
  };

  try {
    if (type === "classics") {
      const classicsRes = await fetch(
        "https://gutendex.com/books?languages=en&copyright=false",
      );
      const classics = await classicsRes.json();
      return res.status(200).json(classics);
    }

    if (type === "detail") {
      const rawId = String(req.query?.id || "").trim();
      if (!rawId) {
        return res.status(400).json({ error: "Missing book id" });
      }
      if (rawId.startsWith("gutenberg_")) {
        const gutId = encodeURIComponent(rawId.replace("gutenberg_", ""));
        const gutRes = await fetch(`https://gutendex.com/books/${gutId}`);
        if (!gutRes.ok) {
          return res.status(gutRes.status).json({ error: "Book not found" });
        }
        const gutData = await gutRes.json();
        return res.status(200).json(normalizeGutendexBook(gutData));
      }
      if (!googleKey) {
        return res.status(500).json({ error: "GOOGLE_BOOKS_API_KEY is missing" });
      }
      const googleId = encodeURIComponent(rawId.replace("google_", ""));
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${googleId}?key=${googleKey}`,
      );
      if (!googleRes.ok) {
        return res.status(googleRes.status).json({ error: "Book not found" });
      }
      const googleData = await googleRes.json();
      return res.status(200).json(normalizeGoogleBook(googleData));
    }

    if (!googleKey) {
      return res.status(500).json({ error: "GOOGLE_BOOKS_API_KEY is missing" });
    }

    let url = "";
    if (type === "trending") {
      url =
        `https://www.googleapis.com/books/v1/volumes` +
        `?q=subject:fiction&orderBy=relevance&maxResults=30&langRestrict=en&key=${googleKey}`;
    } else if (type === "genre") {
      const genre = encodeURIComponent(String(req.query?.genre || "romance"));
      url =
        `https://www.googleapis.com/books/v1/volumes` +
        `?q=subject:${genre}&orderBy=relevance&maxResults=30&langRestrict=en&key=${googleKey}`;
    } else if (type === "search") {
      const q = encodeURIComponent(String(req.query?.q || ""));
      url =
        `https://www.googleapis.com/books/v1/volumes` +
        `?q=${q}&maxResults=40&langRestrict=en&key=${googleKey}`;
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
