const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const admin = require("firebase-admin");
admin.initializeApp();
const db = getFirestore();

const corsHandler = cors({ origin: true });

// Helper function to scrape webtoon data
async function scrapeWebtoonData(url) {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("h1.subj").text().trim() ||
    $("h1").first().text().trim() ||
    "Unknown Title";

  const coverImage =
    $('meta[property="og:image"]').attr("content") ||
    $(".detail_body .thmb img").attr("src") ||
    $(".detail_header .thmb img").attr("src") ||
    "";

  const genre =
    $(".info .genre").text().trim() ||
    $('meta[property="og:description"]').attr("content") ||
    $(".genre").text().trim() ||
    "Unknown";

  let totalEpisodes = 0;
  const epNumberEl = $("ul#_listUl li .tx, ul._episodeList li .tx, .episode_lst .col .tx").first().text();
  const epMatch = epNumberEl.match(/#?(\d+)/);
  if (epMatch) {
    totalEpisodes = parseInt(epMatch[1], 10);
  }

  if (totalEpisodes === 0) {
    const epCountEl = $(".detail_lst .total_episode, .paginate .page_txt").text();
    const countMatch = epCountEl.match(/(\d+)/);
    if (countMatch) {
      totalEpisodes = parseInt(countMatch[1], 10);
    }
  }

  return {
    title: title || "Unknown Title",
    genre: genre || "Unknown",
    coverImage: coverImage || "",
    totalEpisodes: totalEpisodes || 0,
  };
}

exports.scrapeWebtoon = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "Missing 'url' query parameter" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Check if URL already exists in GlobalWebtoons
      const globalWebtoonsRef = db.collection('GlobalWebtoons');
      const snapshot = await globalWebtoonsRef.where('sourceUrl', '==', url).limit(1).get();

      if (!snapshot.empty) {
        // Return cached data
        const cachedData = snapshot.docs[0].data();
        return res.json({
          ...cachedData,
          cached: true,
          webtoonId: snapshot.docs[0].id
        });
      }

      // Scrape the data
      const scrapedData = await scrapeWebtoonData(url);

      // Add to GlobalWebtoons collection
      const newWebtoonRef = await globalWebtoonsRef.add({
        sourceUrl: url,
        ...scrapedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return res.json({
        ...scrapedData,
        cached: false,
        webtoonId: newWebtoonRef.id
      });
    } catch (error) {
      console.error("Scraping error:", error.message);
      if (error.response) {
        return res.status(error.response.status).json({ 
          error: `HTTP ${error.response.status}: Failed to fetch the URL. The site might be blocking automated requests.` 
        });
      } else if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ error: "Request timeout. The URL took too long to respond." });
      } else {
        return res.status(500).json({ error: "Failed to scrape the URL: " + error.message });
      }
    }
  });
});

exports.refreshWebtoonMetadata = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { webtoonId } = req.query;
      if (!webtoonId) {
        return res.status(400).json({ error: "Missing 'webtoonId' query parameter" });
      }

      // Get the webtoon document
      const webtoonRef = db.collection('GlobalWebtoons').doc(webtoonId);
      const doc = await webtoonRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Webtoon not found" });
      }

      const webtoonData = doc.data();
      const sourceUrl = webtoonData.sourceUrl;

      if (!sourceUrl) {
        return res.status(400).json({ error: "No source URL found for this webtoon" });
      }

      // Re-scrape the data
      const scrapedData = await scrapeWebtoonData(sourceUrl);

      // Update the GlobalWebtoons document
      await webtoonRef.update({
        ...scrapedData,
        updatedAt: new Date().toISOString()
      });

      return res.json({
        ...scrapedData,
        webtoonId: webtoonId,
        refreshed: true
      });
    } catch (error) {
      console.error("Refresh error:", error.message);
      return res.status(500).json({ error: "Failed to refresh metadata: " + error.message });
    }
  });
});
