const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const corsHandler = cors({ origin: true });

exports.scrapeWebtoon = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "Missing 'url' query parameter" });
      }

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

      return res.json({
        title,
        genre,
        coverImage,
        totalEpisodes,
      });
    } catch (error) {
      console.error("Scraping error:", error.message);
      return res.status(500).json({ error: "Failed to scrape the URL: " + error.message });
    }
  });
});
